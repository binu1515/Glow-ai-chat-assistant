"""
Uploaded Document Metadata Model.
"""

from datetime import datetime
import uuid
from sqlalchemy import Column, DateTime, Integer, String
from app.database import Base


class UploadedDocument(Base):
    __tablename__ = "uploaded_documents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    filename = Column(String(255), nullable=False, unique=True)
    file_size_bytes = Column(Integer, nullable=False)
    chunk_count = Column(Integer, default=1, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)

