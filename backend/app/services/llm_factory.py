"""
LLM Factory and Model Pricing Catalog.
Dynamically instantiates LangChain chat models based on provider, model, and credentials.
Maintains model cost tables for real-time token expense tracking.
"""

import logging
from typing import Any, Dict, List, Optional
from langchain_core.language_models.chat_models import BaseChatModel
from app.config import settings

logger = logging.getLogger(__name__)

# Model pricing in USD per 1,000,000 tokens (Prompt, Completion)
MODEL_PRICING = {
    # Gemini models
    "gemini-2.5-flash-lite": {"input": 0.05, "output": 0.20, "context": 1048576, "name": "Gemini 2.5 Flash Lite", "provider": "gemini"},
    "gemini-flash-lite-latest": {"input": 0.05, "output": 0.20, "context": 1048576, "name": "Gemini Flash Lite (Latest)", "provider": "gemini"},
    "gemini-3.5-flash-lite": {"input": 0.05, "output": 0.20, "context": 1048576, "name": "Gemini 3.5 Flash Lite", "provider": "gemini"},
    "gemini-3.8-flash": {"input": 0.075, "output": 0.30, "context": 1048576, "name": "Gemini 3.8 Flash", "provider": "gemini"},
    "gemini-3.5-flash": {"input": 0.075, "output": 0.30, "context": 1048576, "name": "Gemini 3.5 Flash", "provider": "gemini"},
    "gemini-2.5-flash": {"input": 0.15, "output": 0.60, "context": 1048576, "name": "Gemini 2.5 Flash", "provider": "gemini"},
    "gemini-1.5-flash": {"input": 0.075, "output": 0.30, "context": 1048576, "name": "Gemini 1.5 Flash", "provider": "gemini"},
    "gemini-1.5-pro": {"input": 1.25, "output": 5.00, "context": 2097152, "name": "Gemini 1.5 Pro", "provider": "gemini"},
    "gemini-2.0-flash": {"input": 0.10, "output": 0.40, "context": 1048576, "name": "Gemini 2.0 Flash", "provider": "gemini"},
    "gemini-2.5-flash": {"input": 0.15, "output": 0.60, "context": 1048576, "name": "Gemini 2.5 Flash", "provider": "gemini"},

    # OpenAI models
    "gpt-4o": {"input": 2.50, "output": 10.00, "context": 128000, "name": "GPT-4o", "provider": "openai"},
    "gpt-4o-mini": {"input": 0.15, "output": 0.60, "context": 128000, "name": "GPT-4o Mini", "provider": "openai"},
    "gpt-4-turbo": {"input": 10.00, "output": 30.00, "context": 128000, "name": "GPT-4 Turbo", "provider": "openai"},
    "gpt-3.5-turbo": {"input": 0.50, "output": 1.50, "context": 16385, "name": "GPT-3.5 Turbo", "provider": "openai"},

    # OpenRouter models
    "openai/gpt-4o": {"input": 2.50, "output": 10.00, "context": 128000, "name": "GPT-4o (OpenRouter)", "provider": "openrouter"},
    "openai/gpt-4o-mini": {"input": 0.15, "output": 0.60, "context": 128000, "name": "GPT-4o Mini (OpenRouter)", "provider": "openrouter"},
    "anthropic/claude-3.5-sonnet": {"input": 3.00, "output": 15.00, "context": 200000, "name": "Claude 3.5 Sonnet (OpenRouter)", "provider": "openrouter"},
    "meta-llama/llama-3.3-70b-instruct": {"input": 0.35, "output": 0.40, "context": 128000, "name": "Llama 3.3 70B (OpenRouter)", "provider": "openrouter"},
    "deepseek/deepseek-chat": {"input": 0.14, "output": 0.28, "context": 64000, "name": "DeepSeek V3 (OpenRouter)", "provider": "openrouter"},
    "google/gemini-2.0-flash-001": {"input": 0.10, "output": 0.40, "context": 1048576, "name": "Gemini 2.0 Flash (OpenRouter)", "provider": "openrouter"},

    # Anthropic models
    "claude-3-5-sonnet-20241022": {"input": 3.00, "output": 15.00, "context": 200000, "name": "Claude 3.5 Sonnet", "provider": "anthropic"},
    "claude-3-5-haiku-20241022": {"input": 0.80, "output": 4.00, "context": 200000, "name": "Claude 3.5 Haiku", "provider": "anthropic"},
    "claude-3-opus-20240229": {"input": 15.00, "output": 75.00, "context": 200000, "name": "Claude 3 Opus", "provider": "anthropic"},
}

DEFAULT_FALLBACK_PRICING = {"input": 0.50, "output": 1.50}


def get_supported_providers_catalog() -> List[Dict[str, Any]]:
    """Return catalog of supported providers and models with metadata."""
    grouped: Dict[str, List[Dict[str, Any]]] = {}
    for model_id, info in MODEL_PRICING.items():
        prov = info["provider"]
        if prov not in grouped:
            grouped[prov] = []
        grouped[prov].append({
            "id": model_id,
            "name": info["name"],
            "context_window": info["context"],
            "input_cost_per_million": info["input"],
            "output_cost_per_million": info["output"],
            "recommended": "flash" in model_id or "mini" in model_id,
        })

    provider_names = {
        "openrouter": "OpenRouter",
        "gemini": "Google Gemini",
        "openai": "OpenAI",
        "anthropic": "Anthropic Claude",
    }

    return [
        {
            "id": p_id,
            "name": provider_names.get(p_id, p_id.title()),
            "models": models,
        }
        for p_id, models in grouped.items()
    ]


def calculate_cost(model_name: str, prompt_tokens: int, completion_tokens: int) -> float:
    """Calculate estimated cost in USD based on model pricing table."""
    pricing = MODEL_PRICING.get(model_name.lower(), DEFAULT_FALLBACK_PRICING)
    input_cost = (prompt_tokens / 1_000_000.0) * pricing["input"]
    output_cost = (completion_tokens / 1_000_000.0) * pricing["output"]
    return round(input_cost + output_cost, 6)


class LLMFactory:
    """Factory to instantiate LangChain LLM instances dynamically."""

    @staticmethod
    def create_chat_model(
        provider: str,
        model: str,
        api_key: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        streaming: bool = True,
    ) -> BaseChatModel:
        """Instantiate configured LLM provider model with parameters."""
        prov = provider.lower()

        if prov in ("gemini", "google"):
            # Automatically upgrade deprecated Gemini model identifiers to the supported lite model
            if model in ("gemini-2.5-flash-lite", "gemini-1.5-flash", "gemini-2.5-flash"):
                model = "gemini-3.5-flash-lite"

            from langchain_google_genai import ChatGoogleGenerativeAI
            key = api_key or settings.GOOGLE_API_KEY
            if not key:
                raise ValueError("Google Gemini API Key is required. Please configure it in Model Settings.")
            return ChatGoogleGenerativeAI(
                model=model,
                google_api_key=key,
                temperature=temperature,
                max_output_tokens=max_tokens,
                streaming=streaming,
            )

        elif prov == "openai":
            from langchain_openai import ChatOpenAI
            key = api_key or settings.OPENAI_API_KEY
            if not key:
                raise ValueError("OpenAI API Key is required. Please configure it in Model Settings.")
            return ChatOpenAI(
                model=model,
                api_key=key,
                temperature=temperature,
                max_tokens=max_tokens,
                streaming=streaming,
            )

        elif prov == "anthropic":
            from langchain_anthropic import ChatAnthropic
            key = api_key or settings.ANTHROPIC_API_KEY
            if not key:
                raise ValueError("Anthropic API Key is required. Please configure it in Model Settings.")
            return ChatAnthropic(
                model=model,
                api_key=key,
                temperature=temperature,
                max_tokens=max_tokens,
                streaming=streaming,
            )

        elif prov == "openrouter":
            from langchain_openai import ChatOpenAI
            key = api_key or settings.OPENROUTER_API_KEY
            if not key:
                raise ValueError("OpenRouter API Key is required. Please configure it in Model Settings.")
            return ChatOpenAI(
                model=model,
                api_key=key,
                base_url="https://openrouter.ai/api/v1",
                temperature=temperature,
                max_tokens=max_tokens,
                streaming=streaming,
            )

        else:
            raise ValueError(f"Unsupported LLM provider: '{provider}'. Supported: openrouter, gemini, openai, anthropic")

