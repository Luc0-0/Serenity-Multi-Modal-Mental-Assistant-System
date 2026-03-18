#
# Copyright (c) 2026 Nipun Sujesh. All rights reserved.
# Licensed under the AGPLv3. See LICENSE file in the project root for details.
#
# This software is the confidential and proprietary information of Nipun Sujesh.
#

import json
from typing import List, Dict
from app.services.llm_service import LLMService


class LLMScheduleService:
    """LLM-powered schedule generation for goals."""

    def __init__(self):
        self.llm_service = LLMService()

    async def generate_schedule(
        self,
        goal_title: str,
        goal_description: str,
        duration_days: int,
        theme: str = "balanced"
    ) -> List[Dict]:
        """Generate optimized daily schedule based on goal."""

        # Adjust prompt based on theme
        theme_context = {
            "tactical": "Use military precision, aggressive optimization, high-intensity focus blocks",
            "balanced": "Balance productivity with wellness, sustainable rhythms, gentle progression",
            "gentle": "Emphasize self-care, mindful pacing, stress-free achievement"
        }

        system_prompt = f"""You are a world-class productivity architect specializing in personalized schedule design.

CONTEXT:
- Goal: {goal_title}
- Description: {goal_description}
- Duration: {duration_days} days
- Theme: {theme} - {theme_context.get(theme, '')}

TASK: Design an optimal daily schedule that maximizes goal achievement while maintaining sustainability.

OUTPUT FORMAT (JSON Array):
[
  {{
    "time": "05:00",
    "activity": "Morning Routine",
    "description": "Meditation, journaling, goal visualization",
    "tags": ["mindfulness", "preparation"],
    "sort_order": 1
  }},
  {{
    "time": "06:00",
    "activity": "Deep Work Block",
    "description": "Focus on primary goal tasks when energy is highest",
    "tags": ["focus", "priority"],
    "sort_order": 2
  }}
]

OPTIMIZATION PRINCIPLES:
1. Energy Management: Align high-energy tasks with peak performance windows
2. Habit Stacking: Chain related activities for flow state
3. Recovery Blocks: Include restoration to prevent burnout
4. Progress Tracking: Build in reflection/measurement points
5. Flexibility: Allow for real-world adaptation

SCHEDULE REQUIREMENTS:
- 8-12 time blocks total
- Include: morning routine, deep work, breaks, evening wind-down
- Tag each activity with relevant categories
- Sequence activities logically (prep → execution → recovery)
- Consider commute/life constraints in a typical schedule

Generate the JSON array now:"""

        try:
            response = await self.llm_service.generate_response(
                conversation_id=None,
                user_message=f"Generate schedule for: {goal_title}",
                system_prompt=system_prompt,
                user_id=None
            )

            # Parse JSON response
            schedule_json = self._extract_json(response)
            return schedule_json

        except Exception as e:
            # Fallback schedule if LLM fails
            return self._get_fallback_schedule(theme)

    def _extract_json(self, response: str) -> List[Dict]:
        """Extract JSON from LLM response."""
        try:
            # Find JSON array in response
            start = response.find('[')
            end = response.rfind(']') + 1

            if start != -1 and end != 0:
                json_str = response[start:end]
                return json.loads(json_str)
            else:
                raise ValueError("No JSON found in response")

        except (json.JSONDecodeError, ValueError) as e:
            raise Exception(f"Failed to parse LLM schedule response: {e}")

    def _get_fallback_schedule(self, theme: str) -> List[Dict]:
        """Fallback schedule if LLM generation fails."""

        if theme == "tactical":
            return [
                {"time": "05:00", "activity": "Strategic Morning Routine", "description": "Meditation, goal review, energy prep", "tags": ["preparation", "mindset"], "sort_order": 1},
                {"time": "06:00", "activity": "Primary Mission Block", "description": "High-intensity focus on core objectives", "tags": ["focus", "priority"], "sort_order": 2},
                {"time": "08:00", "activity": "Tactical Break", "description": "Nutrition, movement, strategic pause", "tags": ["recovery", "energy"], "sort_order": 3},
                {"time": "09:00", "activity": "Secondary Operations", "description": "Supporting tasks and skill development", "tags": ["skills", "progress"], "sort_order": 4},
                {"time": "12:00", "activity": "Midday Recharge", "description": "Fuel, brief rest, afternoon preparation", "tags": ["nutrition", "reset"], "sort_order": 5},
                {"time": "13:00", "activity": "Execution Phase", "description": "Implementation and action taking", "tags": ["action", "momentum"], "sort_order": 6},
                {"time": "16:00", "activity": "Review & Optimize", "description": "Progress assessment and plan adjustment", "tags": ["reflection", "optimization"], "sort_order": 7},
                {"time": "18:00", "activity": "Physical Training", "description": "Strength and endurance building", "tags": ["fitness", "discipline"], "sort_order": 8},
                {"time": "20:00", "activity": "Intelligence Briefing", "description": "Learning, reading, skill acquisition", "tags": ["learning", "growth"], "sort_order": 9},
                {"time": "21:30", "activity": "Mission Debrief", "description": "Day review, tomorrow's battle plan", "tags": ["planning", "reflection"], "sort_order": 10}
            ]
        else:  # balanced or gentle
            return [
                {"time": "06:00", "activity": "Gentle Morning Flow", "description": "Mindful awakening and intention setting", "tags": ["mindfulness", "intention"], "sort_order": 1},
                {"time": "07:00", "activity": "Nourishing Routine", "description": "Healthy breakfast and light movement", "tags": ["nutrition", "wellness"], "sort_order": 2},
                {"time": "08:00", "activity": "Focused Work Session", "description": "Creative and productive work aligned with goals", "tags": ["creativity", "productivity"], "sort_order": 3},
                {"time": "10:00", "activity": "Mindful Break", "description": "Fresh air, hydration, gentle stretching", "tags": ["wellness", "reset"], "sort_order": 4},
                {"time": "10:30", "activity": "Collaborative Time", "description": "Meetings, communication, relationship building", "tags": ["connection", "collaboration"], "sort_order": 5},
                {"time": "12:30", "activity": "Mindful Lunch", "description": "Nourishing meal with gratitude practice", "tags": ["nutrition", "mindfulness"], "sort_order": 6},
                {"time": "14:00", "activity": "Afternoon Flow", "description": "Sustained work with natural rhythms", "tags": ["flow", "productivity"], "sort_order": 7},
                {"time": "16:00", "activity": "Movement & Nature", "description": "Physical activity in natural settings", "tags": ["movement", "nature"], "sort_order": 8},
                {"time": "17:30", "activity": "Creative Expression", "description": "Personal projects and artistic pursuits", "tags": ["creativity", "joy"], "sort_order": 9},
                {"time": "19:00", "activity": "Connection Time", "description": "Family, friends, and community engagement", "tags": ["relationships", "love"], "sort_order": 10},
                {"time": "20:30", "activity": "Evening Reflection", "description": "Gratitude, journaling, peaceful transition", "tags": ["gratitude", "peace"], "sort_order": 11}
            ]