"""
Lightweight embedding helper with graceful degradation.
"""

from __future__ import annotations

import asyncio
import logging
import math
from typing import List

logger = logging.getLogger(__name__)


class EmbeddingService:
    """
    Produces numerical embeddings for text. Tries to use SentenceTransformers
    for high-quality vectors, but falls back to a cheap hashing approach when
    the heavyweight model is unavailable.
    """

    def __init__(self) -> None:
        self._model = None
        self._model_name = "all-MiniLM-L6-v2"
        self._model_lock = asyncio.Lock()

    async def embed(self, text: str) -> List[float]:
        if not text:
            return []

        model = await self._get_model()
        if model is None:
            return self._hash_embed(text)

        try:
            # SentenceTransformer is synchronous; run it off the main loop
            vector = await asyncio.to_thread(model.encode, [text], normalize_embeddings=True)
            return vector[0].tolist()
        except Exception as exc:  # pragma: no cover
            logger.warning("Embedding model failed (%s), falling back to hashing", exc)
            return self._hash_embed(text)

    async def _get_model(self):
        if self._model is not None:
            return self._model

        async with self._model_lock:
            if self._model is not None:
                return self._model
            try:
                from sentence_transformers import SentenceTransformer

                self._model = SentenceTransformer(self._model_name)
                logger.info("SentenceTransformer '%s' loaded for embeddings", self._model_name)
            except Exception as exc:  # pragma: no cover
                logger.warning("Unable to load SentenceTransformer (%s). Using hash embeddings.", exc)
                self._model = None
        return self._model

    def _hash_embed(self, text: str) -> List[float]:
        """
        Deterministic bag-of-words hash embedding used when we cannot load
        a proper transformer model. Keeps vector size small (64 dims) so cos
        similarity is still meaningful.
        """

        vector = [0.0] * 64
        for word in text.lower().split():
            idx = hash(word) % len(vector)
            vector[idx] += 1.0

        norm = math.sqrt(sum(v * v for v in vector)) or 1.0
        return [v / norm for v in vector]


embedding_service = EmbeddingService()
