"""
Configuration Setting Model.
Stores active model configurations and encrypted provider settings in the database.
"""

from datetime import datetime
from sqlalchemy import Column, DateTime, String, Text
from app.database import Base


class ConfigSetting(Base):
    __tablename__ = "config_settings"

    id = Column(String(50), primary_key=True)  # e.g., 'active_model_config'
    value = Column(Text, nullable=False)        # JSON string of settings
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

