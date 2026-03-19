#
# Copyright (c) 2026 Nipun Sujesh. All rights reserved.
# Licensed under the AGPLv3. See LICENSE file in the project root for details.
#

import json
import logging
from typing import List, Dict, Any
from app.services.engines.factory import get_llm_engine

logger = logging.getLogger(__name__)


class AIQuestionsService:
    """AI-powered question generation and schedule creation from answers."""

    def __init__(self):
        self.engine = get_llm_engine()

    async def generate_questions(
        self,
        goal_title: str,
        goal_description: str,
        theme: str = "balanced"
    ) -> List[Dict[str, Any]]:
        """Generate personalized questions for 4 fixed categories."""

        system_prompt = f"""You are an expert goal achievement strategist. Generate personalized questions to understand the user's context.

GOAL CONTEXT:
- Title: {goal_title}
- Description: {goal_description}
- Theme: {theme}

TASK: Generate 3-4 relevant questions for EACH of the 4 categories below. Questions should be highly specific to their goal, not generic.

IMPORTANT RULES:
1. Questions MUST have OPTIONS (not open-ended text)
2. Use mix of question types: radio, checkbox, slider, time
3. Mark ONE option as "recommended" with clear reasoning
4. Recommendations should be evidence-based and goal-specific
5. Options should be realistic and actionable
6. Generate questions that will help build a personalized schedule

QUESTION TYPES:

**radio**: Single choice from 3-4 options
{{
  "id": "wake_time",
  "type": "radio",
  "question": "What time can you realistically wake up daily?",
  "options": [
    {{"value": "06:00", "label": "6:00 AM - Early Start", "recommended": true, "reason": "Aligns with natural circadian rhythm for your goal type"}},
    {{"value": "08:00", "label": "8:00 AM - Standard", "recommended": false}}
  ]
}}

**checkbox**: Multiple selections from 3-4 options
{{
  "id": "meal_prep",
  "type": "checkbox",
  "question": "Which meal strategies can you implement?",
  "options": [
    {{"value": "batch_cooking", "label": "Sunday batch cooking", "recommended": true, "reason": "Saves 5-7 hours weekly"}},
    {{"value": "meal_service", "label": "Meal delivery", "recommended": false}}
  ]
}}

**slider**: Numeric range with unit
{{
  "id": "work_duration",
  "type": "slider",
  "question": "Maximum focused work duration (without break)?",
  "min": 30,
  "max": 180,
  "step": 15,
  "unit": "minutes",
  "defaultValue": 90,
  "recommended": 90,
  "reason": "Research shows 90min optimal for deep work cycles"
}}

**time**: Time picker with HH:MM
{{
  "id": "sleep_time",
  "type": "time",
  "question": "Ideal bedtime for 7-8 hours sleep?",
  "defaultValue": "22:30",
  "recommended": "22:30",
  "reason": "Ensures quality rest for 6:30 AM wake time"
}}

OUTPUT FORMAT (JSON Array):
[
  {{
    "id": "physical",
    "name": "Physical & Energy",
    "icon": "💪",
    "color": "#E53E3E",
    "description": "Optimize your physical routines and energy levels",
    "questions": [
      // 3-4 questions here using types above
    ]
  }},
  {{
    "id": "mental",
    "name": "Mental & Focus",
    "icon": "🧠",
    "color": "#3182CE",
    "description": "Understand your focus patterns and cognitive peaks",
    "questions": [
      // 3-4 questions here
    ]
  }},
  {{
    "id": "lifestyle",
    "name": "Lifestyle & Constraints",
    "icon": "🏡",
    "color": "#38A169",
    "description": "Map your obligations and available resources",
    "questions": [
      // 3-4 questions here
    ]
  }},
  {{
    "id": "preferences",
    "name": "Preferences & Approach",
    "icon": "⚡",
    "color": "#9F7AEA",
    "description": "Customize your journey style and tracking",
    "questions": [
      // 3-4 questions here
    ]
  }}
]

QUALITY CRITERIA:
- Each question must be DIRECTLY relevant to achieving their specific goal
- Recommendations must have clear, logical reasoning
- Mix question types appropriately (not all radio)
- Options should be mutually exclusive for radio, complementary for checkbox
- Use slider for numeric ranges (time, intensity, frequency)
- Use time picker for scheduling questions

Generate the JSON array now. Return ONLY valid JSON, no other text:"""

        try:
            response = await self.engine.generate(system_prompt, [])
            logger.info(f"Question generation response length: {len(response)}")

            # Extract and parse JSON
            questions = self._extract_json(response)

            # Validate structure
            if not self._validate_questions(questions):
                raise ValueError("Generated questions don't match required structure")

            return questions

        except Exception as e:
            logger.error(f"Question generation failed: {e}")
            return self._get_fallback_questions()

    async def generate_schedule_and_phases(
        self,
        goal_title: str,
        goal_description: str,
        theme: str,
        duration_days: int,
        answers: Dict[str, Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate daily schedule + 3 phases from user answers."""

        # Format answers for context
        answer_context = self._format_answers_context(answers)

        system_prompt = f"""You are a world-class transformation architect. Create a personalized daily schedule and 3-phase roadmap.

GOAL CONTEXT:
- Title: {goal_title}
- Description: {goal_description}
- Theme: {theme}
- Duration: {duration_days} days

USER PROFILE:
{answer_context}

TASK: Generate TWO outputs:
1. DAILY SCHEDULE: 15-20 time-based activities optimized for this person
2. THREE PHASES: Structured phases with domains, tasks, and subtasks

OUTPUT FORMAT (JSON):
{{
  "daily_schedule": [
    {{
      "time": "06:00",
      "activity": "Morning Routine",
      "description": "Meditation + goal visualization",
      "tags": ["mindfulness", "preparation"],
      "sort_order": 1
    }}
    // 15-20 items total, covering full day
  ],
  "phases": [
    {{
      "phase_number": 0,
      "title": "Foundation",
      "description": "Build core habits and baseline systems",
      "unlock_streak_required": 0,
      "domains": [
        {{
          "name": "Physical Foundation",
          "tasks": [
            {{
              "title": "Establish morning routine",
              "subtasks": [
                "Wake at consistent time",
                "10-minute meditation",
                "Goal review and visualization"
              ]
            }}
          ]
        }}
      ]
    }},
    {{
      "phase_number": 1,
      "title": "Acceleration",
      "description": "Increase intensity and build momentum",
      "unlock_streak_required": 14,
      "domains": [
        // Same structure with 3-5 domains
      ]
    }},
    {{
      "phase_number": 2,
      "title": "Mastery",
      "description": "Peak performance and optimization",
      "unlock_streak_required": 42,
      "domains": [
        // Same structure
      ]
    }}
  ]
}}

DAILY SCHEDULE RULES:
1. Use user's actual wake/sleep times from answers
2. Align high-focus tasks with their peak mental clarity window
3. Include their preferred exercise frequency/type
4. Respect their work/study schedule constraints
5. Build in their preferred meal prep strategy
6. Match intensity to their preference (1-10 scale)
7. Include recovery blocks based on their energy patterns
8. Sequence: morning prep → peak work → recovery → secondary tasks → wind-down
9. Each activity should be 15-120 minutes
10. Cover full day from wake to sleep

PHASE STRUCTURE RULES:
1. Each phase should have 4-6 domains (e.g., Physical, Mental, Technical, Social, Lifestyle)
2. Each domain should have 2-4 tasks
3. Each task should have 3-5 concrete subtasks
4. Foundation (0-14 days): Build basics, establish routines, create foundation
5. Acceleration (14-42 days): Increase intensity, add complexity, build momentum
6. Mastery (42+ days): Peak performance, optimization, refinement
7. Domains should directly map to goal achievement
8. Tasks must be SPECIFIC, MEASURABLE, ACHIEVABLE
9. Subtasks should be clear action items
10. Progressive difficulty across phases

OPTIMIZATION PRINCIPLES:
- Energy management: Match task difficulty to user's natural rhythms
- Habit stacking: Chain complementary activities
- Sustainable intensity: Don't burn them out
- Realistic constraints: Respect their lifestyle limitations
- Progressive overload: Each phase builds on previous
- Recovery integration: Prevent burnout
- Flexibility: Allow for real-world adaptation

PERSONALIZATION:
- Use their actual preferred times, not idealized schedules
- Match their stated intensity preference
- Respect their work/life constraints
- Incorporate their available resources
- Align with their tracking preference (minimal/moderate/detailed)
- Build on their motivational preferences (streaks, badges, etc.)

Generate the JSON now. Return ONLY valid JSON, no other text:"""

        try:
            response = await self.engine.generate(system_prompt, [])
            logger.info(f"Schedule generation response length: {len(response)}")

            # Extract and parse JSON
            result = self._extract_json(response)

            # Validate structure
            if not self._validate_schedule_and_phases(result):
                raise ValueError("Generated schedule/phases don't match required structure")

            return result

        except Exception as e:
            logger.error(f"Schedule/phase generation failed: {e}")
            return self._get_fallback_schedule_and_phases(theme)

    async def generate_category_questions(
        self,
        goal_title: str,
        theme: str,
        category: str,
        previous_answers: Dict[str, Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Generate smart follow-up questions for a category based on previous answers."""

        prev_context = self._format_answers_context(previous_answers) if previous_answers else "No previous answers yet."

        system_prompt = f"""You are an expert goal achievement strategist. Generate 3-4 FOLLOW-UP questions for the "{category}" category.

GOAL: {goal_title} (theme: {theme})

PREVIOUS ANSWERS FROM USER:
{prev_context}

TASK: Based on what the user already told you, generate 3-4 SMART follow-up questions for the "{category}" category.
These questions should ADAPT to their previous answers — don't repeat what's already known.

For example:
- If they said they wake at 5 AM, ask about their morning routine specifics
- If they exercise 6 days/week, ask about workout types and recovery
- If they're a student, ask about study patterns and exam schedules

RULES:
1. Questions MUST have options (radio, checkbox, slider, or time types)
2. Mark ONE option as "recommended" with reasoning tied to their previous answers
3. Be SPECIFIC to their situation, not generic
4. Each question should unlock deeper personalization

OUTPUT FORMAT (JSON Array of question objects):
[
  {{
    "id": "unique_id",
    "type": "radio|checkbox|slider|time",
    "question": "...",
    "options": [...]  // for radio/checkbox
    // or min/max/step/unit/defaultValue/recommended/reason for slider
    // or defaultValue/recommended/reason for time
  }}
]

Return ONLY valid JSON:"""

        try:
            response = await self.engine.generate(system_prompt, [])
            questions = self._extract_json(response)
            if isinstance(questions, list):
                return questions
            raise ValueError("Expected list of questions")
        except Exception as e:
            logger.error(f"Category question generation failed: {e}")
            return []

    async def analyze_pulse_check(
        self,
        goal_title: str,
        theme: str,
        pulse_answers: Dict[str, Any],
        original_answers: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Analyze weekly pulse check answers and generate insights."""

        system_prompt = f"""You are a supportive goal coach. Analyze this weekly pulse check.

GOAL: {goal_title} (theme: {theme})

ORIGINAL SETUP ANSWERS:
{json.dumps(original_answers, indent=2)}

THIS WEEK'S PULSE CHECK:
{json.dumps(pulse_answers, indent=2)}

Provide brief, actionable insights in JSON:
{{
  "mood": "positive|neutral|struggling",
  "encouragement": "One warm sentence of encouragement",
  "adjustment_tip": "One specific tip to improve next week",
  "focus_area": "The domain they should focus on"
}}

Return ONLY valid JSON:"""

        try:
            response = await self.engine.generate(system_prompt, [])
            return self._extract_json(response)
        except Exception as e:
            logger.error(f"Pulse check analysis failed: {e}")
            return {"mood": "neutral", "encouragement": "Keep going, you're making progress!", "adjustment_tip": None, "focus_area": None}

    def _format_answers_context(self, answers: Dict[str, Dict[str, Any]]) -> str:
        """Format user answers for LLM context."""
        context_lines = []

        for category_id, category_answers in answers.items():
            context_lines.append(f"\n{category_id.upper()}:")
            for question_id, answer in category_answers.items():
                if isinstance(answer, list):
                    context_lines.append(f"  {question_id}: {', '.join(answer)}")
                else:
                    context_lines.append(f"  {question_id}: {answer}")

        return "\n".join(context_lines)

    def _extract_json(self, response: str) -> Any:
        """Extract JSON from LLM response."""
        try:
            # Try to find JSON object or array
            start_obj = response.find('{')
            start_arr = response.find('[')

            # Determine which comes first
            if start_obj != -1 and (start_arr == -1 or start_obj < start_arr):
                end = response.rfind('}') + 1
                json_str = response[start_obj:end]
            elif start_arr != -1:
                end = response.rfind(']') + 1
                json_str = response[start_arr:end]
            else:
                raise ValueError("No JSON found in response")

            return json.loads(json_str)

        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"JSON extraction failed: {e}")
            logger.debug(f"Response was: {response[:500]}")
            raise Exception(f"Failed to parse LLM response: {e}")

    def _validate_questions(self, questions: List[Dict]) -> bool:
        """Validate questions structure."""
        if not isinstance(questions, list) or len(questions) != 4:
            return False

        required_categories = {'physical', 'mental', 'lifestyle', 'preferences'}
        found_categories = {q.get('id') for q in questions}

        return required_categories == found_categories

    def _validate_schedule_and_phases(self, result: Dict) -> bool:
        """Validate schedule and phases structure."""
        if not isinstance(result, dict):
            return False

        if 'daily_schedule' not in result or 'phases' not in result:
            return False

        if not isinstance(result['daily_schedule'], list):
            return False

        if not isinstance(result['phases'], list) or len(result['phases']) != 3:
            return False

        return True

    def _get_fallback_questions(self) -> List[Dict]:
        """Fallback questions if generation fails."""
        return [
            {
                "id": "physical",
                "name": "Physical & Energy",
                "icon": "💪",
                "color": "#E53E3E",
                "description": "Optimize your physical routines and energy levels",
                "questions": [
                    {
                        "id": "wake_time",
                        "type": "radio",
                        "question": "What time can you realistically wake up every day?",
                        "options": [
                            {"value": "06:00", "label": "6:00 AM - Early Start", "recommended": True, "reason": "Optimal for goal achievement"},
                            {"value": "08:00", "label": "8:00 AM - Standard", "recommended": False}
                        ]
                    }
                ]
            },
            {
                "id": "mental",
                "name": "Mental & Focus",
                "icon": "🧠",
                "color": "#3182CE",
                "description": "Understand your focus patterns",
                "questions": []
            },
            {
                "id": "lifestyle",
                "name": "Lifestyle & Constraints",
                "icon": "🏡",
                "color": "#38A169",
                "description": "Map your obligations",
                "questions": []
            },
            {
                "id": "preferences",
                "name": "Preferences & Approach",
                "icon": "⚡",
                "color": "#9F7AEA",
                "description": "Customize your journey",
                "questions": []
            }
        ]

    def _get_fallback_schedule_and_phases(self, theme: str) -> Dict:
        """Fallback schedule if generation fails."""
        return {
            "daily_schedule": [
                {"time": "06:00", "activity": "Morning Routine", "description": "Start the day right", "tags": ["mindfulness"], "sort_order": 1},
                {"time": "08:00", "activity": "Focused Work", "description": "Peak productivity", "tags": ["focus"], "sort_order": 2}
            ],
            "phases": [
                {
                    "phase_number": 0,
                    "title": "Foundation",
                    "description": "Build basics",
                    "unlock_streak_required": 0,
                    "domains": [
                        {
                            "name": "Physical",
                            "tasks": [
                                {"title": "Build routine", "subtasks": ["Wake consistently", "Exercise daily"]}
                            ]
                        }
                    ]
                },
                {
                    "phase_number": 1,
                    "title": "Acceleration",
                    "description": "Build momentum",
                    "unlock_streak_required": 14,
                    "domains": []
                },
                {
                    "phase_number": 2,
                    "title": "Mastery",
                    "description": "Peak performance",
                    "unlock_streak_required": 42,
                    "domains": []
                }
            ]
        }
