import logging
import httpx
from typing import Dict, Optional, List
from app.services.engines.base import CrisisEngine
from app.core.config import settings

logger = logging.getLogger(__name__)


class OllamaCrisisEngine(CrisisEngine):

    VALID_SEVERITIES = {"none", "warning", "danger", "emergency"}

    SYSTEM_PROMPT = (
        "You are a mental health crisis detector. Assess whether the user's message "
        "indicates a mental health crisis.\n\n"
        "Severity levels:\n"
        "- none: No crisis signals detected.\n"
        "- warning: Signs of emotional distress (depression, anxiety, hopelessness) "
        "but no mention of self-harm or suicide.\n"
        "- danger: Mentions of self-harm, wanting to die, passive suicidal ideation, "
        "or feeling like a burden.\n"
        "- emergency: Active suicidal intent, specific plans or methods mentioned, "
        "or immediate safety risk.\n\n"
        "Think carefully about the message, then on your FINAL line, "
        "write ONLY one word: none, warning, danger, or emergency. Nothing else on that line."
    )

    RESOURCES = {
        "warning": [
            {
                "name": "National Suicide Prevention Lifeline",
                "phone": "988",
                "text": "Text 'HELLO' to 741741",
                "type": "crisis",
                "available": "24/7",
            },
            {
                "name": "Crisis Text Line",
                "text": "Text 'HELLO' to 741741",
                "type": "crisis",
                "available": "24/7",
            },
        ],
        "danger": [
            {
                "name": "National Suicide Prevention Lifeline",
                "phone": "988",
                "text": "Text 'HELLO' to 741741",
                "url": "https://suicidepreventionlifeline.org",
                "type": "crisis",
                "available": "24/7",
            },
            {
                "name": "Crisis Text Line",
                "text": "Text 'HELLO' to 741741",
                "url": "https://www.crisistextline.org",
                "type": "crisis",
                "available": "24/7",
            },
        ],
        "emergency": [
            {
                "name": "Emergency Services",
                "phone": "911",
                "type": "emergency",
                "available": "24/7",
            },
            {
                "name": "National Suicide Prevention Lifeline",
                "phone": "988",
                "text": "Text 'HELLO' to 741741",
                "url": "https://suicidepreventionlifeline.org",
                "type": "crisis",
                "available": "24/7",
            },
        ],
    }

    RESPONSES = {
        "warning": (
            "I hear you're going through something really tough. "
            "You don't have to carry this alone. "
            "Please reach out to someone who can help."
        ),
        "danger": (
            "🆘 I'm really concerned about your safety. "
            "Please reach out to a crisis professional right now. "
            "You matter, and people want to help."
        ),
        "emergency": (
            "🆘 IMMEDIATE HELP NEEDED\n\n"
            "Please call 988 or text 'HELLO' to 741741 RIGHT NOW.\n"
            "Or call 911 if you're in immediate danger.\n\n"
            "You are not alone. Help is available 24/7."
        ),
    }

    def __init__(self):
        self.endpoint = settings.ollama_endpoint
        self.api_key = settings.ollama_api_key
        self.model = settings.ollama_model
        self.timeout = 15.0
        self._available = bool(self.endpoint)
        if self._available:
            logger.info("✓ Ollama crisis engine initialized")
        else:
            logger.error("✗ Ollama crisis engine: OLLAMA_ENDPOINT not set")

    async def assess(
        self,
        message: str,
        emotion_label: Optional[str] = None,
        history: Optional[List[str]] = None,
    ) -> Dict:
        if not self._available:
            raise RuntimeError("Ollama crisis engine not available")

        context = message[:500]
        if emotion_label:
            context = f"[Detected emotion: {emotion_label}] {context}"

        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": self.SYSTEM_PROMPT},
                {"role": "user", "content": context},
            ],
            "temperature": 0.0,
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(self.endpoint, json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()

            raw = data["choices"][0]["message"]["content"].strip()
            severity = self._parse_severity(raw)

            if severity == "none":
                return {
                    "requires_escalation": False,
                    "severity": None,
                    "confidence": 0.0,
                    "response": None,
                    "resources": [],
                }

            confidence_map = {"warning": 0.70, "danger": 0.85, "emergency": 0.95}
            return {
                "requires_escalation": True,
                "severity": severity,
                "confidence": confidence_map.get(severity, 0.7),
                "response": self.RESPONSES.get(severity, ""),
                "resources": self.RESOURCES.get(severity, []),
            }

        except Exception as e:
            logger.error(f"Ollama crisis assessment failed: {e}")
            raise

    def _parse_severity(self, raw: str) -> str:
        # Last line first
        lines = [l.strip().lower().rstrip(".") for l in raw.strip().split("\n") if l.strip()]
        if lines:
            last_line = lines[-1]
            if last_line in self.VALID_SEVERITIES:
                return last_line

        # Standalone match scan
        for line in reversed(lines):
            for severity in self.VALID_SEVERITIES:
                if line == severity:
                    return severity

        # Fallback: keyword scan, most severe first
        full_text = raw.lower()
        for severity in ["emergency", "danger", "warning"]:
            if severity in full_text:
                return severity

        return "none"

    @property
    def provider_name(self) -> str:
        return "ollama"

    @property
    def is_available(self) -> bool:
        return self._available
