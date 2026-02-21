import logging
import asyncio
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.conversation_service import ConversationService
from app.services.ollama_service import OllamaService
from app.services.emotion_service import EmotionService
from app.services.journal_service import JournalService
from app.services.crisis_service import CrisisService
from app.services.emotion_analytics_service import EmotionAnalyticsService
from app.services.context_manager import ContextManager
from app.db.session import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])

conversation_service = ConversationService()
ollama_service = OllamaService()
emotion_service = EmotionService()
journal_service = JournalService()
crisis_service = CrisisService()
emotion_analytics_service = EmotionAnalyticsService()
context_manager = ContextManager()


@router.post("/", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest, db: AsyncSession = Depends(get_db)):
    
    try:
        if request.conversation_id is None:
            conversation_id = await conversation_service.create_conversation(db, request.user_id)
        else:
            owns_conversation = await conversation_service.validate_conversation_ownership(
                db, request.user_id, request.conversation_id
            )
            if not owns_conversation:
                raise HTTPException(status_code=403, detail=f"User does not own conversation {request.conversation_id}")
            conversation_id = request.conversation_id
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    crisis_assessment = await crisis_service.assess_threat(
        message=request.message,
        emotion_label=None,  # Detection pending
        conversation_history=None,  # Retrieval pending
        user_id=request.user_id
    )
    
    if crisis_assessment["requires_escalation"]:
        user_message_id = await conversation_service.save_message(
            db, conversation_id, "user", request.message
        )
        try:
            emotion = await emotion_service.detect_emotion(request.message)
            await emotion_service.log_emotion(
                db=db, user_id=request.user_id, conversation_id=conversation_id,
                message_id=user_message_id, label=emotion["label"],
                confidence=emotion["confidence"]
            )
        except Exception as e:
            print(f"✗ Failed to log emotion in crisis response: {str(e)}")
        try:
            await crisis_service.log_crisis_event(
                db=db, user_id=request.user_id, conversation_id=conversation_id,
                message_id=user_message_id, assessment=crisis_assessment
            )
        except Exception as e:
            print(f"✗ Failed to log crisis event: {str(e)}")
        await db.commit()
        return ChatResponse(
            reply=crisis_assessment["response"],
            conversation_id=conversation_id,
            message_id=user_message_id,
            crisis_detected=True,
            crisis_severity=crisis_assessment["severity"],
            resources=crisis_assessment["resources"]
        )
    history = await context_manager.get_optimized_history(
        db, conversation_id
    )
    user_message_id = await conversation_service.save_message(
        db, conversation_id, "user", request.message
    )
    await db.commit()
    
    if request.conversation_id is None:
        try:
            title = await ollama_service.generate_conversation_title(request.message)
            await conversation_service.update_conversation_title(db, conversation_id, title)
        except Exception as e:
            logger.warning(f"Failed to generate title: {str(e)}")
    
    emotion = {"label": "neutral", "confidence": 0.5}
    try:
        emotion = await emotion_service.detect_emotion(request.message)
        await emotion_service.log_emotion(
            db=db, user_id=request.user_id, conversation_id=conversation_id,
            message_id=user_message_id, label=emotion["label"],
            confidence=emotion["confidence"]
        )
    except Exception as e:
        print(f"✗ Failed to log emotion: {str(e)}")
    
    # AI-based journal extraction (analyze last 5-10 messages)
    try:
        should_extract, ai_summary, confidence = await journal_service.should_create_entry_ai(
            ollama_service=ollama_service,
            conversation_history=history,
            user_message=request.message,
            emotion_label=emotion["label"]
        )
        
        # Only extract if confidence is acceptable
        if should_extract and confidence > 0.5:
            await journal_service.create_entry(
                db=db, user_id=request.user_id, conversation_id=conversation_id,
                message_id=user_message_id, message_text=request.message,
                emotion_label=emotion["label"],
                ai_summary=ai_summary,
                ai_confidence=confidence,
                extraction_method="ai"
            )
            logger.info(f"[JOURNAL] Extracted entry with confidence {confidence:.2f}")
        else:
            logger.debug(f"[JOURNAL] Skipped extraction: extract={should_extract}, confidence={confidence:.2f}")
    except Exception as e:
        logger.warning(f"✗ Failed to create journal entry (AI extraction): {str(e)}")
        import traceback
        logger.warning(traceback.format_exc())
    
    try:
        insight = await emotion_analytics_service.generate_user_insights(
            db=db, user_id=request.user_id, days=7
        )
        logger.info(
            f"[INSIGHT] user={request.user_id} | "
            f"emotion={insight.dominant_emotion} ({insight.dominance_pct:.0%}) | "
            f"trend={insight.trend} | "
            f"volatility={insight.volatility_flag} | "
            f"high_risk={insight.high_risk} | "
            f"logs={insight.log_count}"
        )
    except Exception as e:
        logger.warning(f"Analytics failed (non-blocking): {str(e)}")
        insight = None
    
    logger.info(f"[DEBUG] History: {len(history)} messages")
    if history:
        logger.info(f"[DEBUG] Last history message: role={history[-1].get('role')}, content_len={len(history[-1].get('content', ''))}")
    logger.info(f"[DEBUG] Current user message: {request.message[:50]}...")
    
    reply = await ollama_service.get_response(
        user_message=request.message,
        conversation_history=history,
        emotional_insight=insight,
        crisis_detected=insight.high_risk if insight else False
    )
    
    # Log interaction context
    logger.info(
        f"[CHAT] user={request.user_id} | "
        f"emotion={insight.dominant_emotion if insight else 'unknown'} | "
        f"tone={insight.suggested_tone if insight else 'neutral'} | "
        f"approach={insight.suggested_approach if insight else 'standard'} | "
        f"response_len={len(reply)}"
    )
    
    # Store assistant response
    assistant_message_id = await conversation_service.save_message(
        db, conversation_id, "assistant", reply
    )
    
    await db.commit()
    
    return ChatResponse(
        reply=reply,
        conversation_id=conversation_id,
        message_id=user_message_id
    )


@router.post("/stream/")
async def chat_stream_endpoint(request: ChatRequest, db: AsyncSession = Depends(get_db)):
    try:
        if request.conversation_id is None:
            conversation_id = await conversation_service.create_conversation(db, request.user_id)
        else:
            owns_conversation = await conversation_service.validate_conversation_ownership(
                db, request.user_id, request.conversation_id
            )
            if not owns_conversation:
                raise HTTPException(status_code=403, detail=f"User does not own conversation {request.conversation_id}")
            conversation_id = request.conversation_id
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    crisis_assessment = await crisis_service.assess_threat(
        message=request.message,
        emotion_label=None,
        conversation_history=None,
        user_id=request.user_id
    )
    
    if crisis_assessment["requires_escalation"]:
        user_message_id = await conversation_service.save_message(
            db, conversation_id, "user", request.message
        )
        try:
            emotion = await emotion_service.detect_emotion(request.message)
            await emotion_service.log_emotion(
                db=db, user_id=request.user_id, conversation_id=conversation_id,
                message_id=user_message_id, label=emotion["label"],
                confidence=emotion["confidence"]
            )
        except Exception as e:
            print(f"Failed to log emotion in crisis response: {str(e)}")
        try:
            await crisis_service.log_crisis_event(
                db=db, user_id=request.user_id, conversation_id=conversation_id,
                message_id=user_message_id, assessment=crisis_assessment
            )
        except Exception as e:
            print(f"Failed to log crisis event: {str(e)}")
        await db.commit()
        
        async def crisis_generator():
            response_text = crisis_assessment["response"]
            for char in response_text:
                yield f"data: {char}\n\n"
                await asyncio.sleep(0.01)
            yield f"data: __CRISIS__{crisis_assessment['severity']}__{len(crisis_assessment.get('resources', []))}\n\n"
        
        return StreamingResponse(crisis_generator(), media_type="text/event-stream")
        
        # Retrieve optimized conversation history (hierarchical context management)
        history = await context_manager.get_optimized_history(
        db, conversation_id
        )
    
    user_message_id = await conversation_service.save_message(
        db, conversation_id, "user", request.message
    )
    await db.commit()  # Commit immediately
    
    if request.conversation_id is None:
        await conversation_service.auto_title_conversation(
            db, conversation_id, request.message
        )
    
    emotion = {"label": "neutral", "confidence": 0.5}
    try:
        emotion = await emotion_service.detect_emotion(request.message)
        await emotion_service.log_emotion(
            db=db, user_id=request.user_id, conversation_id=conversation_id,
            message_id=user_message_id, label=emotion["label"],
            confidence=emotion["confidence"]
        )
    except Exception as e:
        print(f"Failed to log emotion: {str(e)}")
    
    try:
        if journal_service.should_create_entry(request.message, emotion["label"]):
            await journal_service.create_entry(
                db=db, user_id=request.user_id, conversation_id=conversation_id,
                message_id=user_message_id, message_text=request.message,
                emotion_label=emotion["label"]
            )
    except Exception as e:
        print(f"Failed to create journal entry: {str(e)}")
    
    try:
        insight = await emotion_analytics_service.generate_user_insights(
            db=db, user_id=request.user_id, days=7
        )
        logger.info(
            f"[INSIGHT] user={request.user_id} | "
            f"emotion={insight.dominant_emotion} ({insight.dominance_pct:.0%}) | "
            f"trend={insight.trend} | "
            f"volatility={insight.volatility_flag} | "
            f"high_risk={insight.high_risk}"
        )
    except Exception as e:
        logger.warning(f"Analytics failed (non-blocking): {str(e)}")
        insight = None
    
    logger.info(f"[DEBUG] History: {len(history)} messages")
    if history:
        logger.info(f"[DEBUG] Last history message: role={history[-1].get('role')}, content_len={len(history[-1].get('content', ''))}")
    logger.info(f"[DEBUG] Current user message: {request.message[:50]}...")
    
    reply = await ollama_service.get_response(
        user_message=request.message,
        conversation_history=history,
        emotional_insight=insight,
        crisis_detected=insight.high_risk if insight else False
    )
    
    logger.info(
        f"[CHAT] user={request.user_id} | "
        f"emotion={insight.dominant_emotion if insight else 'unknown'} | "
        f"response_len={len(reply)}"
    )
    
    assistant_message_id = await conversation_service.save_message(
        db, conversation_id, "assistant", reply
    )
    
    await db.commit()
    
    async def stream_generator():
        for char in reply:
            yield f"data: {char}\n\n"
            await asyncio.sleep(0.01)
        yield f"data: __END__{conversation_id}__{assistant_message_id}\n\n"
    
    return StreamingResponse(stream_generator(), media_type="text/event-stream")
