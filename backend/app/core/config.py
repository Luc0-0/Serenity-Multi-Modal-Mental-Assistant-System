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
    ollama_endpoint: Optional[str] = None
    ollama_api_key: Optional[str] = None
    ollama_model: str = "openai/gpt-4o"
    ollama_max_tokens: int = 2000
    
    # Kokoro TTS
    kokoro_url: Optional[str] = None
    kokoro_voice: str = "af_heart"

    # CORS
    cors_origins: list = ["http://localhost:5173", "http://localhost:3000"]
    
    # Engine monitoring
    engine_health_check: bool = True
    engine_log_switches: bool = True
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"


settings = Settings()
