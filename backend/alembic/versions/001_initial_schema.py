"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-03-30

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Definir los ENUMs una sola vez aquí
persontype = sa.Enum("resident", "visitor", name="persontype")
statetype  = sa.Enum("IN", "OUT", name="statetype")
eventtype  = sa.Enum("entry", "exit", "unknown", name="eventtype")


def upgrade() -> None:
    bind = op.get_bind()

    # Crear ENUMs con checkfirst=True (no falla si ya existen)
    persontype.create(bind, checkfirst=True)
    statetype.create(bind, checkfirst=True)
    eventtype.create(bind, checkfirst=True)

    # Tabla people
    op.create_table(
        "people",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("full_name", sa.Text(), nullable=False),
        sa.Column("cedula", sa.String(50), nullable=True, unique=True),
        sa.Column("email", sa.Text(), nullable=True),
        sa.Column("phone", sa.String(30), nullable=True),
        sa.Column("apartment", sa.String(50), nullable=True),
        sa.Column("embedding", Vector(512), nullable=False),
        sa.Column("person_type", sa.Enum("resident", "visitor", name="persontype", create_type=False), nullable=False),
        sa.Column("state", sa.Enum("IN", "OUT", name="statetype", create_type=False), nullable=False, server_default="OUT"),
        sa.Column("last_entry_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # Tabla events
    op.create_table(
        "events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("person_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("event_type", sa.Enum("entry", "exit", "unknown", name="eventtype", create_type=False), nullable=False),
        sa.Column("photo_path", sa.Text(), nullable=True),
        sa.Column("stay_duration", sa.Interval(), nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["person_id"], ["people.id"]),
    )

    # Tabla temp_unknowns
    op.create_table(
        "temp_unknowns",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("photo_path", sa.Text(), nullable=True),
        sa.Column("embedding", Vector(512), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
    )

    # Índices HNSW para búsqueda vectorial
    op.execute("CREATE INDEX ix_people_embedding ON people USING hnsw (embedding vector_cosine_ops)")
    op.execute("CREATE INDEX ix_temp_unknowns_embedding ON temp_unknowns USING hnsw (embedding vector_cosine_ops)")


def downgrade() -> None:
    op.drop_table("temp_unknowns")
    op.drop_table("events")
    op.drop_table("people")

    bind = op.get_bind()
    eventtype.drop(bind, checkfirst=True)
    statetype.drop(bind, checkfirst=True)
    persontype.drop(bind, checkfirst=True)
