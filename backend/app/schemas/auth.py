from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class LoginRequest(BaseModel):
    """Login request schema"""
    email: EmailStr = Field(..., description="User email")
    password: str = Field(..., min_length=8, description="User password")

    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "password": "password123"
            }
        }


class SignupRequest(BaseModel):
    """Signup request schema"""
    name: str = Field(..., min_length=1, max_length=255, description="User full name")
    email: EmailStr = Field(..., description="User email")
    password: str = Field(..., min_length=8, description="User password (min 8 chars)")

    class Config:
        json_schema_extra = {
            "example": {
                "name": "John Doe",
                "email": "user@example.com",
                "password": "securepassword123"
            }
        }


class UserResponse(BaseModel):
    """User response schema"""
    id: int
    name: str
    email: str
    created_at: datetime

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "name": "John Doe",
                "email": "user@example.com",
                "created_at": "2025-01-15T10:30:00"
            }
        }


class LoginResponse(BaseModel):
    """Login response schema"""
    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type")
    user: UserResponse = Field(..., description="User info")


class SignupResponse(BaseModel):
    """Signup response schema"""
    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type")
    user: UserResponse = Field(..., description="User info")
