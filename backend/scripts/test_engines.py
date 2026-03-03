"""Test Ollama emotion + crisis engines."""
import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env.docker"))

from app.services.engines.emotion.ollama import OllamaEmotionEngine
from app.services.engines.crisis.ollama import OllamaCrisisEngine


async def main():
    print("\n=== EMOTION ENGINE TEST ===")
    emo = OllamaEmotionEngine()
    print(f"Available: {emo.is_available}\n")

    emotion_tests = [
        ("I'm feeling really sad and lonely today", "sadness"),
        ("I got the job! So excited!", "joy"),
        ("I'm terrified about the exam tomorrow", "fear"),
    ]

    for text, expected in emotion_tests:
        try:
            r = await emo.analyze(text)
            match = "PASS" if r["label"] == expected else "WARN"
            print(f"[{match}] '{text}'")
            print(f"       expected={expected}, got={r['label']}")
        except Exception as e:
            print(f"[FAIL] '{text}' -> {e}")

    print("\n=== CRISIS ENGINE TEST ===")
    crisis = OllamaCrisisEngine()
    print(f"Available: {crisis.is_available}\n")

    crisis_tests = [
        ("I'm having a great day!", None, False),
        ("I want to hurt myself", "danger", True),
        ("I'm going to kill myself tonight", "emergency", True),
    ]

    for text, expected_sev, expected_esc in crisis_tests:
        try:
            r = await crisis.assess(message=text)
            sev = r.get("severity")
            esc = r.get("requires_escalation")
            match = "PASS" if sev == expected_sev and esc == expected_esc else "WARN"
            print(f"[{match}] '{text}'")
            print(f"       expected=severity:{expected_sev}/esc:{expected_esc}, got=severity:{sev}/esc:{esc}")
        except Exception as e:
            print(f"[FAIL] '{text}' -> {e}")

    print("\n=== DONE ===\n")


if __name__ == "__main__":
    asyncio.run(main())
