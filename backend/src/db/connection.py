from motor.motor_asyncio import AsyncIOMotorClient
from src.config import settings

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_state = Database()

async def connect_to_mongo():
    db_state.client = AsyncIOMotorClient(settings.MONGO_URI)
    db_state.db = db_state.client[settings.DATABASE_NAME]

async def close_mongo_connection():
    if db_state.client:
        db_state.client.close()

def get_database():
    return db_state.db
