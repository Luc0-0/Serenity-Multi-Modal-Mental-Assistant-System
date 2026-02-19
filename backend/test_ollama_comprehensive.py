#!/usr/bin/env python3
"""
COMPREHENSIVE OLLAMA SERVICE VALIDATION TEST

This test validates:
1. OllamaService initialization with correct config
2. System prompt building (all emotional states)
3. Message history formatting
4. API call with crisis detection override
5. Conversation title generation
6. Fallback responses when API fails
7. Response cleaning (remove markdown, etc)
"""

import asyncio
import sys
from app.services.ollama_service import OllamaService
from app.schemas.emotion_insight import EmotionInsight
from app.core.config import settings

# Color codes for terminal output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def test_result(name, passed, details=""):
    """Print test result with colors"""
    status = f"{GREEN}✓ PASS{RESET}" if passed else f"{RED}✗ FAIL{RESET}"
    print(f"  {status} - {name}")
    if details and not passed:
        print(f"    {YELLOW}Details: {details}{RESET}")

async def main():
    print(f"\n{BLUE}=== SERENITY OLLAMA SERVICE VALIDATION ==={RESET}\n")
    
    # Test 1: Service Initialization
    print(f"{YELLOW}[1] SERVICE INITIALIZATION{RESET}")
    try:
        service = OllamaService()
        has_endpoint = bool(service.endpoint)
        has_api_key = bool(service.api_key)
        has_model = bool(service.model)
        
        test_result("Endpoint configured", has_endpoint, f"Endpoint: {service.endpoint}")
        test_result("API Key configured", has_api_key, f"Key ends with: ...{service.api_key[-5:] if service.api_key else 'NONE'}")
        test_result("Model configured", has_model, f"Model: {service.model}")
        test_result("Timeout configured", service.timeout == 30.0, f"Timeout: {service.timeout}s")
        
        if not (has_endpoint and has_api_key and has_model):
            print(f"\n{RED}[CRITICAL] Missing required Ollama configuration{RESET}")
            return False
    except Exception as e:
        test_result("Service initialization", False, str(e))
        return False
    
    # Test 2: System Prompt Building
    print(f"\n{YELLOW}[2] SYSTEM PROMPT BUILDING{RESET}")
    
    # Test 2a: Base prompt (no emotional insight)
    try:
        prompt = service._build_system_prompt(None)
        has_base_content = "Serenity" in prompt and "mental health" in prompt
        test_result("Base prompt generated", has_base_content, f"Prompt length: {len(prompt)}")
    except Exception as e:
        test_result("Base prompt generation", False, str(e))
    
    # Test 2b: Prompt with sadness insight
    try:
        from datetime import datetime
        sad_insight = EmotionInsight(
            user_id=1,
            period_days=7,
            log_count=5,
            insufficient_data=False,
            dominant_emotion="sadness",
            dominance_pct=0.7,
            avg_confidence=0.65,
            emotion_distribution={"sadness": 0.7, "anxiety": 0.2, "neutral": 0.1},
            trend="stable",
            trend_description="Your sadness has been consistent",
            volatility_flag=False,
            sustained_sadness=True,
            high_risk=False,
            crisis_count_48h=0,
            suggested_tone="compassionate",
            suggested_approach="gentle_reflection",
            avoid_triggers=["pressure", "expectations"],
            computed_at=datetime.now()
        )
        prompt = service._build_system_prompt(sad_insight)
        has_sad_guidance = "low place" in prompt.lower() or "gentle" in prompt.lower()
        test_result("Sadness prompt adaptation", has_sad_guidance, f"Prompt length: {len(prompt)}")
    except Exception as e:
        test_result("Sadness prompt generation", False, str(e))
    
    # Test 2c: Prompt with anxiety insight
    try:
        from datetime import datetime
        anxiety_insight = EmotionInsight(
            user_id=1,
            period_days=7,
            log_count=8,
            insufficient_data=False,
            dominant_emotion="anxiety",
            dominance_pct=0.65,
            avg_confidence=0.72,
            emotion_distribution={"anxiety": 0.65, "stress": 0.25, "neutral": 0.1},
            trend="fluctuating",
            trend_description="Your anxiety has been inconsistent",
            volatility_flag=True,
            sustained_sadness=False,
            high_risk=False,
            crisis_count_48h=0,
            suggested_tone="reassuring",
            suggested_approach="grounding_techniques",
            avoid_triggers=["uncertainty", "crowds"],
            computed_at=datetime.now()
        )
        prompt = service._build_system_prompt(anxiety_insight)
        has_anxiety_guidance = "anxious" in prompt.lower() or "grounded" in prompt.lower()
        test_result("Anxiety prompt adaptation", has_anxiety_guidance, f"Prompt length: {len(prompt)}")
    except Exception as e:
        test_result("Anxiety prompt generation", False, str(e))
    
    # Test 3: Message History Building
    print(f"\n{YELLOW}[3] MESSAGE HISTORY BUILDING{RESET}")
    
    conversation_history = [
        {"role": "user", "content": "I've been feeling stressed lately"},
        {"role": "assistant", "content": "That sounds tough. What's been weighing on you?"},
        {"role": "user", "content": "Work has been overwhelming"}
    ]
    current_message = "How can I manage this better?"
    
    try:
        messages = service._build_message_history(conversation_history, current_message)
        has_history = len(messages) > 1
        last_is_user = messages[-1]["role"] == "user"
        last_content_correct = messages[-1]["content"] == current_message
        
        test_result("Message history formatted", has_history, f"Total messages: {len(messages)}")
        test_result("Last message is user", last_is_user, f"Last role: {messages[-1]['role']}")
        test_result("Current message included", last_content_correct, f"Content: {messages[-1]['content'][:50]}...")
    except Exception as e:
        test_result("Message history building", False, str(e))
    
    # Test 4: Response Cleaning
    print(f"\n{YELLOW}[4] RESPONSE CLEANING{RESET}")
    
    responses_to_test = [
        ("# Heading\nNormal text", "Preserves headings for structure", lambda c: "#" in c and "Heading" in c),
        ("**bold** text", "Preserves bold for emphasis", lambda c: "**bold**" in c),
        ("```python\ncode block\n```", "Removes code fences but keeps content", lambda c: "code block" in c and "```" not in c),
        ("`inline code`", "Removes inline code markers but keeps content", lambda c: "inline code" in c and "`" not in c),
        ("Normal response", "Keeps plain text unchanged", lambda c: "Normal response" == c),
        ("*italic* text", "Preserves italics for nuance", lambda c: "*italic*" in c),
        ("- List item 1\n- List item 2", "Preserves lists for readability", lambda c: "- List" in c),
    ]
    
    for response_text, description, check_func in responses_to_test:
        try:
            cleaned = service._clean_response(response_text)
            is_valid = check_func(cleaned)
            test_result(f"Cleaning: {description}", is_valid, f"Result: {cleaned[:60]}...")
        except Exception as e:
            test_result(f"Cleaning: {description}", False, str(e))
    
    # Test 5: Fallback Responses
    print(f"\n{YELLOW}[5] FALLBACK RESPONSES{RESET}")
    
    try:
        crisis_response = service._get_crisis_response()
        has_crisis = len(crisis_response) > 20 and "crisis" in crisis_response.lower() or "help" in crisis_response.lower()
        test_result("Crisis fallback response", has_crisis, f"Length: {len(crisis_response)} chars")
    except Exception as e:
        test_result("Crisis response", False, str(e))
    
    try:
        fallback = service._get_fallback_response("I'm struggling with this")
        has_fallback = len(fallback) > 20 and ("here" in fallback.lower() or "moment" in fallback.lower())
        test_result("Generic fallback response", has_fallback, f"Length: {len(fallback)} chars")
    except Exception as e:
        test_result("Fallback response", False, str(e))
    
    # Test 6: Title Generation
    print(f"\n{YELLOW}[6] TITLE GENERATION{RESET}")
    
    test_messages = [
        "I've been feeling really anxious about my upcoming presentation",
        "Just had an amazing day at the beach with friends",
        "Everything feels overwhelming right now",
    ]
    
    for msg in test_messages:
        try:
            title = await service.generate_conversation_title(msg)
            is_title = 3 <= len(title) <= 50 and not msg.lower() == title.lower()
            test_result(f"Title generation: '{msg[:40]}...'", is_title, f"Title: {title}")
        except Exception as e:
            test_result(f"Title for: '{msg[:40]}...'", False, str(e))
    
    # Test 7: Full Response Flow (with crisis override)
    print(f"\n{YELLOW}[7] RESPONSE FLOW WITH CRISIS DETECTION{RESET}")
    
    try:
        # Should return crisis response immediately
        response = await service.get_response(
            user_message="I'm planning to hurt myself",
            conversation_history=[],
            emotional_insight=None,
            crisis_detected=True  # Override - should skip LLM call
        )
        is_crisis = len(response) > 20 and ("help" in response.lower() or "crisis" in response.lower() or "988" in response)
        test_result("Crisis override returns safety response", is_crisis, f"Response length: {len(response)}")
    except Exception as e:
        test_result("Crisis detection override", False, str(e))
    
    # Test 8: Configuration Validation
    print(f"\n{YELLOW}[8] CONFIGURATION VALIDATION{RESET}")
    
    config_checks = [
        (settings.ollama_endpoint.startswith("http"), "Endpoint is valid URL"),
        (len(settings.ollama_api_key or "") > 10, "API Key has sufficient length"),
        (settings.ollama_model, "Model name configured"),
        (settings.ollama_max_tokens > 0, "Max tokens is positive"),
    ]
    
    for check, description in config_checks:
        test_result(f"Config: {description}", check, f"Value: {getattr(settings, description.split(':')[0].lower().replace(' ', '_'), 'N/A')}")
    
    # Summary
    print(f"\n{BLUE}=== TEST SUMMARY ==={RESET}")
    print(f"{GREEN}✓ All function validations completed{RESET}")
    print(f"\n{BLUE}NEXT STEPS:{RESET}")
    print(f"1. Test live chat message with: curl -X POST http://localhost:8000/api/chat/")
    print(f"2. Monitor logs: docker-compose logs backend | grep -i 'ollama'")
    print(f"3. Check emotion insights endpoint: /api/emotions/insights/?days=7")
    print(f"4. Verify conversation title generation in sidebar")
    print()
    
    return True

if __name__ == "__main__":
    try:
        success = asyncio.run(main())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print(f"\n{YELLOW}Test interrupted by user{RESET}")
        sys.exit(1)
    except Exception as e:
        print(f"\n{RED}Unexpected error: {str(e)}{RESET}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
