from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """
    Application configuration settings.
    """
    
    app_name: str = "Serenity"
    environment: str = "development"
    debug: bool = True
    
    database_url: Optional[str] = None
    secret_key: str = "dev-secret-key-change-in-production"
    
    ollama_endpoint: Optional[str] = "https://ollama.com/v1/chat/completions"
    ollama_api_key: Optional[str] = None
    ollama_model: Optional[str] = "gpt-oss:120b-cloud"
    ollama_max_tokens: Optional[int] = 256
    
    cors_origins: list = ["http://localhost:5173", "http://localhost:3000"]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"


settings = Settings()
