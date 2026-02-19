from pydantic import BaseModel, Field
from typing import Optional, List


class ChatRequest(BaseModel):
    user_id: int = Field(..., gt=0, description="User ID")
    message: str = Field(..., min_length=1, max_length=2000, description="Message content")
    conversation_id: Optional[int] = Field(None, gt=0, description="Conversation ID (null = new conversation)")
    
    @classmethod
    def __get_validators__(cls):
        yield cls.validate_message
    
    @staticmethod
    def validate_message(v):
        if isinstance(v, str):
            # Strip whitespace and prevent empty messages
            v = v.strip()
            if not v:
                raise ValueError("Message cannot be empty or whitespace only")
        return v
    
    class Config:
        json_schema_extra = {
            "example": {
                "user_id": 1,
                "message": "I'm feeling anxious today",
                "conversation_id": None
            }
        }


class CrisisResource(BaseModel):
    """Resource for crisis support"""
    name: str
    phone: Optional[str] = None
    text: Optional[str] = None
    url: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    available: Optional[str] = None
    action: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str = Field(..., description="Assistant response")
    conversation_id: int = Field(..., description="Conversation ID")
    message_id: int = Field(..., description="User message ID")
    
    # Crisis detection fields (optional, populated if crisis detected)
    crisis_detected: Optional[bool] = False
    crisis_severity: Optional[str] = None  # normal|warning|danger|emergency
    resources: Optional[List[CrisisResource]] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "reply": "I hear you. That's a challenging emotion to navigate...",
                "conversation_id": 1,
                "message_id": 1,
                "crisis_detected": False
            }
        }
