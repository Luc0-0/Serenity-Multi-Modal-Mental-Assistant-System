#!/usr/bin/env python
"""Debug Ollama Cloud API call directly"""

import asyncio
import os
from dotenv import load_dotenv
from app.services.ollama_service import OllamaService
from app.schemas.emotion_insight import EmotionInsight
from datetime import datetime

load_dotenv()

async def test_with_insight():
    """Test OllamaService with emotional insight"""
    
    print()
    print("=" * 60)
    print("DEBUG: OllamaService with Emotional Insight")
    print("=" * 60)
    print()
    
    # Create a test insight
    insight = EmotionInsight(
        user_id=1,
        period_days=7,
        log_count=1,
        insufficient_data=False,
        dominant_emotion="sadness",
        dominance_pct=0.75,
        avg_confidence=0.80,
        emotion_distribution={"sadness": 0.75, "anxiety": 0.25},
        trend="stable",
        trend_description="Consistent sadness",
        volatility_flag=False,
        sustained_sadness=True,
        high_risk=False,
        crisis_count_48h=0,
        suggested_tone="gentle",
        suggested_approach="grounding",
        avoid_triggers=["toxic positivity"],
        computed_at=datetime.now()
    )
    
    svc = OllamaService()
    
    print("Service Config:")
    print(f"  Endpoint: {svc.endpoint}")
    print(f"  Model: {svc.model}")
    print(f"  API Key: {bool(svc.api_key)}")
    print()
    
    print("Test Input:")
    print(f"  Message: I am feeling really sad today")
    print(f"  History: 0 messages")
    print(f"  Insight: Present (sadness 75%)")
    print(f"  Crisis: False")
    print()
    
    print("Calling OllamaService.get_response()...")
    print()
    
    try:
        response = await svc.get_response(
            user_message="I am feeling really sad today",
            conversation_history=[],
            emotional_insight=insight,
            crisis_detected=False
        )
        
        print("Response:")
        print("-" * 60)
        print(response)
        print("-" * 60)
        print()
        print(f"Response length: {len(response)} characters")
        print()
        
        # Check if it's the fallback
        if "trouble connecting" in response:
            print("[WARN] Got FALLBACK response (API call failed)")
            print("Possible causes:")
            print("  1. Ollama API timeout")
            print("  2. API key expired")
            print("  3. Network connectivity issue")
            print("  4. Model overloaded")
        else:
            print("[OK] Got REAL response from LLM")
            
    except Exception as e:
        print(f"[ERROR] Exception: {type(e).__name__}: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_with_insight())
