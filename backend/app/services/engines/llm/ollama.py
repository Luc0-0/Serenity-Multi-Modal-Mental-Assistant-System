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
        if not self.api_key:
            logger.error("OLLAMA_API_KEY not set")
            return False
        if not self.endpoint:
            logger.error("OLLAMA_ENDPOINT not set")
            return False
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
        """Generate short conversation title."""
        prompt = f"Generate a short 3-5 word title for this message. Only return the title, nothing else.\n\nMessage: {text[:200]}"
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 20,
            "temperature": 0.5
        }
        
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    self.endpoint,
                    json=payload,
                    headers=headers
                )
                response.raise_for_status()
                data = response.json()
                return data['choices'][0]['message']['content'].strip()
        except Exception as e:
            logger.warning(f"Title generation failed: {e}")
            return "New Conversation"
    
    @property
    def provider_name(self) -> str:
        return 'ollama'
    
    @property
    def is_available(self) -> bool:
        return self._available
