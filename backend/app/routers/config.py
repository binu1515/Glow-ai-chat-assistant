"""
Model Configuration and API Key Management Router.
Allows changing LLM providers, models, temperatures, and managing encrypted credentials.
Strictly masks API keys to prevent credential exposure.
"""

import json
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.config_setting import ConfigSetting
from app.schemas.config import (
    ActiveModelConfig,
    ConfigResponse,
    ModelInfo,
    ProviderInfo,
    UpdateConfigRequest,
)
from app.services.llm_factory import get_supported_providers_catalog
from app.services.security import decrypt_secret, encrypt_secret, mask_api_key

router = APIRouter(prefix="/api/config", tags=["Configuration"])


async def _load_active_config(db: AsyncSession) -> ActiveModelConfig:
    """Load active configuration from database or defaults."""
    stmt = select(ConfigSetting).where(ConfigSetting.id == "active_config")
    res = await db.execute(stmt)
    setting = res.scalar_one_or_none()
    if setting and setting.value:
        try:
            data = json.loads(setting.value)
            return ActiveModelConfig(**data)
        except Exception:
            pass
    return ActiveModelConfig(
        provider=settings.DEFAULT_PROVIDER,
        model=settings.DEFAULT_MODEL,
        temperature=settings.DEFAULT_TEMPERATURE,
        max_tokens=settings.DEFAULT_MAX_TOKENS,
        memory_window=settings.DEFAULT_MEMORY_WINDOW,
    )


async def _get_decrypted_key(db: AsyncSession, provider: str) -> Optional[str]:
    """Retrieve raw key for internal use or server env fallback."""
    stmt = select(ConfigSetting).where(ConfigSetting.id == f"api_key_{provider.lower()}")
    res = await db.execute(stmt)
    setting = res.scalar_one_or_none()
    if setting and setting.value:
        dec = decrypt_secret(setting.value)
        if dec:
            return dec

    prov = provider.lower()
    if prov == "openrouter":
        return settings.OPENROUTER_API_KEY
    elif prov in ("gemini", "google"):
        return settings.GOOGLE_API_KEY
    elif prov == "openai":
        return settings.OPENAI_API_KEY
    elif prov == "anthropic":
        return settings.ANTHROPIC_API_KEY
    elif prov == "groq":
        return settings.GROQ_API_KEY
    return None


@router.get("", response_model=ConfigResponse)
async def get_config(db: AsyncSession = Depends(get_db)):
    """Retrieve active AI model parameters and provider catalogs with masked keys."""
    active_cfg = await _load_active_config(db)
    raw_catalog = get_supported_providers_catalog()

    providers_info: List[ProviderInfo] = []
    for prov in raw_catalog:
        p_id = prov["id"]
        key = await _get_decrypted_key(db, p_id)
        has_key = bool(key and len(key.strip()) > 0)
        masked = mask_api_key(key) if has_key else None

        models = [ModelInfo(**m) for m in prov["models"]]
        providers_info.append(
            ProviderInfo(
                id=p_id,
                name=prov["name"],
                models=models,
                has_api_key=has_key,
                masked_key=masked,
            )
        )

    return ConfigResponse(
        active_config=active_cfg,
        providers=providers_info,
    )


@router.post("", response_model=ConfigResponse)
async def update_config(
    request: UpdateConfigRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Update active model settings and securely store encrypted API keys.
    API keys are encrypted at rest and never returned in plain text.
    """
    active_cfg = await _load_active_config(db)

    # Update parameters if provided
    if request.provider is not None:
        active_cfg.provider = request.provider
    if request.model is not None:
        active_cfg.model = request.model
    if request.temperature is not None:
        active_cfg.temperature = request.temperature
    if request.max_tokens is not None:
        active_cfg.max_tokens = request.max_tokens
    if request.system_prompt is not None:
        active_cfg.system_prompt = request.system_prompt
    if request.memory_window is not None:
        active_cfg.memory_window = request.memory_window

    # Persist updated active config
    stmt = select(ConfigSetting).where(ConfigSetting.id == "active_config")
    res = await db.execute(stmt)
    setting = res.scalar_one_or_none()
    if not setting:
        setting = ConfigSetting(id="active_config", value=active_cfg.model_dump_json())
        db.add(setting)
    else:
        setting.value = active_cfg.model_dump_json()

    # Save any new encrypted API keys
    if request.api_keys:
        for prov, raw_key in request.api_keys.items():
            if raw_key and raw_key.strip():
                encrypted_key = encrypt_secret(raw_key.strip())
                key_id = f"api_key_{prov.lower()}"
                k_stmt = select(ConfigSetting).where(ConfigSetting.id == key_id)
                k_res = await db.execute(k_stmt)
                k_setting = k_res.scalar_one_or_none()
                if not k_setting:
                    k_setting = ConfigSetting(id=key_id, value=encrypted_key)
                    db.add(k_setting)
                else:
                    k_setting.value = encrypted_key

    await db.commit()
    return await get_config(db)

