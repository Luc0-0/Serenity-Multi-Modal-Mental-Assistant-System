#!/usr/bin/env python
"""Test Ollama Cloud API directly with curl"""

import subprocess
import os
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv('OLLAMA_API_KEY')
endpoint = os.getenv('OLLAMA_ENDPOINT')

print("Testing Ollama Cloud API Directly")
print("=" * 60)
print(f"Endpoint: {endpoint}")
print(f"API Key: {api_key[:10]}...{api_key[-5:]}")
print()

# Build curl command
cmd = [
    "curl",
    "-X", "POST",
    endpoint,
    "-H", f"Authorization: Bearer {api_key}",
    "-H", "Content-Type: application/json",
    "-d", '{"model":"gpt-oss:120b-cloud","messages":[{"role":"user","content":"Hi"}],"max_tokens":50}',
    "-i"  # Include response headers
]

print("Sending request...")
print()

try:
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
    print("RESPONSE:")
    print(result.stdout)
    if result.stderr:
        print("STDERR:")
        print(result.stderr)
except Exception as e:
    print(f"Error: {e}")
