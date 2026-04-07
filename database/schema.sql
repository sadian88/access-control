-- ============================================================
--  Edge Guard — Schema completo
--  Ejecutar sobre la base de datos: edge_guard
--  Requiere: extensión pgvector instalada en el servidor
-- ============================================================

-- Extensión vectorial
CREATE EXTENSION IF NOT EXISTS vector;

-- ── TIPOS ENUM ──────────────────────────────────────────────

CREATE TYPE persontype AS ENUM ('resident', 'visitor');
CREATE TYPE statetype  AS ENUM ('IN', 'OUT');
CREATE TYPE eventtype  AS ENUM ('entry', 'exit', 'unknown');

-- ── TABLA: people ───────────────────────────────────────────

CREATE TABLE people (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name     TEXT          NOT NULL,
    cedula        VARCHAR(50)   UNIQUE,
    email         TEXT,
    phone         VARCHAR(30),
    apartment     VARCHAR(50),
    embedding     vector(512)   NOT NULL,
    person_type   persontype    NOT NULL,
    state         statetype     NOT NULL DEFAULT 'OUT',
    last_entry_at TIMESTAMPTZ,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ── TABLA: events ───────────────────────────────────────────

CREATE TABLE events (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id     UUID          REFERENCES people(id),
    event_type    eventtype     NOT NULL,
    photo_path    TEXT,
    stay_duration INTERVAL,
    timestamp     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ── TABLA: temp_unknowns ────────────────────────────────────

CREATE TABLE temp_unknowns (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    photo_path    TEXT,
    embedding     vector(512)   NOT NULL,
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
    expires_at    TIMESTAMPTZ   NOT NULL
);

-- ── ÍNDICES ─────────────────────────────────────────────────

-- Búsqueda vectorial por similitud coseno (HNSW — más rápido en queries)
CREATE INDEX ix_people_embedding
    ON people USING hnsw (embedding vector_cosine_ops);

CREATE INDEX ix_temp_unknowns_embedding
    ON temp_unknowns USING hnsw (embedding vector_cosine_ops);

-- Índice para filtrar por estado (consulta frecuente: quién está adentro)
CREATE INDEX ix_people_state ON people (state);

-- Índice para historial ordenado por fecha
CREATE INDEX ix_events_timestamp ON events (timestamp DESC);

-- ── TABLA DE MIGRACIONES (para que Alembic no interfiera) ───

-- Marcar la migración como ya aplicada para que Alembic no intente correrla
CREATE TABLE IF NOT EXISTS alembic_version (
    version_num VARCHAR(32) NOT NULL,
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);
INSERT INTO alembic_version (version_num) VALUES ('001');
