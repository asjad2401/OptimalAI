from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "OptimalAI_MVP1"
    MONGO_URI: str
    DATABASE_NAME: str = "optimal_ai"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()
