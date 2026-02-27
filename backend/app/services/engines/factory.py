import logging
import os
from typing import List, Optional
from app.services.engines.base import EmotionEngine, LLMEngine, CrisisEngine
from app.services.engines.emotion.keywords import KeywordEmotionEngine
from app.services.engines.emotion.ollama import OllamaEmotionEngine
from app.services.engines.llm.ollama import OllamaLLMEngine
from app.services.engines.llm.fallback import FallbackLLMEngine
from app.services.engines.crisis.keywords import KeywordCrisisEngine
from app.services.engines.crisis.ollama import OllamaCrisisEngine

logger = logging.getLogger(__name__)

emotion_engine: Optional[EmotionEngine] = None
llm_engine: Optional[LLMEngine] = None
crisis_engine: Optional[CrisisEngine] = None


class EngineFactory:
    """Manage AI engine lifecycle and fallback chains."""
    
    @staticmethod
    def create_emotion_engine(provider: str) -> EmotionEngine:
        """Create emotion engine by provider name."""
        if provider == 'keywords':
            return KeywordEmotionEngine()
        elif provider == 'ollama':
            return OllamaEmotionEngine()
        else:
            logger.warning(f"Unknown emotion provider: {provider}, using keywords")
            return KeywordEmotionEngine()
    
    @staticmethod
    async def get_emotion_engine_with_fallback(
        preferred: str,
        fallback_chain: List[str] = None
    ) -> EmotionEngine:
        """Get emotion engine with automatic fallback."""
        if fallback_chain is None:
            fallback_chain = os.getenv('EMOTION_FALLBACK', 'keywords').split(',')
            fallback_chain = [f.strip() for f in fallback_chain]
        
        chain = [preferred] + fallback_chain
        
        for provider in chain:
            try:
                engine = EngineFactory.create_emotion_engine(provider)
                if engine.is_available:
                    logger.info(f"✓ Using emotion engine: {provider}")
                    return engine
            except Exception as e:
                logger.warning(f"✗ {provider} emotion engine failed: {e}")
                continue
        
        logger.warning("All emotion engines failed, using keywords fallback")
        return KeywordEmotionEngine()
    
    @staticmethod
    def create_llm_engine(provider: str) -> LLMEngine:
        """Create LLM engine by provider name."""
        if provider == 'ollama':
            return OllamaLLMEngine()
        elif provider == 'fallback':
            return FallbackLLMEngine()
        else:
            logger.warning(f"Unknown LLM provider: {provider}, using fallback")
            return FallbackLLMEngine()
    
    @staticmethod
    async def get_llm_engine_with_fallback(
        preferred: str,
        fallback_chain: List[str] = None
    ) -> LLMEngine:
        """Get LLM engine with automatic fallback."""
        if fallback_chain is None:
            fallback_chain = os.getenv('LLM_FALLBACK', 'fallback').split(',')
            fallback_chain = [f.strip() for f in fallback_chain]
        
        chain = [preferred] + fallback_chain
        
        for provider in chain:
            try:
                engine = EngineFactory.create_llm_engine(provider)
                if engine.is_available:
                    logger.info(f"✓ Using LLM engine: {provider}")
                    return engine
            except Exception as e:
                logger.warning(f"✗ {provider} LLM engine failed: {e}")
                continue
        
        logger.warning("All LLM engines failed, using fallback")
        return FallbackLLMEngine()
    
    @staticmethod
    def create_crisis_engine(provider: str) -> CrisisEngine:
        """Create crisis engine by provider name."""
        if provider == 'keywords':
            return KeywordCrisisEngine()
        elif provider == 'ollama':
            return OllamaCrisisEngine()
        else:
            logger.warning(f"Unknown crisis provider: {provider}, using keywords")
            return KeywordCrisisEngine()
    
    @staticmethod
    async def get_crisis_engine_with_fallback(
        preferred: str,
        fallback_chain: List[str] = None
    ) -> CrisisEngine:
        """Get crisis engine with automatic fallback."""
        if fallback_chain is None:
            fallback_chain = os.getenv('CRISIS_FALLBACK', 'keywords').split(',')
            fallback_chain = [f.strip() for f in fallback_chain]
        
        chain = [preferred] + fallback_chain
        
        for provider in chain:
            try:
                engine = EngineFactory.create_crisis_engine(provider)
                if engine.is_available:
                    logger.info(f"✓ Using crisis engine: {provider}")
                    return engine
            except Exception as e:
                logger.warning(f"✗ {provider} crisis engine failed: {e}")
                continue
        
        logger.warning("All crisis engines failed, using keywords fallback")
        return KeywordCrisisEngine()


async def init_engines():
    """Initialize all engines at app startup."""
    global emotion_engine, llm_engine, crisis_engine
    
    logger.info("Initializing AI engines...")
    
    emotion_provider = os.getenv('EMOTION_PROVIDER', 'keywords')
    emotion_engine = await EngineFactory.get_emotion_engine_with_fallback(emotion_provider)
    
    llm_provider = os.getenv('LLM_PROVIDER', 'ollama')
    llm_engine = await EngineFactory.get_llm_engine_with_fallback(llm_provider)
    
    crisis_provider = os.getenv('CRISIS_PROVIDER', 'keywords')
    crisis_engine = await EngineFactory.get_crisis_engine_with_fallback(crisis_provider)
    
    logger.info("✓ All engines initialized successfully")


def get_emotion_engine() -> EmotionEngine:
    """Get initialized emotion engine."""
    if emotion_engine is None:
        raise RuntimeError("Emotion engine not initialized. Call init_engines() at startup.")
    return emotion_engine


def get_llm_engine() -> LLMEngine:
    """Get initialized LLM engine."""
    if llm_engine is None:
        raise RuntimeError("LLM engine not initialized. Call init_engines() at startup.")
    return llm_engine


def get_crisis_engine() -> CrisisEngine:
    """Get initialized crisis engine."""
    if crisis_engine is None:
        raise RuntimeError("Crisis engine not initialized. Call init_engines() at startup.")
    return crisis_engine
