from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    POSTGRES_URL: str
    SIMILARITY_THRESHOLD: float = 0.40
    DEBOUNCE_SECONDS: int = 10
    MEDIA_PATH: str = "/app/media"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
