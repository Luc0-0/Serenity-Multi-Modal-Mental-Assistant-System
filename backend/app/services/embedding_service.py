"""
Lightweight embedding helper with graceful degradation.
"""

from __future__ import annotations

import asyncio
import logging
import math
from typing import List, Optional

logger = logging.getLogger(__name__)


class EmbeddingService:
    """
    Produces numerical embeddings for text. Tries to use SentenceTransformers
    for high-quality vectors, but falls back to a cheap hashing approach when
    the heavyweight model is unavailable.
    """

    def __init__(self) -> None:
        self._model = None
        self._model_name = "BAAI/bge-small-en-v1.5"
        self._model_lock = asyncio.Lock()
        self._warmup_task: Optional[asyncio.Task] = None

    async def embed(self, text: str) -> List[float]:
        if not text:
            return []

        model = await self._get_model()
        if model is None:
            return self._hash_embed(text)

        try:
            # SentenceTransformer is synchronous; run it off the main loop
            embeddings = await asyncio.to_thread(lambda: list(model.embed([text])))
            return embeddings[0].tolist()
        except Exception as exc:  # pragma: no cover
            logger.warning("Embedding model failed (%s), falling back to hashing", exc)
            return self._hash_embed(text)

    def start_background_warmup(self) -> None:
        """
        Start model warmup without blocking request latency.
        Safe to call repeatedly.
        """
        if self._model is not None:
            return
        if self._warmup_task and not self._warmup_task.done():
            return
        self._warmup_task = asyncio.create_task(self._warm_model_async())

    async def _get_model(self):
        if self._model is not None:
            return self._model

        # Do not block the request path on initial heavyweight model load.
        self.start_background_warmup()
        return self._model

    async def _warm_model_async(self) -> None:
        async with self._model_lock:
            if self._model is not None:
                return
            try:
                from fastembed import TextEmbedding

                self._model = await asyncio.to_thread(
                    TextEmbedding,
                    self._model_name,
                )
                logger.info("FastEmbed '%s' loaded for embeddings", self._model_name)
            except Exception as exc:  # pragma: no cover
                logger.warning("Unable to load FastEmbed (%s). Using hash embeddings.", exc)
                self._model = None

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
