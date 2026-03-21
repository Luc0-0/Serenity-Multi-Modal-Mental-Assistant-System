from __future__ import annotations

import asyncio
import logging
import random
import time
from dataclasses import dataclass
from typing import Awaitable, Callable, Dict, Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class RefreshTask:
    user_id: int
    reason: str
    enqueued_at: float


RefreshHandler = Callable[[int], Awaitable[None]]


class ContextRefreshService:
    """Background refresh queue for context snapshots with load-pressure controls."""

    def __init__(self) -> None:
        self._queue: asyncio.Queue[RefreshTask] = asyncio.Queue()
        self._worker_task: Optional[asyncio.Task] = None
        self._handlers: Dict[str, RefreshHandler] = {}
        self._last_seen: Dict[int, float] = {}

        # Metrics
        self._fallback_served = 0
        self._prewarm_attempts = 0
        self._prewarm_hits = 0

    def register_handler(self, name: str, handler: RefreshHandler) -> None:
        self._handlers[name] = handler

    def queue_depth(self) -> int:
        return self._queue.qsize()

    def mark_fallback_served(self) -> None:
        self._fallback_served += 1

    def metrics(self) -> Dict[str, float]:
        hit_rate = 0.0
        if self._prewarm_attempts > 0:
            hit_rate = self._prewarm_hits / self._prewarm_attempts
        return {
            "queue_depth": float(self.queue_depth()),
            "prewarm_hit_rate": hit_rate,
            "fallback_rate": float(self._fallback_served),
        }

    def pressure_high(self) -> bool:
        return self.queue_depth() >= settings.memory_refresh_queue_max_depth

    def note_user_activity(self, user_id: int) -> None:
        self._last_seen[user_id] = time.time()

    async def maybe_prewarm(self, user_id: int) -> None:
        """Simple heuristic: likely-returning users get jittered prewarm."""
        if not settings.feature_async_context_refresh:
            return

        self._prewarm_attempts += 1
        last_seen = self._last_seen.get(user_id)
        now = time.time()

        # Returning user if seen within the last hour.
        likely_returning = last_seen is not None and (now - last_seen) <= 3600
        if not likely_returning:
            return

        self._prewarm_hits += 1
        await self.enqueue_refresh(user_id=user_id, reason="prewarm")

    async def enqueue_refresh(self, *, user_id: int, reason: str) -> bool:
        if not settings.feature_async_context_refresh:
            return False

        if self.pressure_high():
            logger.info("[CTX-REFRESH] pressure_high=true user=%s reason=%s", user_id, reason)
            return False

        await self._queue.put(RefreshTask(user_id=user_id, reason=reason, enqueued_at=time.time()))
        self._ensure_worker()
        return True

    def _ensure_worker(self) -> None:
        if self._worker_task and not self._worker_task.done():
            return
        self._worker_task = asyncio.create_task(self._worker_loop())

    async def _worker_loop(self) -> None:
        while True:
            task = await self._queue.get()
            try:
                jitter_ms = max(0, settings.memory_refresh_jitter_ms)
                if jitter_ms:
                    await asyncio.sleep(random.uniform(0.0, jitter_ms / 1000.0))

                for name, handler in self._handlers.items():
                    started = time.perf_counter()
                    try:
                        await handler(task.user_id)
                    except Exception as exc:
                        logger.warning(
                            "[CTX-REFRESH] handler_failed name=%s user=%s reason=%s error=%s",
                            name,
                            task.user_id,
                            task.reason,
                            exc,
                        )
                    finally:
                        elapsed_ms = (time.perf_counter() - started) * 1000.0
                        logger.info(
                            "[CTX-REFRESH] handler=%s user=%s reason=%s elapsed_ms=%.2f queue_depth=%s",
                            name,
                            task.user_id,
                            task.reason,
                            elapsed_ms,
                            self.queue_depth(),
                        )
            finally:
                self._queue.task_done()


context_refresh_service = ContextRefreshService()
