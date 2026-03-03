#!/usr/bin/env python3
"""Test AI-based journal extraction"""

import asyncio
import httpx
import json

async def test_ai_extraction():
    """Test the AI extraction via chat endpoint"""
    
    # Create a test user and conversation
    async with httpx.AsyncClient(base_url="http://localhost:8000") as client:
        # Sign up
        signup_resp = await client.post("/api/auth/signup/", json={
            "email": "test_ai_journal@example.com",
            "username": "test_ai_journal",
            "password": "TestPass123!"
        })
        print(f"Signup: {signup_resp.status_code}")
        if signup_resp.status_code not in [200, 201, 409]:
            print(f"Error: {signup_resp.text}")
            return
        
        user_data = signup_resp.json()
        user_id = user_data.get("id")
        
        # Login
        login_resp = await client.post("/api/auth/login/", json={
            "email": "test_ai_journal@example.com",
            "password": "TestPass123!"
        })
        print(f"Login: {login_resp.status_code}")
        token = login_resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Send a chat message with emotional content
        chat_resp = await client.post(
            "/api/chat/",
            headers=headers,
            json={
                "message": "I had the worst day today. I failed my presentation at work and felt completely humiliated in front of my team. Everyone was staring at me and I just froze. I went home feeling so sad and disappointed in myself."
            }
        )
        print(f"Chat: {chat_resp.status_code}")
        print(f"Response: {chat_resp.json()}")
        
        # Check journal entries
        entries_resp = await client.get("/api/journal/entries/", headers=headers)
        print(f"\nJournal entries: {entries_resp.status_code}")
        if entries_resp.status_code == 200:
            entries = entries_resp.json()
            print(f"Total entries: {len(entries.get('entries', []))}")
            if entries.get('entries'):
                latest = entries['entries'][0]
                print(f"\nLatest entry:")
                print(f"  Title: {latest.get('title')}")
                print(f"  Emotion: {latest.get('emotion')}")
                print(f"  AI Extracted: {latest.get('ai_extracted')}")
                print(f"  AI Confidence: {latest.get('ai_confidence')}")
                print(f"  AI Extraction Method: {latest.get('extraction_method')}")
                if latest.get('ai_summary'):
                    print(f"  AI Summary: {latest.get('ai_summary')}")

if __name__ == "__main__":
    asyncio.run(test_ai_extraction())
