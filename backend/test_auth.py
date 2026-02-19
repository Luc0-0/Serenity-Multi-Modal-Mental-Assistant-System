"""Test auth endpoints"""
import httpx
import asyncio

BASE_URL = "http://localhost:8000"

async def test_signup():
    """Test signup endpoint"""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BASE_URL}/api/auth/signup/",
            json={
                "name": "Test User",
                "email": "test@example.com",
                "password": "testpassword123"
            }
        )
        print(f"Signup status: {response.status_code}")
        print(f"Signup response: {response.text}")
        return response.json() if response.status_code == 201 else None

async def test_login():
    """Test login endpoint"""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BASE_URL}/api/auth/login/",
            json={
                "email": "test@example.com",
                "password": "testpassword123"
            }
        )
        print(f"Login status: {response.status_code}")
        print(f"Login response: {response.text}")
        return response.json() if response.status_code == 200 else None

async def test_profile(token):
    """Test profile endpoint"""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{BASE_URL}/api/auth/profile/",
            headers={"Authorization": f"Bearer {token}"}
        )
        print(f"Profile status: {response.status_code}")
        print(f"Profile response: {response.text}")

async def main():
    print("Testing Auth Endpoints\n")
    
    # Test signup
    print("1. Testing Signup...")
    signup_data = await test_signup()
    
    if signup_data and "access_token" in signup_data:
        token = signup_data["access_token"]
        print(f"\n✓ Signup successful. Token: {token[:20]}...\n")
        
        # Test profile
        print("2. Testing Profile...")
        await test_profile(token)
    else:
        print("\n✗ Signup failed. Trying login instead...\n")
        
        # Try login
        print("2. Testing Login...")
        login_data = await test_login()
        if login_data and "access_token" in login_data:
            token = login_data["access_token"]
            print(f"\n✓ Login successful. Token: {token[:20]}...\n")
            
            # Test profile
            print("3. Testing Profile...")
            await test_profile(token)

if __name__ == "__main__":
    asyncio.run(main())
