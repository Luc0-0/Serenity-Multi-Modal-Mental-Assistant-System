# AI Questions Service - LLM Prompts

This document contains the refined LLM prompts used for AI-powered question generation and schedule creation.

## 1. Question Generation Prompt

### Purpose

Generate personalized questions across 4 fixed categories based on user's goal.

### Input Parameters

- `goal_title`: User's goal title
- `goal_description`: Detailed goal description
- `theme`: One of "tactical", "balanced", "gentle"

### Prompt Structure

```
You are an expert goal achievement strategist. Generate personalized questions to understand the user's context.

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
```

### Question Types

**Radio (Single Choice)**

```json
{
  "id": "wake_time",
  "type": "radio",
  "question": "What time can you realistically wake up daily?",
  "options": [
    {
      "value": "06:00",
      "label": "6:00 AM - Early Start",
      "recommended": true,
      "reason": "Aligns with natural circadian rhythm for your goal type"
    },
    {
      "value": "08:00",
      "label": "8:00 AM - Standard",
      "recommended": false
    }
  ]
}
```

**Checkbox (Multiple Choice)**

```json
{
  "id": "meal_prep",
  "type": "checkbox",
  "question": "Which meal strategies can you implement?",
  "options": [
    {
      "value": "batch_cooking",
      "label": "Sunday batch cooking",
      "recommended": true,
      "reason": "Saves 5-7 hours weekly"
    }
  ]
}
```

**Slider (Numeric Range)**

```json
{
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
}
```

**Time Picker**

```json
{
  "id": "sleep_time",
  "type": "time",
  "question": "Ideal bedtime for 7-8 hours sleep?",
  "defaultValue": "22:30",
  "recommended": "22:30",
  "reason": "Ensures quality rest for 6:30 AM wake time"
}
```

### Expected Output Format

```json
[
  {
    "id": "physical",
    "name": "Physical & Energy",
    "icon": "💪",
    "color": "#E53E3E",
    "description": "Optimize your physical routines and energy levels",
    "questions": [...]
  },
  {
    "id": "mental",
    "name": "Mental & Focus",
    "icon": "🧠",
    "color": "#3182CE",
    "description": "Understand your focus patterns and cognitive peaks",
    "questions": [...]
  },
  {
    "id": "lifestyle",
    "name": "Lifestyle & Constraints",
    "icon": "🏡",
    "color": "#38A169",
    "description": "Map your obligations and available resources",
    "questions": [...]
  },
  {
    "id": "preferences",
    "name": "Preferences & Approach",
    "icon": "⚡",
    "color": "#9F7AEA",
    "description": "Customize your journey style and tracking",
    "questions": [...]
  }
]
```

### Quality Criteria

- Each question DIRECTLY relevant to achieving their specific goal
- Recommendations have clear, logical reasoning
- Mix question types appropriately (not all radio)
- Options mutually exclusive for radio, complementary for checkbox
- Use slider for numeric ranges (time, intensity, frequency)
- Use time picker for scheduling questions

---

## 2. Schedule & Phases Generation Prompt

### Purpose

Generate personalized daily schedule (15-20 activities) and 3-phase roadmap from user answers.

### Input Parameters

- `goal_title`: User's goal title
- `goal_description`: Detailed goal description
- `theme`: One of "tactical", "balanced", "gentle"
- `duration_days`: Total goal duration (e.g., 180)
- `answers`: Dictionary of user answers from all 4 categories

### Prompt Structure

```
You are a world-class transformation architect. Create a personalized daily schedule and 3-phase roadmap.

GOAL CONTEXT:
- Title: {goal_title}
- Description: {goal_description}
- Theme: {theme}
- Duration: {duration_days} days

USER PROFILE:
{formatted_answers}

TASK: Generate TWO outputs:
1. DAILY SCHEDULE: 15-20 time-based activities optimized for this person
2. THREE PHASES: Structured phases with domains, tasks, and subtasks
```

### Expected Output Format

```json
{
  "daily_schedule": [
    {
      "time": "06:00",
      "activity": "Morning Routine",
      "description": "Meditation + goal visualization",
      "tags": ["mindfulness", "preparation"],
      "sort_order": 1
    }
  ],
  "phases": [
    {
      "phase_number": 0,
      "title": "Foundation",
      "description": "Build core habits and baseline systems",
      "unlock_streak_required": 0,
      "domains": [
        {
          "name": "Physical Foundation",
          "tasks": [
            {
              "title": "Establish morning routine",
              "subtasks": [
                "Wake at consistent time",
                "10-minute meditation",
                "Goal review and visualization"
              ]
            }
          ]
        }
      ]
    },
    {
      "phase_number": 1,
      "title": "Acceleration",
      "description": "Increase intensity and build momentum",
      "unlock_streak_required": 14,
      "domains": [...]
    },
    {
      "phase_number": 2,
      "title": "Mastery",
      "description": "Peak performance and optimization",
      "unlock_streak_required": 42,
      "domains": [...]
    }
  ]
}
```

### Daily Schedule Rules

1. Use user's actual wake/sleep times from answers
2. Align high-focus tasks with their peak mental clarity window
3. Include their preferred exercise frequency/type
4. Respect their work/study schedule constraints
5. Build in their preferred meal prep strategy
6. Match intensity to their preference (1-10 scale)
7. Include recovery blocks based on energy patterns
8. Sequence: morning prep → peak work → recovery → secondary tasks → wind-down
9. Each activity should be 15-120 minutes
10. Cover full day from wake to sleep

### Phase Structure Rules

1. Each phase should have 4-6 domains (Physical, Mental, Technical, Social, Lifestyle)
2. Each domain should have 2-4 tasks
3. Each task should have 3-5 concrete subtasks
4. **Foundation (0-14 days)**: Build basics, establish routines, create foundation
5. **Acceleration (14-42 days)**: Increase intensity, add complexity, build momentum
6. **Mastery (42+ days)**: Peak performance, optimization, refinement
7. Domains should directly map to goal achievement
8. Tasks must be SPECIFIC, MEASURABLE, ACHIEVABLE
9. Subtasks should be clear action items
10. Progressive difficulty across phases

### Optimization Principles

- **Energy management**: Match task difficulty to user's natural rhythms
- **Habit stacking**: Chain complementary activities
- **Sustainable intensity**: Don't burn them out
- **Realistic constraints**: Respect their lifestyle limitations
- **Progressive overload**: Each phase builds on previous
- **Recovery integration**: Prevent burnout
- **Flexibility**: Allow for real-world adaptation

### Personalization Strategy

- Use their actual preferred times, not idealized schedules
- Match their stated intensity preference
- Respect their work/life constraints
- Incorporate their available resources
- Align with their tracking preference (minimal/moderate/detailed)
- Build on their motivational preferences (streaks, badges, etc.)

---

## Validation Checklist

### Question Generation Output

- ✅ Exactly 4 categories (physical, mental, lifestyle, preferences)
- ✅ Each category has 3-4 questions
- ✅ Mix of question types (not all radio)
- ✅ All radio/checkbox questions have options array
- ✅ At least one option marked as recommended with reason
- ✅ All sliders have min, max, step, unit, recommended, reason
- ✅ All time questions have defaultValue, recommended, reason
- ✅ Questions are goal-specific, not generic

### Schedule & Phases Output

- ✅ daily_schedule array with 15-20 items
- ✅ Each schedule item has: time, activity, description, tags, sort_order
- ✅ Times cover full day from user's wake to sleep time
- ✅ Phases array with exactly 3 phases
- ✅ Phase unlock requirements: 0, 14, 42 days
- ✅ Each phase has 4-6 domains
- ✅ Each domain has 2-4 tasks
- ✅ Each task has 3-5 subtasks
- ✅ Progressive difficulty across phases visible

---

## Integration Points

### Frontend API Calls

**Generate Questions**

```javascript
POST /api/goals/generate-questions
{
  "title": "Get fit and build muscle",
  "description": "Lose 15 pounds, build lean muscle",
  "theme": "balanced"
}
```

**Generate Schedule from Answers**

```javascript
POST /api/goals/generate-schedule-from-answers
{
  "title": "Get fit and build muscle",
  "description": "Lose 15 pounds, build lean muscle",
  "theme": "balanced",
  "duration_days": 180,
  "answers": {
    "physical": { "wake_time": "06:30", ... },
    "mental": { "focus_time": "morning", ... },
    "lifestyle": { "work_schedule": "flexible", ... },
    "preferences": { "intensity": 6, ... }
  }
}
```

### Backend Service

```python
from app.services.ai_questions_service import AIQuestionsService

service = AIQuestionsService()

# Generate questions
questions = await service.generate_questions(
    goal_title="...",
    goal_description="...",
    theme="balanced"
)

# Generate schedule + phases
result = await service.generate_schedule_and_phases(
    goal_title="...",
    goal_description="...",
    theme="balanced",
    duration_days=180,
    answers={...}
)
```

---

## Prompt Refinement Notes

### Version 1.0 (Current)

- Structured prompts with explicit JSON format examples
- Clear rules and constraints for LLM
- Evidence-based recommendations requirement
- Personalization based on user profile
- Progressive difficulty across phases
- Validation checklist built into service

### Future Improvements

- Add few-shot examples for better consistency
- Fine-tune token limits per section
- Add category-specific optimization rules
- Include domain expertise injection (fitness, productivity, etc.)
- Add A/B testing framework for prompt variations
