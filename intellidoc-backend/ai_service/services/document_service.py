import logging
import os
import tempfile
import boto3
import httpx
import asyncio
from typing import Optional
from core.config import settings
from parsers.document_parser import DocumentParser
from embeddings.semantic_chunker import SemanticChunker
from embeddings.embedding_service import EmbeddingService
from core.dependencies import get_vector_store

logger = logging.getLogger(__name__)

parser = DocumentParser()
chunker = SemanticChunker()
embedding_svc = EmbeddingService()

async def update_document_status(document_id: str, data: dict):
    try:
        base_url = (settings.APP_URL or "https://doc-management-native.vercel.app").rstrip("/")
        if not base_url.startswith("http"):
            base_url = "https://doc-management-native.vercel.app"
        url = f"{base_url}/api/documents/{document_id}"
        secret = settings.INTERNAL_SERVICE_SECRET
        headers = {"Authorization": f"Bearer {secret}"} if secret else {}
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.patch(url, json=data, headers=headers)
            logger.info(f"Updated document {document_id} status in Next.js ({resp.status_code}): {data.get('status') or data.get('currentStep')}")
    except Exception as e:
        logger.error(f"Failed to update document status in Next.js: {e}")

async def process_document_pipeline(
    file_path: str, 
    document_id: str, 
    workspace_id: str, 
    uploaded_by: str, 
    knowledge_base_id: Optional[str], 
    metadata: dict, 
    openai_api_key: str = None, 
    gemini_api_key: str = None
):
    local_path = None
    try:
        from services.chat_service import rag_chain # Local import to avoid circular dep if needed
        await update_document_status(document_id, {"status": "PROCESSING", "currentStep": "Downloading from storage", "progress": 10})
        logger.info(f"Downloading {file_path} from storage...")
        
        s3 = boto3.client(
            's3',
            endpoint_url=settings.S3_ENDPOINT,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION
        )
        
        object_key = file_path
        if object_key.startswith("minio://"):
            parts = object_key.replace("minio://", "").split("/", 1)
            if len(parts) == 2:
                object_key = parts[1]

        bucket_name = settings.S3_BUCKET or "intellidoc"

        ext = os.path.splitext(object_key)[1].lower()
        if not ext:
            ext = ".pdf" 

        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp_file:
            local_path = tmp_file.name

        logger.info(f"Downloading s3://{bucket_name}/{object_key} to {local_path}...")
        await asyncio.to_thread(s3.download_file, bucket_name, object_key, local_path)
        logger.info(f"Downloaded to local path: {local_path} (size: {os.path.getsize(local_path)} bytes)")
        
        # 1. Parse
        await update_document_status(document_id, {"currentStep": "Parsing Document", "progress": 30})
        elements = await asyncio.to_thread(parser.parse_document, local_path)
        
        for el in elements:
            if isinstance(el, dict):
                if "metadata" not in el:
                    el["metadata"] = {}
                el["metadata"]["document_id"] = document_id
                el["metadata"]["workspace_id"] = workspace_id
                if knowledge_base_id:
                    el["metadata"]["knowledge_base_id"] = knowledge_base_id
                el["metadata"]["uploaded_by"] = uploaded_by
            
        # 2. Chunk
        await update_document_status(document_id, {"currentStep": "Chunking text", "progress": 50})
        chunks = await asyncio.to_thread(chunker.chunk_documents, elements)
        logger.info(f"Created {len(chunks)} chunks for {document_id}")
        
        if not chunks:
            logger.warning(f"No text chunks could be extracted from {file_path}. It might be an image-only PDF.")
            await update_document_status(document_id, {
                "status": "INDEXED", 
                "progress": 100,
                "currentStep": "Completed with warnings: No text found"
            })
            return
            
        # 3. Embed
        await update_document_status(document_id, {"currentStep": "Generating Embeddings (Batched)", "progress": 70})
        texts = [c["content"] for c in chunks]
        
        effective_openai_key = openai_api_key or settings.OPENAI_API_KEY or None
        effective_gemini_key = gemini_api_key or settings.GEMINI_API_KEY or None

        batch_size = 100
        embeddings = []
        provider, dim = None, None
        
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i:i + batch_size]
            batch_emb, prov, d = embedding_svc.embed_documents(
                batch_texts, 
                openai_api_key=effective_openai_key, 
                gemini_api_key=effective_gemini_key
            )
            embeddings.extend(batch_emb)
            if not provider:
                provider = prov
                dim = d
        
        # 4. Upsert to Qdrant
        await update_document_status(document_id, {"currentStep": "Saving to Vector Store", "progress": 90})
        vs = await get_vector_store(provider=provider, dimension=dim)
        await vs.upsert_chunks(chunks, embeddings)
        logger.info(f"Upserted {len(chunks)} vectors to Qdrant for {document_id}")
        
        # 5. Generate Summary and Questions
        await update_document_status(document_id, {"currentStep": "Generating Summary", "progress": 95})
        try:
            sample_text = " ".join([c["content"] for c in chunks[:5]])
            summary_data = await rag_chain.generate_summary_and_questions(
                sample_text, 
                openai_api_key=effective_openai_key, 
                gemini_api_key=effective_gemini_key
            )
        except Exception as summary_err:
            logger.error(f"Failed to generate summary: {summary_err}")
            summary_data = {"summary": None, "suggestedQuestions": None}
        
        await update_document_status(document_id, {
            "status": "INDEXED", 
            "currentStep": "Complete", 
            "progress": 100,
            "chunkCount": len(chunks),
            "embeddingModel": f"provider: {provider}, dim: {dim}",
            "summary": summary_data.get("summary"),
            "suggestedQuestions": summary_data.get("suggestedQuestions")
        })
        
    except Exception as e:
        logger.error(f"Pipeline failed for {document_id}: {e}", exc_info=True)
        await update_document_status(document_id, {
            "status": "ERROR", 
            "errorMessage": str(e)
        })
    finally:
        if local_path and os.path.exists(local_path):
            try:
                os.remove(local_path)
            except Exception:
                pass
