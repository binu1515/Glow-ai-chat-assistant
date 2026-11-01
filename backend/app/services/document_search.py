"""
Document Search Helper.
Splits text files into passages and scores relevance based on query terms.
"""

import os
import re
from typing import Any, Dict, List, Optional

from app.config import settings


def _tokenize(text: str) -> List[str]:
    """Tokenize and lowercase text, stripping punctuation."""
    return re.findall(r"\b[a-zA-Z0-9_]{2,}\b", text.lower())


def _chunk_text(text: str, chunk_size: int = 150, overlap: int = 30) -> List[str]:
    """Split text into overlapping word chunks."""
    words = text.split()
    if len(words) <= chunk_size:
        return [text]

    chunks = []
    i = 0
    while i < len(words):
        chunk = " ".join(words[i : i + chunk_size])
        chunks.append(chunk)
        i += chunk_size - overlap
    return chunks


def search_uploaded_documents(
    query: str,
    doc_filter: Optional[str] = None,
    top_k: int = 3,
    docs_dir: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Search documents in target directory for the query.
    Calculates coverage and term frequency relevance score.
    """
    target_dir = docs_dir or settings.DOCUMENTS_DIR
    if not os.path.exists(target_dir):
        os.makedirs(target_dir, exist_ok=True)

    files = [
        f for f in os.listdir(target_dir)
        if os.path.isfile(os.path.join(target_dir, f)) and not f.startswith(".")
    ]

    if not files:
        return {
            "total_documents": 0,
            "results": [],
            "message": "No documents uploaded yet. Please upload documents (.txt, .md, .json) to search them.",
        }

    query_tokens = _tokenize(query)
    if not query_tokens:
        return {
            "total_documents": len(files),
            "results": [],
            "message": "Query must contain valid alphanumeric terms.",
        }

    scored_chunks: List[Dict[str, Any]] = []

    for filename in files:
        if doc_filter and doc_filter.lower() not in filename.lower():
            continue

        file_path = os.path.join(target_dir, filename)
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
        except Exception:
            continue

        chunks = _chunk_text(content)
        for idx, chunk in enumerate(chunks):
            chunk_tokens = _tokenize(chunk)
            if not chunk_tokens:
                continue

            chunk_len = len(chunk_tokens)
            term_matches = sum(chunk_tokens.count(t) for t in query_tokens)
            unique_matches = sum(1 for t in query_tokens if t in chunk_tokens)

            if term_matches == 0:
                continue

            coverage = unique_matches / len(query_tokens)
            tf = term_matches / (chunk_len + 10)
            score = round((coverage * 0.7 + tf * 0.3) * 100, 2)

            scored_chunks.append({
                "document": filename,
                "chunk_index": idx + 1,
                "score": score,
                "snippet": chunk.strip(),
            })

    scored_chunks.sort(key=lambda x: x["score"], reverse=True)
    top_results = scored_chunks[:top_k]

    return {
        "query": query,
        "total_documents": len(files),
        "matches_found": len(scored_chunks),
        "results": top_results,
    }


def format_search_results(results_data: Dict[str, Any]) -> str:
    """Format search output into a clear response string for the LLM."""
    if results_data.get("message"):
        return results_data["message"]

    results = results_data.get("results", [])
    if not results:
        return f"No relevant passages found for query '{results_data.get('query')}'. Total searchable docs: {results_data.get('total_documents')}."

    formatted = [f"Found {len(results)} matching passage(s) for query: '{results_data.get('query')}':\n"]
    for i, res in enumerate(results, 1):
        formatted.append(
            f"--- [Result {i}] Document: {res['document']} (Chunk {res['chunk_index']}, Relevance: {res['score']}%) ---\n"
            f"{res['snippet']}\n"
        )
    return "\n".join(formatted)

