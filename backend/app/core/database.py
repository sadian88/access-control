from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

_pg_connect_args: dict = {
    "timeout": settings.POSTGRES_CONNECT_TIMEOUT,
    "server_settings": {"application_name": "prism_access_control"},
}
if settings.POSTGRES_SSL_DISABLE:
    # asyncpg: desactiva SSL explícitamente (útil en LAN / Postgres sin TLS).
    _pg_connect_args["ssl"] = False

# pool_pre_ping: descarta conexiones muertas antes de usarlas.
# pool_recycle: evita que el servidor cierre sockets idle (común en Windows/Docker).
# connect_args.timeout: segundos para completar el handshake TCP/auth con asyncpg.
engine = create_async_engine(
    settings.POSTGRES_URL,
    echo=False,
    pool_pre_ping=True,
    pool_recycle=settings.POSTGRES_POOL_RECYCLE,
    pool_timeout=settings.POSTGRES_POOL_TIMEOUT,
    connect_args=_pg_connect_args,
)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session
