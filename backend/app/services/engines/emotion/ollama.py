import logging
import httpx
from typing import Dict
from app.services.engines.base import EmotionEngine
from app.core.config import settings

logger = logging.getLogger(__name__)


class GeminiEmotionEngine(EmotionEngine):

    VALID_EMOTIONS = {"sadness", "joy", "fear", "anger", "surprise", "disgust", "neutral"}

    SYSTEM_PROMPT = (
        "Classify the primary emotion in this mental health app message.\n\n"
        "Labels: sadness, joy, fear, anger, surprise, disgust, neutral\n\n"
        "Rules:\n"
        "- Pick the DOMINANT emotion, even in mixed states\n"
        "- 'neutral' = genuinely calm or fine, NOT when uncertain\n"
        "- Context over literal words: 'I'm so tired' = sadness; 'I can't do this' = sadness or fear\n"
        "- Fear covers: anxious, stressed, overwhelmed, worried\n\n"
        "Output ONLY: <emotion>label</emotion>"
    )

    def __init__(self):
        if settings.llm_provider == 'ollama':
            self.endpoint = settings.ollama_endpoint
            self.api_key = settings.ollama_api_key
            self.model = settings.ollama_model
        else:
            self.endpoint = settings.gemini_endpoint
            self.api_key = settings.gemini_api_key
            self.model = settings.gemini_model
        self.provider = settings.llm_provider
        self.timeout = 15.0
        self._available = bool(self.endpoint)
        if self._available:
            logger.info(f"✓ Gemini emotion engine initialized (provider: {self.provider})")
        else:
            logger.error(f"✗ Emotion engine: endpoint not set for provider '{self.provider}'")

    async def analyze(self, text: str) -> Dict:
        if not self._available:
            raise RuntimeError("Gemini emotion engine not available")

        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": self.SYSTEM_PROMPT},
                {"role": "user", "content": text[:2000]},
            ],
            "temperature": 0.1,
            "max_tokens": 150,
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
                "provider": "gemini",
            }
        except Exception as e:
            logger.error(f"Gemini emotion analysis failed: {e}")
            raise

    def _parse_emotion(self, raw: str) -> str:
        from app.utils.emotion_constants import normalize_emotion
        import re
        
        # 1. Search for explicit XML tag
        match = re.search(r"<emotion>\s*([a-zA-Z_]+)\s*</emotion>", raw, re.IGNORECASE)
        if match:
            return normalize_emotion(match.group(1))
            
        # 2. Fallback: Check the last line safely
        lines = [l.strip().lower().rstrip(".,!") for l in raw.strip().split("\n") if l.strip()]
        if lines:
            return normalize_emotion(lines[-1])
            
        return "neutral"

    @property
    def provider_name(self) -> str:
        return "gemini"

    @property
    def is_available(self) -> bool:
        return self._available
