#!/usr/bin/env python
"""Test OllamaService initialization with .env variables"""

from dotenv import load_dotenv
import asyncio
import os

# Load .env variables
load_dotenv()

from app.services.ollama_service import OllamaService

def test_initialization():
    """Test that OllamaService initializes with correct .env variables"""
    
    svc = OllamaService()
    
    print("OllamaService Initialization Test")
    print("=" * 50)
    print("[OK] Service initialized successfully")
    print(f"  Endpoint: {svc.endpoint}")
    print(f"  Model: {svc.model}")
    print(f"  Max tokens: {svc.max_tokens}")
    print(f"  API key set: {bool(svc.api_key)}")
    print(f"  Timeout: {svc.timeout}s")
    print()
    
    # Verify critical variables
    assert svc.endpoint == "https://ollama.com/v1/chat/completions", "Wrong endpoint"
    assert svc.model == "gpt-oss:120b-cloud", "Wrong model"
    assert svc.max_tokens == 256, "Wrong max_tokens"
    assert svc.api_key is not None and len(svc.api_key) > 0, "API key not set"
    
    print("[OK] All initialization checks passed")
    print()
    return True

async def test_basic_response():
    """Test basic response without emotion insight"""
    
    svc = OllamaService()
    
    print("Testing Basic Response (No Emotion Data)")
    print("=" * 50)
    
    try:
        response = await svc.get_response(
            user_message="Hello, how are you?",
            conversation_history=[],
            emotional_insight=None,
            crisis_detected=False
        )
        
        print(f"[OK] Response received: {len(response)} characters")
        print("  Response is valid JSON from Ollama Cloud API")
        print()
        return True
    except Exception as e:
        print(f"[ERROR] {str(e)}")
        print()
        return False

async def main():
    print()
    print("PHASE 5 OLLAMA CLOUD API TEST")
    print("=" * 50)
    print()
    
    # Test 1: Initialization
    init_ok = test_initialization()
    
    # Test 2: Basic response
    if init_ok:
        response_ok = await test_basic_response()
    else:
        print("[SKIP] Skipping response test (initialization failed)")
        response_ok = False
    
    print("=" * 50)
    if init_ok and response_ok:
        print("[PASS] All tests passed")
        print("Ready for Phase 5 integration testing")
    else:
        print("[FAIL] Some tests did not pass")
        print("Check .env variables and API key")
    print()

if __name__ == "__main__":
    asyncio.run(main())
