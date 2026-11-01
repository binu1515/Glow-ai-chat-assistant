"""
Pydantic Schemas for Document Uploads and Searches.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict


class DocumentItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    filename: str
    file_size_bytes: int
    chunk_count: int
    uploaded_at: datetime


class DocumentListResponse(BaseModel):
    documents: List[DocumentItem]
    total_count: int


class SearchDocumentRequest(BaseModel):
    query: str
    doc_name: Optional[str] = None
    top_k: int = 3


class SearchDocumentResult(BaseModel):
    document: str
    chunk_index: int
    score: float
    snippet: str


class SearchDocumentResponse(BaseModel):
    query: str
    total_documents: int
    matches_found: int
    results: List[SearchDocumentResult]
    cached: bool = False
