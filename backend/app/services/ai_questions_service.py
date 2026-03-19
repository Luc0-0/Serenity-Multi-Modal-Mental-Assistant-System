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

        system_prompt = f"""You are an expert goal achievement strategist. Generate personalized onboarding questions for a user's goal.

GOAL:
- Title: {goal_title}
- Description: {goal_description}
- Theme: {theme}

OUTPUT: A JSON array of exactly 4 category objects, in this exact order, with these exact IDs:
1. "physical" — Physical & Energy
2. "mental" — Mental & Focus
3. "lifestyle" — Lifestyle & Constraints
4. "preferences" — Preferences & Approach

Each category object:
{{
  "id": "<one of: physical | mental | lifestyle | preferences>",
  "name": "<category display name>",
  "description": "<one-line description>",
  "questions": [ /* 3 to 4 question objects */ ]
}}

QUESTION SCHEMAS (use exactly these fields, no extras):

TYPE "radio" — user picks ONE option:
{{
  "id": "<snake_case_unique_id>",
  "type": "radio",
  "question": "<question text>",
  "options": [
    {{"value": "<string>", "label": "<display label>", "recommended": true, "reason": "<why AI recommends this>"}},
    {{"value": "<string>", "label": "<display label>", "recommended": false}},
    {{"value": "<string>", "label": "<display label>", "recommended": false}}
  ]
}}
Rules: 3–4 options. Exactly ONE option has "recommended": true with a "reason" string. Others have "recommended": false (no "reason").

TYPE "checkbox" — user picks MULTIPLE options:
{{
  "id": "<snake_case_unique_id>",
  "type": "checkbox",
  "question": "<question text>",
  "options": [
    {{"value": "<string>", "label": "<display label>", "recommended": true, "reason": "<why recommended>"}},
    {{"value": "<string>", "label": "<display label>", "recommended": false}},
    {{"value": "<string>", "label": "<display label>", "recommended": false}},
    {{"value": "<string>", "label": "<display label>", "recommended": false}}
  ]
}}
Rules: 3–5 options. Exactly ONE has "recommended": true with "reason". Others have "recommended": false.

TYPE "slider" — numeric range the user drags:
{{
  "id": "<snake_case_unique_id>",
  "type": "slider",
  "question": "<question text>",
  "min": <integer>,
  "max": <integer>,
  "step": <integer>,
  "unit": "<unit label, e.g. min or kg or days — empty string if none>",
  "defaultValue": <integer within min–max>,
  "recommended": <integer within min–max>,
  "reason": "<why this value>"
}}

TYPE "time" — 24-hour time picker:
{{
  "id": "<snake_case_unique_id>",
  "type": "time",
  "question": "<question text>",
  "defaultValue": "<HH:MM in 24h format>",
  "recommended": "<HH:MM in 24h format>",
  "reason": "<why this time>"
}}

CATEGORY RULES:
- "physical": wake time (time), exercise frequency (radio or slider), energy peak (radio), physical intensity (slider or radio)
- "mental": focus session length (slider), biggest distractions (checkbox), learning style (radio)
- "lifestyle": schedule type (radio), available resources (checkbox), bedtime (time), constraints (radio or checkbox)
- "preferences": schedule intensity 1–10 (slider), tracking detail (radio), motivators (checkbox)

PERSONALIZATION RULES:
- Every question must be DIRECTLY relevant to "{goal_title}" — not generic
- Recommended values must reflect the specific demands of this goal and theme
- Use "time" type for wake/sleep/session start times only
- Use "slider" for durations, intensities, frequencies that need fine control
- Use "radio" for clear mutually-exclusive choices
- Use "checkbox" for complementary options (resources, habits, motivators)
- Mix types — never use all radio

Return ONLY a valid JSON array. No markdown, no explanation, no trailing text."""

        try:
            response = await self.engine.generate(system_prompt, [])
            logger.info(f"Question generation response length: {len(response)}")

            # Extract, normalize, then validate
            raw = self._extract_json(response)
            questions = self._normalize_questions(raw)

            if not self._validate_questions(questions):
                raise ValueError("Normalization could not produce usable structure")

            logger.info(f"[AI] Personalized questions generated for goal: '{goal_title}' (theme={theme})")
            return questions

        except Exception as e:
            logger.error(f"[FALLBACK] Question generation failed — using hardcoded defaults. Reason: {e}")
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

            logger.info(f"[AI] Personalized schedule+phases generated from user answers for goal: '{goal_title}' ({len(answers)} answer categories used)")
            return result

        except Exception as e:
            logger.error(f"[FALLBACK] Schedule/phase generation failed — using generic defaults. Reason: {e}")
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

        system_prompt = f"""You are an expert goal strategist generating adaptive follow-up questions.

GOAL: {goal_title} (theme: {theme})
CATEGORY TO GENERATE FOR: {category}

WHAT THE USER ALREADY ANSWERED:
{prev_context}

TASK: Generate 3–4 follow-up questions for the "{category}" category that DIG DEEPER based on the user's previous answers.
Do NOT repeat anything already asked. Adapt the questions to what you know about them.

Examples of adaptation:
- If they said they wake at 5 AM → ask about their specific morning activities, not wake time again
- If they selected "gym access" → ask about their preferred workout style or split
- If they said "student" schedule → ask about class hours, exam periods, study environment

Each question must use one of these exact schemas:

radio (single choice, 3–4 options, exactly one recommended:true with reason):
{{"id":"<id>","type":"radio","question":"...","options":[{{"value":"...","label":"...","recommended":true,"reason":"..."}},{{"value":"...","label":"...","recommended":false}}]}}

checkbox (multi-choice, 3–5 options, exactly one recommended:true with reason):
{{"id":"<id>","type":"checkbox","question":"...","options":[{{"value":"...","label":"...","recommended":true,"reason":"..."}},{{"value":"...","label":"...","recommended":false}}]}}

slider (numeric drag):
{{"id":"<id>","type":"slider","question":"...","min":<int>,"max":<int>,"step":<int>,"unit":"<string>","defaultValue":<int>,"recommended":<int>,"reason":"..."}}

time (24h time picker):
{{"id":"<id>","type":"time","question":"...","defaultValue":"HH:MM","recommended":"HH:MM","reason":"..."}}

STRICT RULES:
- Return a JSON array of 3–4 question objects only
- "recommended" must be boolean true/false for radio/checkbox options, integer for slider, "HH:MM" string for time
- IDs must be unique snake_case strings
- Questions must be specific to "{goal_title}" and informed by the user's prior answers
- Mix types — do not use all radio

Return ONLY valid JSON array, no other text:"""

        try:
            response = await self.engine.generate(system_prompt, [])
            raw = self._extract_json(response)
            if not isinstance(raw, list):
                raise ValueError("Expected list of questions")
            # Normalize by wrapping in a fake category, then extracting questions back
            normalized_cats = self._normalize_questions([{'id': category, 'questions': raw}])
            questions = normalized_cats[0]['questions'] if normalized_cats else []
            if not questions:
                raise ValueError("Normalization produced no valid questions")
            logger.info(f"[AI] Category follow-up questions generated for '{category}' using {len(previous_answers)} previous answer categories")
            return questions
        except Exception as e:
            logger.error(f"[FALLBACK] Category question generation failed for '{category}' — returning empty. Reason: {e}")
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
        """
        Extract JSON from LLM response with a three-pass repair chain:
        1. Direct parse (fast path)
        2. Regex cleanup (trailing commas, JS comments, Python booleans)
        3. json-repair library (handles missing commas, unquoted keys, etc.)
        """
        import re

        # Locate the outermost JSON structure
        start_obj = response.find('{')
        start_arr = response.find('[')

        if start_obj != -1 and (start_arr == -1 or start_obj < start_arr):
            end = response.rfind('}') + 1
            json_str = response[start_obj:end]
        elif start_arr != -1:
            end = response.rfind(']') + 1
            json_str = response[start_arr:end]
        else:
            raise ValueError("No JSON found in response")

        # Pass 1 — raw parse
        try:
            return json.loads(json_str)
        except json.JSONDecodeError:
            pass

        # Pass 2 — regex cleanup for common LLM mistakes
        cleaned = json_str
        cleaned = re.sub(r'//[^\n]*', '', cleaned)              # strip // comments
        cleaned = re.sub(r'/\*.*?\*/', '', cleaned, flags=re.DOTALL)  # strip /* */ comments
        cleaned = re.sub(r',\s*([}\]])', r'\1', cleaned)        # trailing commas
        cleaned = re.sub(r'\bTrue\b', 'true', cleaned)
        cleaned = re.sub(r'\bFalse\b', 'false', cleaned)
        cleaned = re.sub(r'\bNone\b', 'null', cleaned)
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            pass

        # Pass 3 — json-repair handles missing commas, unquoted keys, etc.
        try:
            from json_repair import repair_json
            repaired = repair_json(cleaned)
            result = json.loads(repaired)
            logger.warning("JSON required repair — LLM output was malformed but recoverable")
            return result
        except Exception as e:
            logger.error(f"JSON extraction failed all repair passes: {e}")
            logger.debug(f"Raw response (first 600 chars): {response[:600]}")
            raise Exception(f"Failed to parse LLM response after repair: {e}")

    def _normalize_questions(self, raw: List[Dict]) -> List[Dict]:
        """
        Sanitize AI output into exactly what the UI expects.
        Fixes common LLM mistakes: string booleans, wrong field names,
        out-of-range slider values, wrong time format, extra/missing fields.
        """
        REQUIRED_IDS = ['physical', 'mental', 'lifestyle', 'preferences']
        VALID_TYPES = {'radio', 'checkbox', 'slider', 'time'}
        import re

        # Index categories by id so order doesn't matter
        by_id = {cat.get('id'): cat for cat in raw if isinstance(cat, dict)}

        result = []
        for cat_id in REQUIRED_IDS:
            cat = by_id.get(cat_id, {})
            raw_questions = cat.get('questions', [])
            clean_questions = []

            for q in raw_questions:
                if not isinstance(q, dict):
                    continue
                qtype = str(q.get('type', '')).lower()
                if qtype not in VALID_TYPES:
                    continue
                qid = str(q.get('id', f'{cat_id}_{len(clean_questions)}'))
                question_text = str(q.get('question', ''))
                if not question_text:
                    continue

                if qtype in ('radio', 'checkbox'):
                    raw_opts = q.get('options', [])
                    if not isinstance(raw_opts, list) or len(raw_opts) < 2:
                        continue

                    options = []
                    for opt in raw_opts:
                        if not isinstance(opt, dict):
                            continue
                        # Normalize recommended to strict bool
                        rec_raw = opt.get('recommended', False)
                        if isinstance(rec_raw, str):
                            rec = rec_raw.strip().lower() == 'true'
                        else:
                            rec = bool(rec_raw)
                        options.append({
                            'value': str(opt.get('value', opt.get('label', ''))),
                            'label': str(opt.get('label', opt.get('value', ''))),
                            'recommended': rec,
                            **(({'reason': str(opt['reason'])} if opt.get('reason') else {})),
                        })

                    # Ensure exactly one recommended — if none, mark first; if multiple, keep first only
                    rec_indices = [i for i, o in enumerate(options) if o['recommended']]
                    if not rec_indices:
                        options[0]['recommended'] = True
                        options[0].setdefault('reason', 'Best default for most users')
                    elif len(rec_indices) > 1:
                        for i in rec_indices[1:]:
                            options[i]['recommended'] = False
                            options[i].pop('reason', None)

                    clean_questions.append({'id': qid, 'type': qtype, 'question': question_text, 'options': options})

                elif qtype == 'slider':
                    try:
                        mn = int(q.get('min', 0))
                        mx = int(q.get('max', 100))
                        step = int(q.get('step', 1))
                        dv = int(q.get('defaultValue', (mn + mx) // 2))
                        rec = int(q.get('recommended', dv))
                        dv = max(mn, min(mx, dv))
                        rec = max(mn, min(mx, rec))
                    except (TypeError, ValueError):
                        continue
                    clean_questions.append({
                        'id': qid, 'type': 'slider', 'question': question_text,
                        'min': mn, 'max': mx, 'step': step,
                        'unit': str(q.get('unit', '')),
                        'defaultValue': dv, 'recommended': rec,
                        'reason': str(q.get('reason', '')),
                    })

                elif qtype == 'time':
                    def coerce_time(val, fallback='08:00'):
                        s = str(val or '').strip()
                        # Accept HH:MM or H:MM
                        m = re.match(r'^(\d{1,2}):(\d{2})$', s)
                        if m:
                            h, mi = int(m.group(1)), int(m.group(2))
                            if 0 <= h <= 23 and 0 <= mi <= 59:
                                return f'{h:02d}:{mi:02d}'
                        return fallback
                    dv = coerce_time(q.get('defaultValue'), '08:00')
                    rec = coerce_time(q.get('recommended'), dv)
                    clean_questions.append({
                        'id': qid, 'type': 'time', 'question': question_text,
                        'defaultValue': dv, 'recommended': rec,
                        'reason': str(q.get('reason', '')),
                    })

            result.append({
                'id': cat_id,
                'name': str(cat.get('name', cat_id.replace('_', ' ').title())),
                'description': str(cat.get('description', '')),
                'questions': clean_questions,
            })

        return result

    def _validate_questions(self, questions: List[Dict]) -> bool:
        """Validate that normalization produced usable output."""
        if not isinstance(questions, list) or len(questions) != 4:
            return False
        required = {'physical', 'mental', 'lifestyle', 'preferences'}
        found = {q.get('id') for q in questions}
        if required != found:
            return False
        # At least 2 categories must have questions
        populated = sum(1 for q in questions if len(q.get('questions', [])) >= 1)
        return populated >= 2

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
