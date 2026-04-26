import logging
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)


def _default_media_path() -> str:
    """`backend/media` en local; en Docker el código vive en `/app` → `/app/media`."""
    backend_root = Path(__file__).resolve().parent.parent.parent
    return str(backend_root / "media")


class Settings(BaseSettings):
    POSTGRES_URL: str
    """Pool / conexión: mitigan conexiones colgadas y fallos intermitentes con PostgreSQL."""
    POSTGRES_POOL_RECYCLE: int = 280
    POSTGRES_POOL_TIMEOUT: int = 60
    POSTGRES_CONNECT_TIMEOUT: int = 60
    # Red local sin TLS: a veces el servidor cierra el socket si el handshake SSL no cuadra.
    POSTGRES_SSL_DISABLE: bool = False
    SIMILARITY_THRESHOLD: float = 0.40
    DEBOUNCE_SECONDS: int = 10
    MEDIA_PATH: str = Field(default_factory=_default_media_path)
    jwt_secret: str = "prism-super-secret-key-change-in-production-2026"
    jwt_expire_hours: int = 8
    jwt_algorithm: str = "HS256"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()


def ensure_media_path() -> None:
    """Crea MEDIA_PATH; si la ruta del .env es de otro PC/disco inválido, usa backend/media."""
    configured = settings.MEDIA_PATH
    path = Path(configured)
    try:
        path.mkdir(parents=True, exist_ok=True)
        settings.MEDIA_PATH = str(path.resolve())
        return
    except OSError as exc:
        fallback = Path(_default_media_path())
        try:
            fallback.mkdir(parents=True, exist_ok=True)
        except OSError:
            logger.exception(
                "No se pudo crear MEDIA_PATH (%r) ni la ruta por defecto (%s)",
                configured,
                fallback,
            )
            raise
        logger.warning(
            "MEDIA_PATH %r no es usable (%s); usando %s (actualiza .env en este equipo).",
            configured,
            exc,
            fallback,
        )
        settings.MEDIA_PATH = str(fallback.resolve())
