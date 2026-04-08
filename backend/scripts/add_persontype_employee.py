"""
Añade el valor 'employee' al enum persontype y migra 'resident' -> 'employee'.

Uso (desde la carpeta backend, con venv activado):
    python scripts/add_persontype_employee.py
"""
from __future__ import annotations

import asyncio
import sys
from pathlib import Path

import asyncpg

# Permite importar app.core desde backend/
_BACKEND = Path(__file__).resolve().parent.parent
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))


def _dsn_from_settings_url(url: str) -> str:
    if url.startswith("postgresql+asyncpg://"):
        return "postgresql://" + url.split("postgresql+asyncpg://", 1)[1]
    return url


async def main() -> None:
    from app.core.config import settings

    dsn = _dsn_from_settings_url(settings.POSTGRES_URL)
    conn = await asyncpg.connect(dsn)
    try:
        try:
            await conn.execute("ALTER TYPE persontype ADD VALUE 'employee'")
            print("OK: añadido 'employee' al enum persontype.")
        except (asyncpg.DuplicateObjectError, asyncpg.PostgresError) as e:
            msg = str(e).lower()
            if "already exists" in msg or "duplicate" in msg:
                print("El valor 'employee' ya existe en persontype; no se repite ADD VALUE.")
            else:
                raise
        result = await conn.execute(
            "UPDATE people SET person_type = 'employee'::persontype "
            "WHERE person_type::text = 'resident'"
        )
        # asyncpg execute returns status string like "UPDATE 3"
        print(result)
        print("Listo. Podés arrancar el backend de nuevo.")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
