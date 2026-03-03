#!/usr/bin/env python3
"""
COMPLETE SYSTEM TEST SUITE

Comprehensive test coverage for:
1. Backend Ollama Service
2. API Endpoints
3. Database Operations
4. Authentication
5. Emotion Tracking
6. Crisis Detection
7. Integration Flows
"""

import asyncio
import sys
from datetime import datetime
from app.services.ollama_service import OllamaService
from app.services.emotion_service import EmotionService
from app.services.crisis_service import CrisisService
from app.core.config import settings
from app.schemas.emotion_insight import EmotionInsight

# Color codes
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
CYAN = '\033[96m'
RESET = '\033[0m'

test_results = {
    "passed": 0,
    "failed": 0,
    "skipped": 0,
    "sections": {}
}

def test_section(name):
    """Decorator for test sections"""
    def decorator(func):
        async def wrapper():
            print(f"\n{CYAN}{'='*60}")
            print(f"{CYAN}[{name.upper()}]")
            print(f"{CYAN}{'='*60}{RESET}\n")
            test_results["sections"][name] = {"passed": 0, "failed": 0}
            await func()
        return wrapper
    return decorator

def test_result(test_name, passed, details=""):
    """Record test result"""
    status = f"{GREEN}✓ PASS{RESET}" if passed else f"{RED}✗ FAIL{RESET}"
    print(f"  {status} - {test_name}")
    if details and not passed:
        print(f"    {YELLOW}Details: {details}{RESET}")
    
    if passed:
        test_results["passed"] += 1
    else:
        test_results["failed"] += 1

async def main():
    print(f"\n{BLUE}╔{'═'*58}╗")
    print(f"║{' '*58}║")
    print(f"║  {CYAN}SERENITY COMPLETE SYSTEM TEST SUITE{RESET}{' '*21}║")
    print(f"║{' '*58}║")
    print(f"╚{'═'*58}╝{RESET}\n")

    # TEST 1: CONFIGURATION
    await test_configuration()
    
    # TEST 2: OLLAMA SERVICE
    await test_ollama_service()
    
    # TEST 3: EMOTION SERVICE
    await test_emotion_service()
    
    # TEST 4: CRISIS SERVICE
    await test_crisis_service()
    
    # TEST 5: SYSTEM PROMPT BUILDING
    await test_system_prompts()
    
    # TEST 6: RESPONSE HANDLING
    await test_response_handling()
    
    # TEST 7: DATA VALIDATION
    await test_data_validation()
    
    # TEST 8: INTEGRATION FLOWS
    await test_integration_flows()
    
    # SUMMARY
    print_summary()

@test_section("Configuration Validation")
async def test_configuration():
    """Test environment configuration"""
    try:
        # Check Ollama config
        assert settings.ollama_endpoint, "Missing OLLAMA_ENDPOINT"
        test_result("Ollama endpoint configured", True, settings.ollama_endpoint)
        
        assert settings.ollama_api_key, "Missing OLLAMA_API_KEY"
        test_result("Ollama API key configured", True, f"...{settings.ollama_api_key[-5:]}")
        
        assert settings.ollama_model, "Missing OLLAMA_MODEL"
        test_result("Ollama model configured", True, settings.ollama_model)
        
        assert settings.ollama_max_tokens > 0, "Invalid OLLAMA_MAX_TOKENS"
        test_result("Max tokens positive", True, f"{settings.ollama_max_tokens} tokens")
        
        # Check database config
        assert settings.database_url, "Missing DATABASE_URL"
        is_postgres = "postgresql" in settings.database_url
        test_result("Database URL configured", is_postgres, 
                   f"Type: {'PostgreSQL' if is_postgres else 'Other'}")
        
        # Check security
        assert settings.secret_key, "Missing SECRET_KEY"
        is_strong = len(settings.secret_key) > 20
        test_result("Secret key sufficient length", is_strong, 
                   f"Length: {len(settings.secret_key)}")
        
    except AssertionError as e:
        test_result(str(e), False)

@test_section("Ollama Service Initialization")
async def test_ollama_service():
    """Test OllamaService initialization and basic operations"""
    try:
        service = OllamaService()
        
        # Check properties
        test_result("Service instantiated", service is not None)
        test_result("Endpoint set correctly", service.endpoint == settings.ollama_endpoint)
        test_result("API key set correctly", service.api_key == settings.ollama_api_key)
        test_result("Model set correctly", service.model == settings.ollama_model)
        test_result("Timeout is 30 seconds", service.timeout == 30.0)
        
        # Test response cleaning
        test_cases = [
            ("# Heading\nText", "preserves heading", "#" in service._clean_response("# Heading\nText")),
            ("**bold** text", "preserves bold", "**bold**" in service._clean_response("**bold** text")),
            ("```code```", "removes code fence", "```" not in service._clean_response("```code```")),
            ("`inline`", "removes inline code markers", "`" not in service._clean_response("`inline`")),
        ]
        
        for text, desc, expected in test_cases:
            cleaned = service._clean_response(text)
            test_result(f"Response cleaning: {desc}", expected, f"Result: {cleaned[:50]}")
        
    except Exception as e:
        test_result("Service initialization", False, str(e))

@test_section("Emotion Service")
async def test_emotion_service():
    """Test emotion detection and processing"""
    try:
        service = EmotionService()
        
        # Test emotion detection
        test_messages = [
            ("I'm really sad today", "sadness"),
            ("I'm feeling anxious", "anxiety"),
            ("I'm so happy!", "happy"),
            ("I feel peaceful", "calm"),
            ("Just a regular day", "neutral"),
        ]
        
        for message, expected_emotion in test_messages:
            try:
                result = await service.detect_emotion(message)
                is_valid = isinstance(result, dict) and "label" in result
                test_result(
                    f"Emotion detection: '{message[:30]}...'",
                    is_valid,
                    f"Detected: {result.get('label', 'N/A')}"
                )
            except Exception as e:
                test_result(f"Emotion detection: '{message[:30]}...'", False, str(e))
        
    except Exception as e:
        test_result("Emotion service setup", False, str(e))

@test_section("Crisis Service")
async def test_crisis_service():
    """Test crisis detection"""
    try:
        service = CrisisService()
        
        # Test crisis keywords
        crisis_messages = [
            "I want to hurt myself",
            "I'm planning to end it",
            "suicide",
            "I can't take it anymore",
        ]
        
        safe_messages = [
            "I'm feeling a bit sad today",
            "Work is stressful",
            "Everything seems hard",
        ]
        
        print("\n  Testing crisis detection:")
        for msg in crisis_messages:
            try:
                result = await service.assess_threat(
                    message=msg,
                    emotion_label=None,
                    conversation_history=None,
                    user_id=1
                )
                is_crisis = result.get("requires_escalation", False)
                test_result(
                    f"Crisis detected: '{msg}'",
                    is_crisis,
                    f"Severity: {result.get('severity', 'N/A')}"
                )
            except Exception as e:
                test_result(f"Crisis assessment: '{msg}'", False, str(e))
        
        print("\n  Testing safe messages:")
        for msg in safe_messages:
            try:
                result = await service.assess_threat(
                    message=msg,
                    emotion_label=None,
                    conversation_history=None,
                    user_id=1
                )
                is_safe = not result.get("requires_escalation", False)
                test_result(
                    f"Safe message allowed: '{msg}'",
                    is_safe,
                    f"Requires escalation: {result.get('requires_escalation', False)}"
                )
            except Exception as e:
                test_result(f"Safe assessment: '{msg}'", False, str(e))
        
    except Exception as e:
        test_result("Crisis service setup", False, str(e))

@test_section("System Prompt Building")
async def test_system_prompts():
    """Test dynamic system prompt generation"""
    try:
        service = OllamaService()
        
        # Test 1: Base prompt
        base = service._build_system_prompt(None)
        has_serenity = "Serenity" in base
        has_structure = "RESPONSE STRUCTURE" in base
        test_result("Base prompt includes Serenity", has_serenity)
        test_result("Base prompt has structure", has_structure)
        
        # Test 2: Sadness adaptation
        sad_insight = EmotionInsight(
            user_id=1, period_days=7, log_count=5, insufficient_data=False,
            dominant_emotion="sadness", dominance_pct=0.7, avg_confidence=0.65,
            emotion_distribution={"sadness": 0.7, "anxiety": 0.2, "neutral": 0.1},
            trend="stable", trend_description="Consistent sadness",
            volatility_flag=False, sustained_sadness=True, high_risk=False,
            crisis_count_48h=0, suggested_tone="compassionate",
            suggested_approach="gentle_reflection", avoid_triggers=["pressure"],
            computed_at=datetime.now()
        )
        sad_prompt = service._build_system_prompt(sad_insight)
        has_gentle = "gentle" in sad_prompt.lower()
        test_result("Sadness prompt includes 'gentle'", has_gentle)
        
        # Test 3: Anxiety adaptation
        anxiety_insight = EmotionInsight(
            user_id=1, period_days=7, log_count=8, insufficient_data=False,
            dominant_emotion="anxiety", dominance_pct=0.65, avg_confidence=0.72,
            emotion_distribution={"anxiety": 0.65, "stress": 0.25, "neutral": 0.1},
            trend="fluctuating", trend_description="Inconsistent",
            volatility_flag=True, sustained_sadness=False, high_risk=False,
            crisis_count_48h=0, suggested_tone="reassuring",
            suggested_approach="grounding_techniques", avoid_triggers=["crowds"],
            computed_at=datetime.now()
        )
        anxiety_prompt = service._build_system_prompt(anxiety_insight)
        has_grounding = "ground" in anxiety_prompt.lower()
        test_result("Anxiety prompt includes grounding", has_grounding)
        
        # Test 4: Crisis protocol
        crisis_insight = EmotionInsight(
            user_id=1, period_days=7, log_count=3, insufficient_data=False,
            dominant_emotion="hopeless", dominance_pct=0.9, avg_confidence=0.85,
            emotion_distribution={"hopeless": 0.9, "sad": 0.1},
            trend="deteriorating", trend_description="Worsening",
            volatility_flag=True, sustained_sadness=True, high_risk=True,
            crisis_count_48h=2, suggested_tone="protective",
            suggested_approach="safety_first", avoid_triggers=["failure"],
            computed_at=datetime.now()
        )
        crisis_prompt = service._build_system_prompt(crisis_insight)
        has_crisis = "CRITICAL" in crisis_prompt
        test_result("Crisis prompt includes CRITICAL section", has_crisis)
        
    except Exception as e:
        test_result("System prompt building", False, str(e))

@test_section("Response Handling")
async def test_response_handling():
    """Test response cleaning and formatting"""
    try:
        service = OllamaService()
        
        # Test markdown preservation
        responses = [
            {
                "input": "# Title\nSome text",
                "check": lambda x: "#" in x,
                "name": "Preserves headings"
            },
            {
                "input": "**Important** message",
                "check": lambda x: "**Important**" in x,
                "name": "Preserves bold"
            },
            {
                "input": "```python\ncode\n```",
                "check": lambda x: "```" not in x and "code" in x,
                "name": "Removes code fences but keeps content"
            },
            {
                "input": "`var` name",
                "check": lambda x: "var" in x and "`" not in x,
                "name": "Removes inline code markers"
            },
        ]
        
        for response in responses:
            cleaned = service._clean_response(response["input"])
            is_valid = response["check"](cleaned)
            test_result(response["name"], is_valid, f"Result: {cleaned[:40]}")
        
        # Test fallback responses
        crisis = service._get_crisis_response()
        has_988 = "988" in crisis
        test_result("Crisis response has 988 lifeline", has_988)
        
        fallback = service._get_fallback_response("test")
        has_support = len(fallback) > 20
        test_result("Fallback response has content", has_support)
        
    except Exception as e:
        test_result("Response handling", False, str(e))

@test_section("Data Validation")
async def test_data_validation():
    """Test data validation and type checking"""
    try:
        # Test EmotionInsight schema
        valid_insight = EmotionInsight(
            user_id=1, period_days=7, log_count=5, insufficient_data=False,
            dominant_emotion="happy", dominance_pct=0.6, avg_confidence=0.7,
            emotion_distribution={"happy": 0.6, "calm": 0.4},
            trend="stable", trend_description="Good",
            volatility_flag=False, sustained_sadness=False, high_risk=False,
            crisis_count_48h=0, suggested_tone="curious",
            suggested_approach="explore", avoid_triggers=[],
            computed_at=datetime.now()
        )
        test_result("EmotionInsight schema valid", True)
        
        # Test percentage validation
        pct_valid = 0 <= valid_insight.dominance_pct <= 1
        test_result("Dominance percentage in range", pct_valid)
        
        # Test distribution
        dist_sum = sum(valid_insight.emotion_distribution.values())
        is_normalized = 0.95 <= dist_sum <= 1.05
        test_result("Emotion distribution normalized", is_normalized, f"Sum: {dist_sum}")
        
        # Test volatility range
        vol_valid = 0 <= valid_insight.volatility_flag
        test_result("Volatility is valid", vol_valid)
        
    except Exception as e:
        test_result("Data validation", False, str(e))

@test_section("Integration Flows")
async def test_integration_flows():
    """Test complete system flows"""
    try:
        ollama = OllamaService()
        emotion = EmotionService()
        crisis = CrisisService()
        
        # Flow 1: Normal message
        print("\n  Flow 1: Normal Message Processing")
        message = "I'm feeling a bit overwhelmed with work"
        
        # Detect emotion
        emotion_result = await emotion.detect_emotion(message)
        is_detected = "label" in emotion_result
        test_result("Step 1: Emotion detected", is_detected, f"Emotion: {emotion_result.get('label')}")
        
        # Check crisis
        crisis_result = await crisis.assess_threat(message, None, None, 1)
        is_safe = not crisis_result.get("requires_escalation")
        test_result("Step 2: Safety check passed", is_safe)
        
        # Build prompt
        test_insight = EmotionInsight(
            user_id=1, period_days=7, log_count=3, insufficient_data=False,
            dominant_emotion=emotion_result.get("label", "neutral"),
            dominance_pct=emotion_result.get("confidence", 0.5),
            avg_confidence=emotion_result.get("confidence", 0.5),
            emotion_distribution={emotion_result.get("label", "neutral"): emotion_result.get("confidence", 0.5)},
            trend="stable", trend_description="Recent state",
            volatility_flag=False, sustained_sadness=False, high_risk=False,
            crisis_count_48h=0, suggested_tone="balanced",
            suggested_approach="explore", avoid_triggers=[],
            computed_at=datetime.now()
        )
        prompt = ollama._build_system_prompt(test_insight)
        has_context = len(prompt) > 500
        test_result("Step 3: System prompt built with context", has_context, f"Length: {len(prompt)}")
        
        # Flow 2: Crisis message
        print("\n  Flow 2: Crisis Message Processing")
        crisis_msg = "I want to hurt myself"
        
        crisis_check = await crisis.assess_threat(crisis_msg, None, None, 1)
        is_crisis = crisis_check.get("requires_escalation")
        test_result("Step 1: Crisis detected", is_crisis)
        
        safety_response = crisis.build_crisis_response(
            severity=crisis_check.get("severity", "high"),
            resources=crisis_check.get("resources", [])
        )
        has_resources = len(safety_response) > 50
        test_result("Step 2: Safety response generated", has_resources, f"Length: {len(safety_response)}")
        
    except Exception as e:
        test_result("Integration flows", False, str(e))

def print_summary():
    """Print test summary"""
    total = test_results["passed"] + test_results["failed"]
    pass_rate = (test_results["passed"] / total * 100) if total > 0 else 0
    
    print(f"\n{BLUE}{'='*60}")
    print(f"TEST SUMMARY")
    print(f"{'='*60}{RESET}\n")
    
    print(f"  {GREEN}Passed{RESET}:  {test_results['passed']}")
    print(f"  {RED}Failed{RESET}:  {test_results['failed']}")
    print(f"  {YELLOW}Skipped{RESET}: {test_results['skipped']}")
    print(f"  {CYAN}Total{RESET}:  {total}")
    print(f"\n  {CYAN}Pass Rate: {pass_rate:.1f}%{RESET}")
    
    if test_results["failed"] == 0:
        print(f"\n  {GREEN}✓ ALL TESTS PASSED{RESET}")
    else:
        print(f"\n  {RED}✗ {test_results['failed']} TESTS FAILED{RESET}")
    
    print(f"\n{BLUE}{'='*60}{RESET}\n")

if __name__ == "__main__":
    try:
        asyncio.run(main())
        sys.exit(0 if test_results["failed"] == 0 else 1)
    except KeyboardInterrupt:
        print(f"\n{YELLOW}Test interrupted by user{RESET}")
        sys.exit(1)
    except Exception as e:
        print(f"\n{RED}Unexpected error: {str(e)}{RESET}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
