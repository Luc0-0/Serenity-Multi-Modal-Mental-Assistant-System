#!/usr/bin/env python
"""Test the /api/chat endpoint with emotional context"""

import asyncio
import httpx
import json
from datetime import datetime

async def test_chat_endpoint():
    """Test full chat flow with emotional insight"""
    
    print()
    print("=" * 60)
    print("PHASE 5 CHAT ENDPOINT TEST")
    print("=" * 60)
    print()
    print("Prerequisites:")
    print("- Backend running: uvicorn app.main:app --reload")
    print("- Database has test user (id=1)")
    print("- Ollama Cloud API key valid")
    print()
    
    # Test data
    test_message = "I am feeling really sad today and don't know how to cope"
    user_id = 1
    
    print("Test Request:")
    print(f"  User ID: {user_id}")
    print(f"  Message: {test_message}")
    print()
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                "http://localhost:8000/api/chat/",
                json={
                    "user_id": user_id,
                    "conversation_id": None,
                    "message": test_message
                }
            )
            
            print("Response Status:", response.status_code)
            print()
            
            if response.status_code == 200:
                data = response.json()
                
                print("Response Data:")
                print(f"  Conversation ID: {data.get('conversation_id')}")
                print(f"  Message ID: {data.get('message_id')}")
                print(f"  Crisis Detected: {data.get('crisis_detected', False)}")
                print()
                
                reply = data.get('reply', '')
                print("Assistant Reply:")
                print("-" * 60)
                # Print safe version (remove problematic unicode)
                safe_reply = reply.encode('ascii', errors='replace').decode('ascii')
                print(safe_reply)
                print("-" * 60)
                print()
                print(f"Response length: {len(reply)} characters (contains unicode)")
                print()
                
                # Quality checks
                print("Quality Checks:")
                
                is_empty = len(reply.strip()) == 0
                print(f"  Not empty: {'[OK]' if not is_empty else '[FAIL]'}")
                
                is_long_enough = len(reply) > 50
                print(f"  Adequate length (>50 chars): {'[OK]' if is_long_enough else '[FAIL]'}")
                
                mentions_sadness = 'sad' in reply.lower() or 'sadness' in reply.lower()
                print(f"  Acknowledges emotion: {'[OK]' if mentions_sadness else '[WARN]'}")
                
                is_empathetic = any(word in reply.lower() for word in 
                    ['understand', 'hear', 'acknowledge', 'validate', 'feel', 'listen'])
                print(f"  Shows empathy: {'[OK]' if is_empathetic else '[WARN]'}")
                
                print()
                
                if is_empty:
                    print("[FAIL] Response is empty")
                elif is_long_enough and (mentions_sadness or is_empathetic):
                    print("[PASS] Response quality looks good")
                else:
                    print("[WARN] Response might be generic")
                    
            else:
                print(f"[ERROR] Status {response.status_code}")
                print("Response:", response.text)
                print()
                print("Possible causes:")
                print("- Backend not running (start with: uvicorn app.main:app --reload)")
                print("- Database not accessible")
                print("- User ID 1 doesn't exist")
                
    except httpx.ConnectError:
        print("[ERROR] Could not connect to http://localhost:8000")
        print()
        print("Start backend with:")
        print("  uvicorn app.main:app --reload")
        
    except Exception as e:
        print(f"[ERROR] {type(e).__name__}: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_chat_endpoint())
