-- Migration: add archived flags to goals and wishes (for archiving completed items)
ALTER TABLE goals ADD COLUMN archived BOOLEAN DEFAULT FALSE;
ALTER TABLE goals ADD COLUMN archived_at DATETIME NULL;
ALTER TABLE wishes ADD COLUMN archived BOOLEAN DEFAULT FALSE;
ALTER TABLE wishes ADD COLUMN archived_at DATETIME NULL;
