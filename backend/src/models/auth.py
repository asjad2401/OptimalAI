from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime
import re

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = Field(default=None, max_length=100)


class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)

    @field_validator('password')
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if not re.search(r"[A-Za-z]", v):
            raise ValueError("Password must contain at least one letter (a-z or A-Z)")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one number (0-9)")
        if not re.search(r"[@$!%*?&#^_\-]", v):
            raise ValueError("Password must contain at least one special character (@$!%*?&#^_-)")

        # check invalid chars
        if not re.fullmatch(r"[A-Za-z\d@$!%*?&#^_\-]+", v):
            raise ValueError("Password contains invalid characters")

        return v


class UserInDB(UserBase):
    id: str = Field(alias="_id")
    hashed_password: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)


class UserResponse(UserBase):
    id: str = Field(alias="_id")
    is_active: bool
    created_at: datetime

    class Config:
        populate_by_name = True