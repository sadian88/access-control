-- Migration: Create users table for PRISM admin authentication
-- Run this in your PostgreSQL database

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email TEXT,
    hashed_password TEXT NOT NULL,
    full_name TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_superuser BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- NOTE: To create the default admin user, start the backend and call:
--   POST /api/v1/auth/seed
-- This will create an admin user with username "admin" and password "admin"
-- Or use the provided Python script: python scripts/create_admin.py
