-- Migration: Add visitor_card_number and belongs_to to events table

ALTER TABLE events
    ADD COLUMN IF NOT EXISTS visitor_card_number VARCHAR(50) NULL,
    ADD COLUMN IF NOT EXISTS belongs_to VARCHAR(20) NULL;

-- Create enum type if not exists (PostgreSQL)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'belongsto') THEN
        CREATE TYPE belongsto AS ENUM ('UNFINET', 'IFX', 'OTRO');
    END IF;
END$$;

-- If using enum type, update the column
-- ALTER TABLE events ALTER COLUMN belongs_to TYPE belongsto USING belongs_to::belongsto;
