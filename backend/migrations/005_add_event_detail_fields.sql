-- Migration: Add entry_zone, has_equipment, notes to events table

ALTER TABLE events
    ADD COLUMN IF NOT EXISTS entry_zone VARCHAR(100) NULL,
    ADD COLUMN IF NOT EXISTS has_equipment BOOLEAN NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS notes TEXT NULL;
