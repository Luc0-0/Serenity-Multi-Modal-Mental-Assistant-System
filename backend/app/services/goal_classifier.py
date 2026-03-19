#
# Copyright (c) 2026 Nipun Sujesh. All rights reserved.
# Licensed under the AGPLv3. See LICENSE file in the project root for details.
#

import json
import logging
import time
from typing import Dict, Any
from app.services.engines.factory import get_llm_engine

logger = logging.getLogger(__name__)

GOAL_TYPES = ["skill", "health", "academic", "multi_domain", "creative", "financial", "lifestyle"]


class GoalClassifier:
    """Classify goal type and extract suggested domains from title+description."""

    def __init__(self):
        self.engine = get_llm_engine()

    async def classify(self, title: str, description: str) -> Dict[str, Any]:
        """Returns goal_type and suggested_domains list."""

        system_prompt = f"""Return JSON only. No markdown, no prose.

Goal: "{title}"
Description: "{description}"

Classify this goal and extract its core domains.

Return exactly:
{{
  "goal_type": "<one of: skill|health|academic|multi_domain|creative|financial|lifestyle>",
  "suggested_domains": ["<domain1>", "<domain2>", ...]
}}

Rules:
1. goal_type: pick the single best fit. Use multi_domain if the goal spans 3+ distinct areas.
2. suggested_domains: 2-6 specific domain names. Be specific, not generic.
   - BAD: ["Physical", "Mental"]
   - GOOD: ["Chess Tactics", "Endgame Theory", "Pattern Recognition", "Tournament Mindset"]
3. Each domain name should be 1-4 words, title-case, capturing a real sub-area of the goal.
4. Order by importance to achieving the goal (most critical first).

Output now:"""

        logger.info(f"[CLASSIFIER] Classifying goal='{title}'")
        try:
            t0 = time.monotonic()
            response = await self.engine.generate(
                system_prompt,
                [{"role": "user", "content": "Output the JSON now."}],
                temperature=0.1,
                max_tokens=300,
            )
            elapsed = time.monotonic() - t0

            # Strip markdown fences if present
            text = response.strip()
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            result = json.loads(text.strip())

            goal_type = result.get("goal_type", "lifestyle")
            if goal_type not in GOAL_TYPES:
                goal_type = "lifestyle"

            domains = result.get("suggested_domains", [])
            if not isinstance(domains, list) or len(domains) < 1:
                domains = self._fallback_domains(title)

            logger.info(f"[CLASSIFIER] OK — type={goal_type} domains={domains} in {elapsed:.1f}s")
            return {"goal_type": goal_type, "suggested_domains": domains[:6]}

        except Exception as e:
            logger.error(f"[CLASSIFIER] FALLBACK — reason={e}")
            return {"goal_type": "lifestyle", "suggested_domains": self._fallback_domains(title)}

    def _fallback_domains(self, title: str) -> list[str]:
        """Generic fallback if LLM fails."""
        title_lower = title.lower()
        if any(w in title_lower for w in ["chess", "poker", "game"]):
            return ["Strategy", "Tactics", "Pattern Recognition", "Mental Performance"]
        if any(w in title_lower for w in ["fit", "body", "muscle", "weight", "run"]):
            return ["Training", "Nutrition", "Recovery", "Mindset"]
        if any(w in title_lower for w in ["code", "program", "develop", "software"]):
            return ["Core Skills", "Projects", "System Design", "Best Practices"]
        if any(w in title_lower for w in ["study", "learn", "academic", "exam"]):
            return ["Content Mastery", "Study Habits", "Memory", "Time Management"]
        return ["Core Skills", "Daily Habits", "Mindset", "Progress Tracking"]
