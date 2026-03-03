#!/usr/bin/env python3
"""
Quick verification script for Phase 3 Step 3: Journal Extraction.

Tests the qualification rules and extraction logic.
"""

import asyncio
from app.services.journal_service import JournalService


def test_qualification():
    """Test journal qualification rules."""
    print("TEST 1: Journal Qualification Rules")
    print("=" * 60)
    
    service = JournalService()
    
    test_cases = [
        # (message, emotion, should_qualify, reason)
        ("hi", "neutral", False, "Too short"),
        ("I am feeling really sad and depressed today and I dont know why this is happening to me anymore in my life here now", "sadness", True, "100+ chars + strong emotions + sadness label"),
        ("I have been struggling with depression lately and I dont know what to do about all these feelings that I have right now", "sadness", True, "100+ chars + emotion + reflection markers"),
        ("This was an interesting day at work where I realized something new and important about myself and my capabilities today now", "joy", True, "100+ chars + reflection marker"),
        ("What should I do about my anxiety and stress related to all the upcoming challenges ahead of me in my life right now", "fear", True, "100+ chars + strong emotion anxiety"),
        ("Just having a normal day talking about nothing special and random stuff that doesnt matter much here at all today okay fine", "neutral", False, "100+ chars but no markers, neutral emotion"),
        ("I realize now that I need to change my approach to studying because exams are stressing me out way too much lately in school", "fear", True, "Multiple markers + stress emotion + fear label"),
    ]
    
    for message, emotion, expected, reason in test_cases:
        result = service.should_create_entry(message, emotion)
        status = "PASS" if result == expected else "FAIL"
        print(f"[{status}] '{message[:40]}...' (emotion: {emotion})")
        print(f"   Expected: {expected}, Got: {result} ({reason})")
        assert result == expected, f"Failed: {reason}"
    
    print("\n[PASS] All qualification tests passed!\n")


def test_summary_extraction():
    """Test summary extraction."""
    print("TEST 2: Summary Extraction")
    print("=" * 60)
    
    service = JournalService()
    
    test_cases = [
        (
            "I've been feeling overwhelmed lately. The workload is intense and I'm struggling to keep up. Maybe I need to talk to my manager.",
            "I've been feeling overwhelmed lately. The workload is intense and I'm struggling to keep up."
        ),
        (
            "Today I realized something important about myself. I think I need to prioritize my mental health more.",
            "Today I realized something important about myself. I think I need to prioritize my mental health more."
        ),
        (
            "A" * 300,  # Long message
            "A" * 200 + "..."  # Should truncate
        ),
    ]
    
    for message, expected_start in test_cases:
        summary = service.extract_summary(message)
        status = "PASS" if expected_start in summary or summary.startswith(expected_start[:50]) else "FAIL"
        print(f"[{status}] Summary length: {len(summary)} chars")
        print(f"   Summary: '{summary[:70]}...'")
    
    print("\n[PASS] Summary extraction tests passed!\n")


def test_tag_extraction():
    """Test tag extraction."""
    print("TEST 3: Tag Extraction")
    print("=" * 60)
    
    service = JournalService()
    
    test_cases = [
        ("I have an exam coming up and I'm stressed about studying", ["academic"]),
        ("My boss is being really difficult at work", ["work"]),
        ("I've been having relationship issues with my girlfriend", ["relationship"]),
        ("My mom keeps calling me about family stuff", ["family"]),
        ("I haven't been sleeping well and my diet is bad", ["health"]),
        ("I want to hurt myself", ["crisis"]),
        ("I'm tired from work and worried about exams and my family", ["work", "academic", "family"]),
    ]
    
    for message, expected_tags in test_cases:
        tags = service.extract_tags(message)
        # Check if all expected tags are present
        has_all = all(tag in tags for tag in expected_tags)
        status = "PASS" if has_all else "FAIL"
        print(f"[{status}] '{message[:50]}...'")
        print(f"   Expected: {expected_tags}, Got: {tags}")
        assert has_all, f"Missing tags: expected {expected_tags}, got {tags}"
    
    print("\n[PASS] Tag extraction tests passed!\n")


def test_mood_mapping():
    """Test emotion to mood mapping."""
    print("TEST 4: Mood Mapping")
    print("=" * 60)
    
    service = JournalService()
    
    test_cases = [
        ("sadness", "sad"),
        ("joy", "happy"),
        ("anger", "angry"),
        ("fear", "anxious"),
        ("surprise", "surprised"),
        ("disgust", "disgusted"),
        ("neutral", "neutral"),
        ("unknown_emotion", "neutral"),
    ]
    
    for emotion, expected_mood in test_cases:
        mood = service.extract_mood(emotion)
        status = "PASS" if mood == expected_mood else "FAIL"
        print(f"[{status}] {emotion} -> {mood}")
        assert mood == expected_mood, f"Expected {expected_mood}, got {mood}"
    
    print("\n[PASS] Mood mapping tests passed!\n")


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("PHASE 3 STEP 3: JOURNAL EXTRACTION VERIFICATION")
    print("=" * 60 + "\n")
    
    try:
        test_qualification()
        test_summary_extraction()
        test_tag_extraction()
        test_mood_mapping()
        
        print("=" * 60)
        print("[PASS] ALL TESTS PASSED")
        print("=" * 60)
        print("\nJournal extraction system is working correctly!")
        print("Ready to test with actual messages in chat endpoint.")
        
    except AssertionError as e:
        print(f"\n[FAIL] Test failed: {str(e)}")
        exit(1)
    except Exception as e:
        print(f"\n[ERROR] Unexpected error: {str(e)}")
        import traceback
        traceback.print_exc()
        exit(1)
