from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application configuration settings."""

    app_name: str = "Serenity"
    environment: str = "development"
    debug: bool = True

    # Database configuration
    database_url: Optional[str] = None
    secret_key: str = "dev-secret-key-change-in-production"

    # Supabase configuration
    supabase_url: Optional[str] = None
    supabase_anon_key: Optional[str] = None
    supabase_service_role_key: Optional[str] = None

    # Engine selection
    emotion_provider: str = "gemini"
    emotion_fallback: str = "keywords"
    llm_provider: str = "gemini"
    llm_fallback: str = "fallback"
    crisis_provider: str = "keywords"
    crisis_fallback: str = "keywords"

    # Gemini settings (OpenAI-compatible endpoint)
    gemini_endpoint: str = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
    gemini_api_key: Optional[str] = None
    gemini_model: str = "gemini-2.5-flash"
    gemini_max_tokens: int = 2000

    # Ollama Cloud settings (OpenAI-compatible endpoint)
    ollama_endpoint: str = "https://ollama.com/v1/chat/completions"
    ollama_api_key: Optional[str] = None
    ollama_model: str = "gpt-oss:120b"
    ollama_max_tokens: int = 2000
    
    # Kokoro TTS
    kokoro_url: Optional[str] = None
    kokoro_voice: str = "af_heart"

    # CORS
    cors_origins: list = ["http://localhost:5173", "http://localhost:3000"]
    
    # Engine monitoring
    engine_health_check: bool = True
    engine_log_switches: bool = True

    # Reliability workstreams (all OFF by default)
    feature_semantic_blended_retrieval: bool = False
    feature_adaptive_memory_weighting: bool = False
    feature_memory_request_budget: bool = False
    feature_journal_delta_extraction: bool = False
    feature_goal_readiness_tuning: bool = False
    feature_async_context_refresh: bool = False

    # Semantic retrieval tuning
    memory_semantic_similarity_weight: float = 0.75
    memory_freshness_weight: float = 0.25
    memory_recent_days: int = 7
    memory_recent_channel_limit: int = 2
    memory_stable_channel_limit: int = 2

    # Adaptive weighting thresholds
    memory_high_volatility_threshold: float = 0.35
    memory_low_volatility_threshold: float = 0.15

    # Request budget and tier controls
    memory_request_budget_ms: int = 120
    memory_tier2_candidate_limit: int = 50
    memory_tier2_hard_limit: int = 3
    memory_refresh_jitter_ms: int = 250
    memory_refresh_queue_max_depth: int = 100

    # Journal delta extraction tuning
    journal_delta_novelty_threshold: float = 0.20
    journal_weekly_top_changes_limit: int = 5

    # Goal readiness tuning bounds
    goal_readiness_min_intensity_multiplier: float = 0.80
    goal_readiness_max_intensity_multiplier: float = 1.20
    goal_readiness_min_load_multiplier: float = 0.85
    goal_readiness_max_load_multiplier: float = 1.15
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"


settings = Settings()
