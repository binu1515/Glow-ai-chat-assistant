"""
Document Management and Search API Router.
Handles document uploads, indexing metadata, and direct semantic/keyword document querying.
Automatically invalidates document search cache upon document upload or removal.
"""

import os
from typing import List, Optional
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.document import UploadedDocument
from app.schemas.document import (
    DocumentItem,
    DocumentListResponse,
    SearchDocumentRequest,
    SearchDocumentResponse,
    SearchDocumentResult,
)
from app.services.redis_cache import cache_service
from app.services.document_search import search_uploaded_documents

router = APIRouter(prefix="/api/documents", tags=["Documents"])


@router.get("", response_model=DocumentListResponse)
async def list_documents(db: AsyncSession = Depends(get_db)):
    """List all documents currently available for document search tool retrieval."""
    stmt = select(UploadedDocument).order_by(UploadedDocument.uploaded_at.desc())
    res = await db.execute(stmt)
    docs = res.scalars().all()
    return DocumentListResponse(
        documents=[DocumentItem.model_validate(d) for d in docs],
        total_count=len(docs),
    )


@router.post("/upload", response_model=DocumentItem)
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a text, markdown, or json document for the MCP Document Search tool.
    Invalidates document search cache so new documents are immediately indexed.
    """
    filename = file.filename
    if not filename or not any(filename.lower().endswith(ext) for ext in [".txt", ".md", ".json", ".csv", ".log", ".py"]):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Please upload a plain text file (.txt, .md, .json, .csv).",
        )

    os.makedirs(settings.DOCUMENTS_DIR, exist_ok=True)
    target_path = os.path.join(settings.DOCUMENTS_DIR, filename)

    content_bytes = await file.read()
    file_size = len(content_bytes)

    # Save file to disk
    with open(target_path, "wb") as f:
        f.write(content_bytes)

    # Calculate rough chunk count
    text_content = content_bytes.decode("utf-8", errors="ignore")
    words = text_content.split()
    chunk_count = max(1, len(words) // 120)

    # Upsert in database
    stmt = select(UploadedDocument).where(UploadedDocument.filename == filename)
    res = await db.execute(stmt)
    existing = res.scalar_one_or_none()

    if existing:
        existing.file_size_bytes = file_size
        existing.chunk_count = chunk_count
        doc_record = existing
    else:
        doc_record = UploadedDocument(
            filename=filename,
            file_size_bytes=file_size,
            chunk_count=chunk_count,
        )
        db.add(doc_record)

    await db.commit()
    await db.refresh(doc_record)

    # Invalidate document search cache
    await cache_service.invalidate("cache:doc_search:*")

    return DocumentItem.model_validate(doc_record)


@router.delete("/{document_id}")
async def delete_document(document_id: str, db: AsyncSession = Depends(get_db)):
    """Delete an uploaded document from disk and database."""
    stmt = select(UploadedDocument).where(UploadedDocument.id == document_id)
    res = await db.execute(stmt)
    doc = res.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    file_path = os.path.join(settings.DOCUMENTS_DIR, doc.filename)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception:
            pass

    await db.delete(doc)
    await db.commit()

    # Invalidate document cache
    await cache_service.invalidate("cache:doc_search:*")

    return {"status": "success", "message": f"Deleted document {doc.filename}"}


@router.post("/search", response_model=SearchDocumentResponse)
async def test_search_documents(request: SearchDocumentRequest):
    """Direct search endpoint with Redis caching."""
    q_norm = request.query.strip().lower()
    doc_norm = (request.doc_name or "*").strip().lower()
    cache_key = f"cache:doc_search:{q_norm}:{doc_norm}"

    # Check cache
    cached_val = await cache_service.get(cache_key)
    if cached_val:
        import json
        try:
            parsed = json.loads(cached_val)
            parsed["cached"] = True
            return SearchDocumentResponse(**parsed)
        except Exception:
            pass

    # Search documents
    data = search_uploaded_documents(
        query=request.query,
        doc_filter=request.doc_name,
        top_k=request.top_k,
        docs_dir=settings.DOCUMENTS_DIR,
    )

    results_dto = [
        SearchDocumentResult(
            document=r["document"],
            chunk_index=r["chunk_index"],
            score=r["score"],
            snippet=r["snippet"],
        )
        for r in data.get("results", [])
    ]

    response = SearchDocumentResponse(
        query=request.query,
        total_documents=data.get("total_documents", 0),
        matches_found=data.get("matches_found", 0),
        results=results_dto,
        cached=False,
    )

    # Cache result
    import json
    await cache_service.set(
        cache_key,
        response.model_dump_json(),
        ttl_seconds=settings.DOC_CACHE_TTL,
    )

    return response

