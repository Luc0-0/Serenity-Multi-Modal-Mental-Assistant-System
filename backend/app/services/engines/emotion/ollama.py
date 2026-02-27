import logging
import httpx
from typing import Dict
from app.services.engines.base import EmotionEngine
from app.core.config import settings

logger = logging.getLogger(__name__)


class OllamaEmotionEngine(EmotionEngine):

    VALID_EMOTIONS = {"sadness", "joy", "fear", "anger", "surprise", "disgust", "neutral"}

    SYSTEM_PROMPT = (
        "You are an emotion classifier for a mental health app. "
        "Given a user's message, analyze the emotional tone and classify it.\n\n"
        "Available emotions: sadness, joy, fear, anger, surprise, disgust, neutral\n\n"
        "Think about what the user is expressing, then on your FINAL line, "
        "write ONLY the single emotion word from the list above. Nothing else on that line."
    )

    def __init__(self):
        self.endpoint = settings.ollama_endpoint
        self.api_key = settings.ollama_api_key
        self.model = settings.ollama_model
        self.timeout = 15.0
        self._available = bool(self.endpoint)
        if self._available:
            logger.info("✓ Ollama emotion engine initialized")
        else:
            logger.error("✗ Ollama emotion engine: OLLAMA_ENDPOINT not set")

    async def analyze(self, text: str) -> Dict:
        if not self._available:
            raise RuntimeError("Ollama emotion engine not available")

        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": self.SYSTEM_PROMPT},
                {"role": "user", "content": text[:500]},
            ],
            "temperature": 0.1,
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(self.endpoint, json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()

            raw = data["choices"][0]["message"]["content"].strip()
            label = self._parse_emotion(raw)

            return {
                "label": label,
                "confidence": 0.85 if label != "neutral" else 0.6,
                "provider": "ollama",
            }
        except Exception as e:
            logger.error(f"Ollama emotion analysis failed: {e}")
            raise

    def _parse_emotion(self, raw: str) -> str:
        # Last line first (prompt asks model to put answer there)
        lines = [l.strip().lower().rstrip(".") for l in raw.strip().split("\n") if l.strip()]
        if lines:
            last_line = lines[-1]
            if last_line in self.VALID_EMOTIONS:
                return last_line

        # Standalone match scan
        for line in reversed(lines):
            for emotion in self.VALID_EMOTIONS:
                if line == emotion:
                    return emotion

        # Fallback: keyword scan (skip neutral to avoid false positives)
        full_text = raw.lower()
        for emotion in self.VALID_EMOTIONS - {"neutral"}:
            if emotion in full_text:
                return emotion

        return "neutral"

    @property
    def provider_name(self) -> str:
        return "ollama"

    @property
    def is_available(self) -> bool:
        return self._available
