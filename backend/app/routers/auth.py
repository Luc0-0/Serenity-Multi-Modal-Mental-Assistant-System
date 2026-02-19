import logging
from fastapi import APIRouter, HTTPException, status, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.schemas.auth import LoginRequest, SignupRequest, UserResponse, LoginResponse, SignupResponse
from app.core.security import verify_password, get_password_hash, create_access_token, verify_token
from app.models.user import User
from app.models.conversation import Conversation
from app.models.journal_entry import JournalEntry
from datetime import datetime
import jwt
from app.core.config import settings
from typing import Optional

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])


async def get_current_user(db: AsyncSession = Depends(get_db), authorization: Optional[str] = Header(None)) -> User:
    """Retrieve current user from JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not authorization:
        raise credentials_exception
    
    try:
        scheme, token = authorization.split(" ")
        if scheme.lower() != "bearer":
            raise credentials_exception
    except ValueError:
        raise credentials_exception
    
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        user_id_str: str = payload.get("sub")
        user_id: int = int(user_id_str)  # Ensure integer format
        if user_id is None:
            raise credentials_exception
    except jwt.InvalidTokenError:
        raise credentials_exception
    except Exception:
        raise credentials_exception
    
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
    
    return user


@router.post("/login/", response_model=dict)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate user."""
    stmt = select(User).where(User.email == request.email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    access_token = create_access_token(data={"sub": user.id})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "created_at": user.created_at.isoformat() if user.created_at else None
        }
    }


@router.post("/signup/", response_model=dict, status_code=status.HTTP_201_CREATED)
async def signup(request: SignupRequest, db: AsyncSession = Depends(get_db)):
    """Register new user."""
    stmt = select(User).where(User.email == request.email)
    result = await db.execute(stmt)
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    hashed_password = get_password_hash(request.password)
    
    user = User(
        name=request.name,
        email=request.email,
        hashed_password=hashed_password,
        username=request.name  # Using name as username
    )
    
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    access_token = create_access_token(data={"sub": user.id})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "created_at": user.created_at.isoformat() if user.created_at else None
        }
    }


@router.get("/profile/", response_model=dict)
async def get_profile(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Retrieve user profile."""
    conv_stmt = select(Conversation).where(Conversation.user_id == current_user.id)
    conv_result = await db.execute(conv_stmt)
    conversation_count = len(conv_result.scalars().all())
    
    journal_stmt = select(JournalEntry).where(JournalEntry.user_id == current_user.id)
    journal_result = await db.execute(journal_stmt)
    journal_count = len(journal_result.scalars().all())
    
    return {
        "user": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "created_at": current_user.created_at.isoformat() if current_user.created_at else None
        },
        "stats": {
            "conversations": conversation_count,
            "journal_entries": journal_count
        }
    }


@router.put("/profile/", response_model=dict)
async def update_profile(
    request: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update profile details."""
    if "name" in request:
        current_user.name = request["name"]
    if "email" in request:
        current_user.email = request["email"]
    
    await db.commit()
    await db.refresh(current_user)
    
    return {
        "user": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "created_at": current_user.created_at.isoformat() if current_user.created_at else None
        }
    }


@router.delete("/profile/", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Delete account."""
    await db.delete(current_user)
    await db.commit()
    return None
