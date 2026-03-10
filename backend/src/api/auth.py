import uuid
from fastapi import APIRouter, HTTPException, status

from src.models.auth import UserCreate, UserInDB, UserResponse, UserLogin
from src.auth.security import get_password_hash, verify_password
from src.db.connection import get_database

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse)
async def register(user_in: UserCreate):
    db = get_database()
    users_collection = db["users"]
    
    if await users_collection.find_one({"email": user_in.email}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered"
        )
    
    user_data = user_in.model_dump()

    hashed_password = get_password_hash(user_data.pop("password"))

    user_data["_id"] = str(uuid.uuid4())
    user_data["hashed_password"] = hashed_password

    user_db = UserInDB(**user_data)

    await users_collection.insert_one(user_db.model_dump(by_alias=True))

    return UserResponse(**user_db.model_dump())


@router.post("/login", response_model=UserResponse)
async def login(user_in: UserLogin):
    db = get_database()
    users_collection = db["users"]

    user = await users_collection.find_one({"email": user_in.email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    if not verify_password(user_in.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )

    return UserResponse(**user)