#!/usr/bin/env python
"""Show the exact error from API call"""

import asyncio
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

async def test():
    api_key = os.getenv('OLLAMA_API_KEY')
    endpoint = os.getenv('OLLAMA_ENDPOINT')
    
    print(f"Testing direct HTTPS call:")
    print(f"  Endpoint: {endpoint}")
    print(f"  API Key: {api_key[:10]}...{api_key[-5:]}")
    print()
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "gpt-oss:120b-cloud",
        "messages": [{"role": "user", "content": "Hi"}],
        "max_tokens": 50,
        "temperature": 0.7
    }
    
    try:
        print("Making async request...")
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                endpoint,
                json=payload,
                headers=headers
            )
            
            print(f"Status: {response.status_code}")
            print(f"Headers: {dict(response.headers)}")
            print()
            
            if response.status_code == 200:
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                print(f"[SUCCESS] Got response: {len(content)} chars")
                print(f"Response: {content}")
            else:
                print(f"[ERROR] Status {response.status_code}")
                print(f"Body: {response.text}")
                
    except Exception as e:
        print(f"[EXCEPTION] {type(e).__name__}")
        print(f"Message: {str(e)}")
        import traceback
        traceback.print_exc()

asyncio.run(test())
