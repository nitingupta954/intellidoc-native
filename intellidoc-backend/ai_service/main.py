import logging
import os
import uvicorn
import asyncio
import time
import redis.asyncio as redis
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from workers.rabbitmq_consumer import consume
from core.dependencies import get_vector_store

from routers.health_router import router as health_router
from routers.chat_router import router as chat_router
from routers.document_router import router as document_router
from routers.evaluation_router import router as evaluation_router
from routers.retrieval_router import router as retrieval_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend AI service handling document intelligence, embeddings, and chat.",
    version="2.0.0"
)

origins = [settings.ALLOWED_ORIGIN] if settings.ALLOWED_ORIGIN != "*" else ["*"]
allow_creds = False if "*" in origins else True

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if not allow_creds else [settings.ALLOWED_ORIGIN, "https://doc-management-native.vercel.app", "http://localhost:3000", "http://localhost:8081"], 
    allow_credentials=allow_creds,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def timer_middleware(request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration = time.perf_counter() - start
    logger.info(f"{request.url.path} took {duration:.3f}s")
    return response

consumer_task = None

@app.on_event("startup")
async def startup_event():
    global consumer_task
    logger.info("Initializing Redis client...")
    try:
        app.state.redis = redis.from_url(settings.REDIS_URL, decode_responses=True)
    except Exception as e:
        logger.warning(f"Redis initialization warning: {e}")
        app.state.redis = None
    
    # Pre-initialize default Qdrant vector store
    try:
        await get_vector_store()
    except Exception as e:
        logger.warning(f"Vector store pre-init warning: {e}")
    
    logger.info("Starting RabbitMQ Consumer...")
    try:
        consumer_task = asyncio.create_task(consume())
    except Exception as e:
        logger.warning(f"RabbitMQ consumer start warning: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    if getattr(app.state, "redis", None):
        try:
            await app.state.redis.close()
        except Exception:
            pass

# Include Routers
app.include_router(health_router, tags=["Health"])
app.include_router(chat_router, prefix="/api/v1", tags=["Chat"])
app.include_router(document_router, prefix="/api/v1", tags=["Documents"])
app.include_router(evaluation_router, prefix="/api/v1", tags=["Evaluation"])
app.include_router(retrieval_router, prefix="/api/v1", tags=["Retrieval"])

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=False
    )