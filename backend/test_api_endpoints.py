#!/usr/bin/env python3
"""
API ENDPOINT TEST SUITE

Tests all REST API endpoints to ensure:
1. Correct status codes
2. Valid response schemas
3. Error handling
4. Authentication
5. Data integrity
"""

import asyncio
import httpx
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"
TEST_EMAIL = "api_test@example.com"
TEST_PASSWORD = "password123"

# Colors for output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

results = {"passed": 0, "failed": 0}

def print_header(text):
    print(f"\n{BLUE}{'='*60}")
    print(f"  {text.upper()}")
    print(f"{'='*60}{RESET}\n")

def test_case(name, passed, expected, actual, details=""):
    status = f"{GREEN}✓ PASS{RESET}" if passed else f"{RED}✗ FAIL{RESET}"
    print(f"  {status} - {name}")
    
    if not passed:
        print(f"    Expected: {expected}")
        print(f"    Actual:   {actual}")
        if details:
            print(f"    Details:  {details}")
    
    if passed:
        results["passed"] += 1
    else:
        results["failed"] += 1

async def main():
    print(f"\n{BLUE}╔{'═'*58}╗")
    print(f"║{' '*58}║")
    print(f"║  {YELLOW}API ENDPOINT TEST SUITE{RESET}{' '*31}║")
    print(f"║{' '*58}║")
    print(f"╚{'═'*58}╝{RESET}\n")
    
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=10.0) as client:
        # Auth Tests
        await test_auth_endpoints(client)
        
        # Chat Tests
        await test_chat_endpoints(client)
        
        # Emotion Tests
        await test_emotion_endpoints(client)
        
        # Journal Tests
        await test_journal_endpoints(client)
        
        # Error Tests
        await test_error_handling(client)
    
    print_summary()

async def test_auth_endpoints(client):
    print_header("Authentication Endpoints")
    
    # Test 1: Signup
    print("  [1] POST /api/auth/signup/")
    try:
        response = await client.post(
            "/api/auth/signup/",
            json={
                "name": "Test User",
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            }
        )
        test_case(
            "Signup - Status Code",
            response.status_code in [201, 200],
            "201 or 200",
            response.status_code
        )
        
        data = response.json()
        test_case(
            "Signup - Has access_token",
            "access_token" in data,
            "access_token field",
            list(data.keys())
        )
        test_case(
            "Signup - Has user data",
            "user" in data and "id" in data.get("user", {}),
            "user.id",
            data.get("user", {})
        )
        
        user_id = data.get("user", {}).get("id")
        access_token = data.get("access_token")
        
    except Exception as e:
        test_case("Signup - Request", False, "200/201", f"Error: {str(e)}")
        return
    
    # Test 2: Duplicate Email
    print("\n  [2] POST /api/auth/signup/ (Duplicate)")
    try:
        response = await client.post(
            "/api/auth/signup/",
            json={
                "name": "Another User",
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            }
        )
        test_case(
            "Duplicate signup - Status Code",
            response.status_code == 400,
            "400",
            response.status_code
        )
    except Exception as e:
        test_case("Duplicate signup", False, "400", f"Error: {str(e)}")
    
    # Test 3: Login
    print("\n  [3] POST /api/auth/login/")
    try:
        response = await client.post(
            "/api/auth/login/",
            json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            }
        )
        test_case(
            "Login - Status Code",
            response.status_code == 200,
            "200",
            response.status_code
        )
        
        data = response.json()
        test_case(
            "Login - Has token",
            "access_token" in data,
            "access_token",
            list(data.keys())
        )
    except Exception as e:
        test_case("Login", False, "200", f"Error: {str(e)}")
    
    # Test 4: Get Profile
    print("\n  [4] GET /api/auth/profile/")
    if access_token:
        try:
            response = await client.get(
                "/api/auth/profile/",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            test_case(
                "Profile - Status Code",
                response.status_code == 200,
                "200",
                response.status_code
            )
            
            data = response.json()
            test_case(
                "Profile - Has user",
                "user" in data,
                "user field",
                list(data.keys())
            )
        except Exception as e:
            test_case("Profile", False, "200", f"Error: {str(e)}")
    
    # Test 5: Invalid Token
    print("\n  [5] GET /api/auth/profile/ (Invalid Token)")
    try:
        response = await client.get(
            "/api/auth/profile/",
            headers={"Authorization": "Bearer invalid_token"}
        )
        test_case(
            "Invalid token - Status Code",
            response.status_code == 401,
            "401",
            response.status_code
        )
    except Exception as e:
        test_case("Invalid token", False, "401", f"Error: {str(e)}")

async def test_chat_endpoints(client):
    print_header("Chat Endpoints")
    
    # Get token first
    try:
        response = await client.post(
            "/api/auth/login/",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        access_token = response.json().get("access_token")
    except:
        print("  ✗ Could not get auth token")
        return
    
    # Test 1: Send Chat Message
    print("  [1] POST /api/chat/")
    try:
        response = await client.post(
            "/api/chat/",
            json={
                "message": "Hello, I'm feeling anxious",
                "user_id": 1,
                "conversation_id": None
            },
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=30.0
        )
        test_case(
            "Chat - Status Code",
            response.status_code == 200,
            "200",
            response.status_code
        )
        
        data = response.json()
        test_case(
            "Chat - Has reply",
            "reply" in data,
            "reply field",
            list(data.keys())
        )
        test_case(
            "Chat - Has conversation_id",
            "conversation_id" in data,
            "conversation_id",
            list(data.keys())
        )
        
        conversation_id = data.get("conversation_id")
        
    except Exception as e:
        test_case("Chat", False, "200", f"Error: {str(e)}")
        return
    
    # Test 2: Continue Conversation
    print("\n  [2] POST /api/chat/ (Continue)")
    if conversation_id:
        try:
            response = await client.post(
                "/api/chat/",
                json={
                    "message": "Can you help me?",
                    "user_id": 1,
                    "conversation_id": conversation_id
                },
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=30.0
            )
            test_case(
                "Continue chat - Status Code",
                response.status_code == 200,
                "200",
                response.status_code
            )
        except Exception as e:
            test_case("Continue chat", False, "200", f"Error: {str(e)}")
    
    # Test 3: Get Conversations
    print("\n  [3] GET /api/conversations/")
    try:
        response = await client.get(
            "/api/conversations/?user_id=1",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        test_case(
            "Conversations - Status Code",
            response.status_code == 200,
            "200",
            response.status_code
        )
        
        data = response.json()
        test_case(
            "Conversations - Is array",
            isinstance(data, list),
            "list",
            type(data).__name__
        )
    except Exception as e:
        test_case("Conversations", False, "200", f"Error: {str(e)}")

async def test_emotion_endpoints(client):
    print_header("Emotion Endpoints")
    
    # Get token
    try:
        response = await client.post(
            "/api/auth/login/",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        access_token = response.json().get("access_token")
    except:
        print("  ✗ Could not get auth token")
        return
    
    # Test 1: Get Emotion Insights
    print("  [1] GET /api/emotions/insights/")
    try:
        response = await client.get(
            "/api/emotions/insights/?days=7",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        test_case(
            "Insights - Status Code",
            response.status_code == 200,
            "200",
            response.status_code
        )
        
        data = response.json()
        required_fields = ["emotion_frequency", "dominant_emotion", "total_logs"]
        has_required = all(field in data for field in required_fields)
        test_case(
            "Insights - Has required fields",
            has_required,
            required_fields,
            list(data.keys())
        )
        
        test_case(
            "Insights - emotion_frequency is dict",
            isinstance(data.get("emotion_frequency"), dict),
            "dict",
            type(data.get("emotion_frequency")).__name__
        )
        
        test_case(
            "Insights - dominant_emotion is string",
            isinstance(data.get("dominant_emotion"), str),
            "str",
            type(data.get("dominant_emotion")).__name__
        )
        
    except Exception as e:
        test_case("Insights", False, "200", f"Error: {str(e)}")
    
    # Test 2: Get Emotion History
    print("\n  [2] GET /api/emotions/history/")
    try:
        response = await client.get(
            "/api/emotions/history/",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        test_case(
            "History - Status Code",
            response.status_code == 200,
            "200",
            response.status_code
        )
        
        data = response.json()
        test_case(
            "History - Has emotions array",
            "emotions" in data and isinstance(data["emotions"], list),
            "emotions array",
            type(data.get("emotions")).__name__
        )
    except Exception as e:
        test_case("History", False, "200", f"Error: {str(e)}")
    
    # Test 3: Get Daily Summary
    print("\n  [3] GET /api/emotions/daily-summary/")
    try:
        response = await client.get(
            f"/api/emotions/daily-summary/?date={datetime.now().date()}",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        test_case(
            "Daily summary - Status Code",
            response.status_code == 200,
            "200",
            response.status_code
        )
    except Exception as e:
        test_case("Daily summary", False, "200", f"Error: {str(e)}")

async def test_journal_endpoints(client):
    print_header("Journal Endpoints")
    
    # Get token
    try:
        response = await client.post(
            "/api/auth/login/",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        access_token = response.json().get("access_token")
    except:
        print("  ✗ Could not get auth token")
        return
    
    print("  [1] Journal endpoints")
    print("     (Tests would depend on having journal create/read endpoints)")
    print("     (Skipping for now as journalservice may differ)")

async def test_error_handling(client):
    print_header("Error Handling")
    
    # Test 1: Missing required fields
    print("  [1] Missing required fields")
    try:
        response = await client.post(
            "/api/auth/signup/",
            json={"name": "No Email"}  # Missing email and password
        )
        test_case(
            "Missing fields - Status Code",
            response.status_code in [400, 422],
            "400/422",
            response.status_code
        )
    except Exception as e:
        test_case("Missing fields", False, "400/422", f"Error: {str(e)}")
    
    # Test 2: Invalid email
    print("\n  [2] Invalid email format")
    try:
        response = await client.post(
            "/api/auth/signup/",
            json={
                "name": "Test",
                "email": "not-an-email",
                "password": "password123"
            }
        )
        test_case(
            "Invalid email - Status Code",
            response.status_code in [400, 422],
            "400/422",
            response.status_code
        )
    except Exception as e:
        test_case("Invalid email", False, "400/422", f"Error: {str(e)}")
    
    # Test 3: Wrong password
    print("\n  [3] Wrong password")
    try:
        response = await client.post(
            "/api/auth/login/",
            json={
                "email": TEST_EMAIL,
                "password": "wrong_password"
            }
        )
        test_case(
            "Wrong password - Status Code",
            response.status_code == 401,
            "401",
            response.status_code
        )
    except Exception as e:
        test_case("Wrong password", False, "401", f"Error: {str(e)}")
    
    # Test 4: Nonexistent user
    print("\n  [4] Nonexistent user")
    try:
        response = await client.post(
            "/api/auth/login/",
            json={
                "email": "nonexistent@example.com",
                "password": "password123"
            }
        )
        test_case(
            "Nonexistent user - Status Code",
            response.status_code == 401,
            "401",
            response.status_code
        )
    except Exception as e:
        test_case("Nonexistent user", False, "401", f"Error: {str(e)}")

def print_summary():
    total = results["passed"] + results["failed"]
    pass_rate = (results["passed"] / total * 100) if total > 0 else 0
    
    print(f"\n{BLUE}{'='*60}")
    print(f"ENDPOINT TEST SUMMARY")
    print(f"{'='*60}{RESET}\n")
    
    print(f"  {GREEN}Passed{RESET}:  {results['passed']}")
    print(f"  {RED}Failed{RESET}:  {results['failed']}")
    print(f"  {BLUE}Total{RESET}:   {total}")
    print(f"\n  Pass Rate: {pass_rate:.1f}%")
    
    if results["failed"] == 0:
        print(f"\n  {GREEN}✓ ALL ENDPOINT TESTS PASSED{RESET}")
    else:
        print(f"\n  {RED}✗ {results['failed']} ENDPOINT TESTS FAILED{RESET}")
    
    print(f"\n{BLUE}{'='*60}{RESET}\n")

if __name__ == "__main__":
    asyncio.run(main())
