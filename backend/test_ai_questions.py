#!/usr/bin/env python3
"""
Test script for AI Questions Service prompts.
Run this to validate LLM responses before integrating.
"""

import asyncio
import json
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.ai_questions_service import AIQuestionsService


async def test_question_generation():
    """Test question generation prompt."""
    print("=" * 80)
    print("TESTING QUESTION GENERATION")
    print("=" * 80)

    service = AIQuestionsService()

    # Test case 1: Fitness goal
    goal_title = "Get fit and build muscle"
    goal_description = "I want to lose 15 pounds, build lean muscle, and have more energy throughout the day"
    theme = "balanced"

    print(f"\nGoal: {goal_title}")
    print(f"Description: {goal_description}")
    print(f"Theme: {theme}\n")

    try:
        questions = await service.generate_questions(goal_title, goal_description, theme)

        print("✅ Question generation succeeded!\n")
        print(f"Generated {len(questions)} categories:")

        for category in questions:
            print(f"\n📦 {category['name']} ({category['id']})")
            print(f"   Description: {category['description']}")
            print(f"   Questions: {len(category['questions'])}")

            for q in category['questions']:
                print(f"\n   ❓ {q['question']}")
                print(f"      Type: {q['type']}")

                if q['type'] in ['radio', 'checkbox']:
                    print(f"      Options: {len(q['options'])}")
                    for opt in q['options']:
                        star = "⭐" if opt.get('recommended') else "  "
                        print(f"        {star} {opt['label']}")
                        if opt.get('recommended'):
                            print(f"           Reason: {opt.get('reason', 'N/A')}")

                elif q['type'] == 'slider':
                    print(f"      Range: {q['min']}-{q['max']} {q['unit']}")
                    print(f"      Recommended: {q['recommended']} {q['unit']}")
                    print(f"      Reason: {q.get('reason', 'N/A')}")

                elif q['type'] == 'time':
                    print(f"      Default: {q['defaultValue']}")
                    print(f"      Recommended: {q['recommended']}")
                    print(f"      Reason: {q.get('reason', 'N/A')}")

        # Save to file for inspection
        with open('test_questions_output.json', 'w') as f:
            json.dump(questions, f, indent=2)
        print("\n💾 Full output saved to: test_questions_output.json")

        return True

    except Exception as e:
        print(f"❌ Question generation failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_schedule_generation():
    """Test schedule and phase generation prompt."""
    print("\n\n" + "=" * 80)
    print("TESTING SCHEDULE & PHASE GENERATION")
    print("=" * 80)

    service = AIQuestionsService()

    # Test case: User answers
    goal_title = "Get fit and build muscle"
    goal_description = "I want to lose 15 pounds, build lean muscle, and have more energy"
    theme = "balanced"
    duration_days = 180
    answers = {
        "physical": {
            "wake_time": "06:30",
            "exercise_frequency": "5",
            "meal_prep": ["sunday_batch"]
        },
        "mental": {
            "focus_time": "morning",
            "deep_work_duration": 90,
            "distractions": ["social_media", "notifications"]
        },
        "lifestyle": {
            "work_schedule": "flexible",
            "available_resources": ["quiet_space", "home_equipment"],
            "sleep_target": "22:30"
        },
        "preferences": {
            "intensity": 6,
            "tracking_style": "moderate",
            "gamification": ["streaks"]
        }
    }

    print(f"\nGoal: {goal_title}")
    print(f"Theme: {theme}")
    print(f"Duration: {duration_days} days\n")
    print("User Answers:")
    print(json.dumps(answers, indent=2))

    try:
        result = await service.generate_schedule_and_phases(
            goal_title=goal_title,
            goal_description=goal_description,
            theme=theme,
            duration_days=duration_days,
            answers=answers
        )

        print("\n✅ Schedule generation succeeded!\n")

        # Validate structure
        schedule = result.get('daily_schedule', [])
        phases = result.get('phases', [])

        print(f"📅 DAILY SCHEDULE: {len(schedule)} activities")
        print("Sample activities:")
        for item in schedule[:5]:
            print(f"  {item['time']} - {item['activity']}")
            print(f"             {item['description']}")
            print(f"             Tags: {', '.join(item['tags'])}\n")

        if len(schedule) > 5:
            print(f"  ... and {len(schedule) - 5} more activities\n")

        print(f"\n🎯 PHASES: {len(phases)} phases")
        for phase in phases:
            print(f"\n  Phase {phase['phase_number']}: {phase['title']}")
            print(f"  Unlock: {phase['unlock_streak_required']} day streak")
            print(f"  Description: {phase['description']}")
            print(f"  Domains: {len(phase.get('domains', []))}")

            for domain in phase.get('domains', [])[:2]:
                print(f"\n    📦 {domain['name']}")
                for task in domain.get('tasks', [])[:2]:
                    print(f"      ✓ {task['title']}")
                    for subtask in task.get('subtasks', [])[:3]:
                        print(f"        - {subtask}")

        # Save to file
        with open('test_schedule_output.json', 'w') as f:
            json.dump(result, f, indent=2)
        print("\n💾 Full output saved to: test_schedule_output.json")

        # Validation checks
        print("\n🔍 VALIDATION CHECKS:")
        checks = [
            (len(schedule) >= 10, f"Schedule has {len(schedule)} activities (need 10+)"),
            (len(phases) == 3, f"Has {len(phases)} phases (need exactly 3)"),
            (all('time' in s for s in schedule), "All schedule items have time"),
            (all('activity' in s for s in schedule), "All schedule items have activity"),
            (all('domains' in p for p in phases), "All phases have domains"),
            (phases[0]['unlock_streak_required'] == 0, "Phase 0 unlocks at day 0"),
            (phases[1]['unlock_streak_required'] == 14, "Phase 1 unlocks at day 14"),
            (phases[2]['unlock_streak_required'] == 42, "Phase 2 unlocks at day 42"),
        ]

        all_passed = True
        for passed, message in checks:
            status = "✅" if passed else "❌"
            print(f"  {status} {message}")
            if not passed:
                all_passed = False

        return all_passed

    except Exception as e:
        print(f"❌ Schedule generation failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    """Run all tests."""
    print("\n🚀 Starting AI Questions Service Tests\n")

    # Test 1: Question generation
    test1_passed = await test_question_generation()

    # Test 2: Schedule generation
    test2_passed = await test_schedule_generation()

    # Summary
    print("\n\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    print(f"Question Generation: {'✅ PASS' if test1_passed else '❌ FAIL'}")
    print(f"Schedule Generation: {'✅ PASS' if test2_passed else '❌ FAIL'}")

    if test1_passed and test2_passed:
        print("\n🎉 All tests passed! Ready for integration.")
        return 0
    else:
        print("\n⚠️  Some tests failed. Review outputs and refine prompts.")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
