"""
Security, API Key Masking, and Encryption Utilities.
Ensures API keys are never exposed in logs, API responses, or version control.
"""

import base64
import hashlib
from typing import Optional
from cryptography.fernet import Fernet
from app.config import settings


def _get_fernet() -> Fernet:
    """Derive a stable 32-byte Fernet key from SECRET_KEY."""
    derived = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
    b64_key = base64.urlsafe_b64encode(derived)
    return Fernet(b64_key)


def encrypt_secret(plain_text: str) -> str:
    """Encrypt a sensitive secret string."""
    if not plain_text:
        return ""
    f = _get_fernet()
    return f.encrypt(plain_text.encode()).decode()


def decrypt_secret(cipher_text: str) -> str:
    """Decrypt an encrypted secret string."""
    if not cipher_text:
        return ""
    try:
        f = _get_fernet()
        return f.decrypt(cipher_text.encode()).decode()
    except Exception:
        return ""


def mask_api_key(key: Optional[str]) -> Optional[str]:
    """
    Mask an API key for safe display in frontend interfaces.
    Example: 'sk-proj-1234567890abcdef' -> 'sk-...cdef'
    """
    if not key or len(key.strip()) == 0:
        return None

    stripped = key.strip()
    if len(stripped) <= 8:
        return "••••••••"

    prefix = stripped[:3]
    suffix = stripped[-4:]
    return f"{prefix}...{suffix}"

