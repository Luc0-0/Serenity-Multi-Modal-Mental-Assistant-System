import logging
import asyncio
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.conversation_service import ConversationService
from app.services.journal_service import JournalService
from app.services.emotion_analytics_service import EmotionAnalyticsService
from app.services.context_manager import ContextManager
from app.services.memory_service import memory_service
from app.db.session import get_db
import app.main as main_app

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])

conversation_service = ConversationService()
journal_service = JournalService()
emotion_analytics_service = EmotionAnalyticsService()
context_manager = ContextManager()


# Background task for generating conversation title
async def generate_title_async(conversation_id: int, user_message: str):
    """Generate title from initial message in background."""
    from app.db.session import SessionLocal
    
    logger.info(f"[TITLE] ✓ Starting title generation for conversation {conversation_id}")
    
    # Small delay to ensure conversation is created
    await asyncio.sleep(0.5)
    
    async with SessionLocal() as db:
        try:
            logger.info(f"[TITLE] ✓ Calling LLM with message: {user_message[:50]}...")
            
            # Call LLM with explicit error handling
            try:
                title = await main_app.llm_service.generate_title(user_message)
                logger.info(f"[TITLE] ✓ LLM returned: '{title}'")
            except Exception as llm_err:
                logger.error(f"[TITLE] ✗ LLM SERVICE EXCEPTION: {type(llm_err).__name__}: {str(llm_err)}", exc_info=True)
                return
            
            if not title or title == "New Conversation":
                logger.error(f"[TITLE] ✗ TITLE GENERATION FAILED - returned default for {conversation_id}")
                logger.error(f"[TITLE] ✗ Check if Ollama endpoint is running and accessible")
                return
            
            logger.info(f"[TITLE] ✓ Updating database for conversation {conversation_id}")
            await conversation_service.update_conversation_title(db, conversation_id, title)
            await db.commit()
            logger.info(f"[TITLE] ✓ SUCCESS for conversation {conversation_id}: '{title}'")
        except Exception as e:
            logger.error(f"[TITLE] ✗ BACKGROUND TASK EXCEPTION for conversation {conversation_id}: {str(e)}", exc_info=True)


# Background task for post-chat processing
async def post_process_chat_async(
    user_id: int,
    conversation_id: int,
    message_id: int,
    history: list,
    user_message: str,
    emotion_label: str
):
    """
    Non-critical post-processing tasks run in background after response is sent.
    This prevents blocking the chat endpoint.
    """
    from app.db.session import SessionLocal
    
    async with SessionLocal() as db:
        try:
            # Emotion Analytics (non-blocking)
            try:
                await emotion_analytics_service.generate_user_insights(
                    db=db, user_id=user_id, days=7
                )
                logger.info(f"[ANALYTICS] Processed for user={user_id}")
            except Exception as e:
                logger.warning(f"Analytics failed (non-blocking): {str(e)}")
            
            # Journal Extraction (non-blocking)
            try:
                summary = " ".join([m.get("content", "")[:100] for m in history[-3:]])
                should_extract = await main_app.llm_service.should_create_journal_entry(
                    conversation_summary=summary,
                    user_message=user_message,
                )
                
                if should_extract:
                    await journal_service.create_or_update_entry(
                        db=db,
                        user_id=user_id,
                        conversation_id=conversation_id,
                        conversation_history=history + [{"role": "user", "content": user_message}],
                        emotion_label=emotion_label,
                        llm_service=main_app.llm_service,
                        ai_confidence=0.95
                    )
                    logger.info("[JOURNAL] Entry created/updated via background processing")
            except Exception as e:
                logger.warning(f"Journal extraction failed (non-blocking): {str(e)}")
            
            # Semantic Memory (non-blocking)  
            try:
                await memory_service.maybe_store_semantic_memory(
                    db=db,
                    user_id=user_id,
                    conversation_id=conversation_id,
                    message_id=message_id,
                    message_text=user_message,
                    emotion_label=emotion_label,
                )
                logger.info(f"[MEMORY] Semantic memory stored for user={user_id}")
            except Exception as e:
                logger.warning(f"Failed to capture semantic memory: {str(e)}")
            
            await db.commit()
        except Exception as e:
            logger.error(f"Post-process chat error: {str(e)}")
            await db.rollback()


@router.post("/", response_model=ChatResponse)
async def chat_endpoint(
    request: ChatRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
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
    
    # CRITICAL PATH: Crisis Assessment (stays in sync path)
    crisis_assessment = await main_app.crisis_service.assess_threat(
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
            emotion = await main_app.emotion_service.detect_emotion(request.message)
            await main_app.emotion_service.log_emotion(
                db=db, user_id=request.user_id, conversation_id=conversation_id,
                message_id=user_message_id, label=emotion["label"],
                confidence=emotion["confidence"]
            )
        except Exception as e:
            logger.warning(f"Failed to log emotion in crisis response: {str(e)}")
        try:
            await main_app.crisis_service.log_crisis_event(
                db=db, user_id=request.user_id, conversation_id=conversation_id,
                message_id=user_message_id, assessment=crisis_assessment
            )
        except Exception as e:
            logger.warning(f"Failed to log crisis event: {str(e)}")
        await db.commit()
        return ChatResponse(
            reply=crisis_assessment["response"],
            conversation_id=conversation_id,
            message_id=user_message_id,
            crisis_detected=True,
            crisis_severity=crisis_assessment["severity"],
            resources=crisis_assessment["resources"]
        )
    
    # CRITICAL PATH: Get conversation history
    history = await context_manager.get_optimized_history(db, conversation_id)
    
    # CRITICAL PATH: Save user message
    user_message_id = await conversation_service.save_message(
        db, conversation_id, "user", request.message
    )
    await db.commit()
    
    # Generate conversation title in background if new conversation
    if request.conversation_id is None:
        background_tasks.add_task(
            generate_title_async,
            conversation_id=conversation_id,
            user_message=request.message
        )
    
    # CRITICAL PATH: Detect emotion for this message
    emotion = {"label": "neutral", "confidence": 0.5}
    try:
        emotion = await main_app.emotion_service.detect_emotion(request.message)
        await main_app.emotion_service.log_emotion(
            db=db, user_id=request.user_id, conversation_id=conversation_id,
            message_id=user_message_id, label=emotion["label"],
            confidence=emotion["confidence"]
        )
    except Exception as e:
        logger.warning(f"Failed to log emotion: {str(e)}")

    # CRITICAL PATH: Build memory bundle and generate response
    memory_bundle = await memory_service.build_memory_bundle(
        db=db,
        user_id=request.user_id,
        conversation_id=conversation_id,
        history=history,
        user_message=request.message,
    )
    
    logger.info(f"[DEBUG] History: {len(history)} messages")
    if history:
        logger.info(f"[DEBUG] Last message: role={history[-1].get('role')}, len={len(history[-1].get('content', ''))}")
    logger.info(f"[DEBUG] User message: {request.message[:50]}...")
    
    # Get insight for response generation (lightweight query)
    insight = None
    try:
        insight = await emotion_analytics_service.generate_user_insights(
            db=db, user_id=request.user_id, days=7
        )
    except Exception as e:
        logger.warning(f"Analytics query failed: {str(e)}")
    
    # CRITICAL PATH: Generate LLM response
    # Only trigger crisis mode for actual crisis keywords, not just negative emotions
    actual_crisis = await main_app.emotion_service.detect_crisis_signals(request.message)
    reply = await main_app.llm_service.get_response(
        user_message=request.message,
        conversation_history=history,
        emotional_insight=insight,
        crisis_detected=actual_crisis,
        memory_bundle=memory_bundle,
    )
    
    logger.info(
        f"[CHAT] user={request.user_id} | "
        f"emotion={insight.dominant_emotion if insight else 'unknown'} | "
        f"response_len={len(reply)}"
    )
    
    # CRITICAL PATH: Store assistant response
    assistant_message_id = await conversation_service.save_message(
        db, conversation_id, "assistant", reply
    )
    await db.commit()
    
    # NON-CRITICAL: Schedule background processing (runs after response sent)
    background_tasks.add_task(
        post_process_chat_async,
        user_id=request.user_id,
        conversation_id=conversation_id,
        message_id=user_message_id,
        history=history,
        user_message=request.message,
        emotion_label=emotion.get("label", "neutral")
    )
    
    return ChatResponse(
        reply=reply,
        conversation_id=conversation_id,
        message_id=user_message_id
    )


@router.post("/stream/")
async def chat_stream_endpoint(
    request: ChatRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
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
    
    crisis_assessment = await main_app.crisis_service.assess_threat(
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
            emotion = await main_app.emotion_service.detect_emotion(request.message)
            await main_app.emotion_service.log_emotion(
                db=db, user_id=request.user_id, conversation_id=conversation_id,
                message_id=user_message_id, label=emotion["label"],
                confidence=emotion["confidence"]
            )
        except Exception as e:
            logger.warning(f"Failed to log emotion in crisis response: {str(e)}")
        try:
            await main_app.crisis_service.log_crisis_event(
                db=db, user_id=request.user_id, conversation_id=conversation_id,
                message_id=user_message_id, assessment=crisis_assessment
            )
        except Exception as e:
            logger.warning(f"Failed to log crisis event: {str(e)}")
        await db.commit()
        
        async def crisis_generator():
            response_text = crisis_assessment["response"]
            for char in response_text:
                yield f"data: {char}\n\n"
                await asyncio.sleep(0.01)
            yield f"data: __CRISIS__{crisis_assessment['severity']}__{len(crisis_assessment.get('resources', []))}\n\n"
        
        return StreamingResponse(crisis_generator(), media_type="text/event-stream")
    
    history = await context_manager.get_optimized_history(
        db, conversation_id
    )
    user_message_id = await conversation_service.save_message(
        db, conversation_id, "user", request.message
    )
    await db.commit()
    
    # Generate conversation title in background if new
    if request.conversation_id is None:
        background_tasks.add_task(
            generate_title_async,
            conversation_id=conversation_id,
            user_message=request.message
        )
    
    # CRITICAL: Detect emotion for this message
    emotion = {"label": "neutral", "confidence": 0.5}
    try:
        emotion = await main_app.emotion_service.detect_emotion(request.message)
        await main_app.emotion_service.log_emotion(
            db=db, user_id=request.user_id, conversation_id=conversation_id,
            message_id=user_message_id, label=emotion["label"],
            confidence=emotion["confidence"]
        )
    except Exception as e:
        logger.warning(f"Failed to log emotion: {str(e)}")
    
    # Get insight for response generation
    insight = None
    try:
        insight = await emotion_analytics_service.generate_user_insights(
            db=db, user_id=request.user_id, days=7
        )
    except Exception as e:
        logger.warning(f"Analytics query failed: {str(e)}")
    
    memory_bundle = await memory_service.build_memory_bundle(
        db=db,
        user_id=request.user_id,
        conversation_id=conversation_id,
        history=history,
        user_message=request.message,
    )
    
    # Only trigger crisis mode for actual crisis keywords, not just negative emotions
    actual_crisis = await main_app.emotion_service.detect_crisis_signals(request.message)
    reply = await main_app.llm_service.get_response(
        user_message=request.message,
        conversation_history=history,
        emotional_insight=insight,
        crisis_detected=actual_crisis,
        memory_bundle=memory_bundle,
    )
    
    assistant_message_id = await conversation_service.save_message(
        db, conversation_id, "assistant", reply
    )
    await db.commit()
    
    # Schedule background processing
    background_tasks.add_task(
        post_process_chat_async,
        user_id=request.user_id,
        conversation_id=conversation_id,
        message_id=user_message_id,
        history=history,
        user_message=request.message,
        emotion_label=emotion.get("label", "neutral")
    )
    
    async def stream_generator():
        for char in reply:
            yield f"data: {char}\n\n"
            await asyncio.sleep(0.01)
        yield f"data: __END__{conversation_id}__{assistant_message_id}\n\n"
    
    return StreamingResponse(stream_generator(), media_type="text/event-stream")
