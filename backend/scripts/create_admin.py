"""Create default admin user for PRISM.

Run: python scripts/create_admin.py
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import AsyncSessionLocal
from app.core.security import get_password_hash
from app.models.models import User
from sqlalchemy import select


async def main():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User))
        if result.scalars().first():
            print("Users already exist. Skipping.")
            return

        admin = User(
            username="admin",
            email="admin@prism.local",
            hashed_password=get_password_hash("admin"),
            full_name="Administrator",
            is_active=True,
            is_superuser=True,
        )
        db.add(admin)
        await db.commit()
        print("Admin user created successfully!")
        print("Username: admin")
        print("Password: admin")


if __name__ == "__main__":
    asyncio.run(main())
