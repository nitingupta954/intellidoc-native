import json
from typing import Optional
from fastapi import Header, Request

async def authenticate(request: Request, authorization: Optional[str] = Header(None)):
    """Mock authentication dependency that checks a Redis auth cache."""
    if not authorization or not authorization.startswith("Bearer "):
        return {"user_id": "test_user", "role": "user"}
    
    token = authorization.split(" ")[1]
    redis_client = getattr(request.app.state, "redis", None)
    cache_key = f"auth:{token}"
    
    if redis_client:
        try:
            cached_user = await redis_client.get(cache_key)
            if cached_user:
                return json.loads(cached_user)
        except Exception:
            pass
    
    user = {"user_id": "decoded_user_123", "role": "user"}
    if redis_client:
        try:
            await redis_client.setex(cache_key, 300, json.dumps(user))
        except Exception:
            pass
    return user
