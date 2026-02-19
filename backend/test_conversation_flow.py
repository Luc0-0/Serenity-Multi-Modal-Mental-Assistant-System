"""Test conversation history retrieval for a specific conversation."""
import asyncio
import json
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from app.models.conversation import Conversation
from app.models.message import Message
from app.core.config import settings

async def test_conversation_flow(conversation_id: int, test_message: str):
    """Simulate the chat endpoint flow for debugging."""
    engine = create_async_engine(settings.database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        print(f"\n=== TESTING CONVERSATION {conversation_id} ===")
        
        # Step 1: Retrieve history BEFORE saving message (the fixed way)
        print("\n[STEP 1] Retrieving conversation history...")
        messages_result = await session.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc())
            .limit(10)
        )
        messages = messages_result.scalars().all()
        
        history = [
            {
                "role": message.role.value,
                "content": message.content
            }
            for message in messages
        ]
        
        print(f"History retrieved: {len(history)} messages")
        for i, msg in enumerate(history):
            print(f"  [{i}] {msg['role']}: {msg['content'][:60]}...")
        
        # Step 2: Simulate building message list (as done in ollama_service)
        print(f"\n[STEP 2] Building message list for API call...")
        api_messages = []
        
        # Add all history
        for msg in history:
            api_messages.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", "")
            })
        
        # Add current message
        api_messages.append({
            "role": "user",
            "content": test_message
        })
        
        print(f"Final message list: {len(api_messages)} messages")
        for i, msg in enumerate(api_messages):
            print(f"  [{i}] {msg['role']}: {msg['content'][:60]}...")
        
        # Check for duplicates in final list
        print(f"\n[STEP 3] Checking for duplicates in final message list...")
        seen = {}
        duplicates = []
        for i, msg in enumerate(api_messages):
            key = (msg["role"], msg["content"])
            if key in seen:
                duplicates.append({
                    "content": msg["content"][:60],
                    "first_at": seen[key],
                    "duplicate_at": i
                })
            else:
                seen[key] = i
        
        if duplicates:
            print(f"❌ FOUND {len(duplicates)} DUPLICATE(S):")
            for dup in duplicates:
                print(f"   - {dup['content']}...")
                print(f"     First at index {dup['first_at']}, duplicate at {dup['duplicate_at']}")
        else:
            print("✓ No duplicates detected")
        
        print(f"\n[RESULT] Message list ready for Ollama API")
        print(f"Last message: {api_messages[-1]['role']} -> {api_messages[-1]['content']}")
    
    await engine.dispose()

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 3:
        print("Usage: python test_conversation_flow.py <conversation_id> <test_message>")
        print("Example: python test_conversation_flow.py 123 'hi'")
        sys.exit(1)
    
    conv_id = int(sys.argv[1])
    msg = sys.argv[2]
    asyncio.run(test_conversation_flow(conv_id, msg))
