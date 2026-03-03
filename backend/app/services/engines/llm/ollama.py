import logging
import httpx
from typing import Dict, List
from app.services.engines.base import LLMEngine
from app.core.config import settings

logger = logging.getLogger(__name__)


class OllamaLLMEngine(LLMEngine):
    """Ollama Cloud API LLM integration."""
    
    def __init__(self):
        self.endpoint = settings.ollama_endpoint
        self.api_key = settings.ollama_api_key
        self.model = settings.ollama_model
        self.max_tokens = settings.ollama_max_tokens
        self.timeout = 30.0
        self._available = self._check_availability()
    
    def _check_availability(self) -> bool:
        if not self.endpoint:
            logger.error("OLLAMA_ENDPOINT not set - please configure in .env or docker-compose")
            return False
        # API key is optional for local Ollama instances
        return True
    
    async def generate(
        self,
        system_prompt: str,
        messages: List[Dict[str, str]],
        **kwargs
    ) -> str:
        """Generate LLM response via Ollama Cloud API."""
        if not self._available:
            raise RuntimeError("Ollama engine not available")
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        full_messages = [{"role": "system", "content": system_prompt}] + messages
        
        payload = {
            "model": self.model,
            "messages": full_messages,
            "max_tokens": kwargs.get('max_tokens', self.max_tokens),
            "temperature": kwargs.get('temperature', 0.7),
        }
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    self.endpoint,
                    json=payload,
                    headers=headers
                )
                response.raise_for_status()
                data = response.json()
                return data['choices'][0]['message']['content'].strip()
        except httpx.HTTPStatusError as e:
            logger.error(f"Ollama API error: {e.status_code} - {e.response.text}")
            raise RuntimeError(f"Ollama API failed: {e.status_code}")
        except Exception as e:
            logger.error(f"Ollama generation failed: {e}")
            raise
    
    async def generate_title(self, text: str) -> str:
        """Generate short conversation title from text snippet."""
        if not self._available:
            raise RuntimeError("Ollama engine not available")

        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a title generator. Given a conversation, identify the single core topic or theme and express it as a short, natural title (4-7 words). No reasoning, no explanation, no punctuation at the end. Just the title."
                },
                {
                    "role": "user",
                    "content": f"What is this conversation mainly about: {text[:1000]}"
                }
            ],
            "temperature": 0.3,
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(self.endpoint, json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()
        except Exception as e:
            logger.error(f"Title generation API call failed: {e}")
            data = {}

        title = ""
        if "choices" in data and data["choices"]:
            title = data["choices"][0].get("message", {}).get("content", "").strip()

        if not title:
            return ""

        title = title.replace("\n", " ").strip().strip(".,;:")
        title = title[:100]

        logger.info(f"[TITLE_GEN] SUCCESS: '{title}'")
        return title if title else ""


    
    @property
    def provider_name(self) -> str:
        return 'ollama'
    
    @property
    def is_available(self) -> bool:
        return self._available