-- Migration: add category_id to wishes and FK constraint
ALTER TABLE wishes ADD COLUMN category_id INT UNSIGNED NULL;
ALTER TABLE wishes ADD CONSTRAINT fk_wishes_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
CREATE INDEX idx_wishes_category ON wishes (category_id);
