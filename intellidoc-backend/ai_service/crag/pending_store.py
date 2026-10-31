import json
import uuid
import time
import logging
from typing import Optional
from core.config import settings
from .models import PendingCRAGContext

logger = logging.getLogger(__name__)

_memory_store: dict = {}

async def save_pending_context(redis_client, ctx: PendingCRAGContext) -> str:
    key = f"crag_pending:{ctx.pending_id}"
    data = ctx.model_dump_json()
    try:
        if redis_client:
            await redis_client.setex(key, settings.CRAG_PENDING_TTL_SECONDS, data)
            return ctx.pending_id
    except Exception as e:
        logger.warning(f"Failed to save pending CRAG to Redis: {e}, falling back to in-memory store")
    _memory_store[key] = (time.time() + settings.CRAG_PENDING_TTL_SECONDS, data)
    return ctx.pending_id

async def load_pending_context(redis_client, pending_id: str) -> Optional[PendingCRAGContext]:
    key = f"crag_pending:{pending_id}"
    data = None
    try:
        if redis_client:
            data = await redis_client.get(key)
            if data:
                await redis_client.delete(key)
    except Exception as e:
        logger.warning(f"Failed to load pending CRAG from Redis: {e}")
    if not data and key in _memory_store:
        expires, val = _memory_store.pop(key, (0, None))
        if time.time() < expires:
            data = val
    if not data:
        return None
    return PendingCRAGContext.model_validate_json(data)
