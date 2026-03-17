import sys
import os
import asyncio

# Add backend dir to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend')))

from app.utils.emotion_constants import normalize_emotion
from app.services.engines.emotion.keywords import KeywordEmotionEngine
from app.services.engines.emotion.ollama import OllamaEmotionEngine

def test_normalization():
    assert normalize_emotion("happy") == "joy"
    assert normalize_emotion("anxiety") == "fear"
    assert normalize_emotion("sad") == "sadness"
    assert normalize_emotion("unknownn") == "neutral"
    assert normalize_emotion("  FeAr  ") == "fear"
    assert normalize_emotion("AnXious") == "fear"
    print("✓ Normalization passed")

async def test_keywords():
    engine = KeywordEmotionEngine()
    
    # "understand" was removed, shouldn't trigger sadness
    res1 = await engine.analyze("I understand the problem")
    assert res1['label'] == "neutral", res1['label']
    
    # word boundary check: "barely" triggers fear, but "barelyx" shouldn't
    res2 = await engine.analyze("I am barelyx surviving")
    assert res2['label'] == "neutral", res2['label']
    
    res3 = await engine.analyze("I am barely surviving")
    assert res3['label'] == "fear", res3['label']
    
    # scoring check: multiple keywords should win over single generic one
    res4 = await engine.analyze("I am extremely happy but also anxious, terrified, and overwhelmed.")
    assert res4['label'] == "fear", res4['label']
    
    print("✓ Keyword engine logic passed")

def test_ollama_parser():
    engine = OllamaEmotionEngine()
    # Should strip punctuation and pick the single word returned by the hardened prompt
    assert engine._parse_emotion("Joy.") == "joy"
    assert engine._parse_emotion("  Fμβρίου ") == "neutral"
    assert engine._parse_emotion("anxious") == "fear" # uses normalization
    print("✓ Ollama parser passed")

if __name__ == "__main__":
    test_normalization()
    test_ollama_parser()
    asyncio.run(test_keywords())
    print("\nALL VERIFICATION TESTS PASSED.")
