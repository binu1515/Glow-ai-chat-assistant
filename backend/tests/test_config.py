"""
Unit Tests for Security and API Key Masking.
"""

import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.security import encrypt_secret, decrypt_secret, mask_api_key


def test_encryption_and_decryption():
    secret = "sk-proj-super-secret-api-key-12345"
    encrypted = encrypt_secret(secret)

    assert encrypted != secret
    assert len(encrypted) > 10

    decrypted = decrypt_secret(encrypted)
    assert decrypted == secret


def test_api_key_masking():
    assert mask_api_key(None) is None
    assert mask_api_key("") is None
    assert mask_api_key("12345") == "••••••••"
    masked = mask_api_key("sk-proj-1234567890abcdef")
    assert masked == "sk-...cdef"
    assert "1234567890" not in masked

