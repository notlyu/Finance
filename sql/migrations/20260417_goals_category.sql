-- Migration: add category_id to goals
-- Run in finance_db
USE `finance_db`;

-- Check if column exists before adding
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = 'finance_db' AND TABLE_NAME = 'goals' AND COLUMN_NAME = 'category_id'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE goals ADD COLUMN category_id INT UNSIGNED NULL',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key if not exists
SET @fk_exists = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE TABLE_SCHEMA = 'finance_db' AND TABLE_NAME = 'goals' AND CONSTRAINT_NAME = 'fk_goals_category'
);

SET @sql2 = IF(@fk_exists = 0,
  'ALTER TABLE goals ADD CONSTRAINT fk_goals_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL',
  'SELECT 1'
);

PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- Add index if not exists
SET @idx_exists = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = 'finance_db' AND TABLE_NAME = 'goals' AND INDEX_NAME = 'idx_goals_category'
);

SET @sql3 = IF(@idx_exists = 0,
  'CREATE INDEX idx_goals_category ON goals (category_id)',
  'SELECT 1'
);

PREPARE stmt3 FROM @sql3;
EXECUTE stmt3;
DEALLOCATE PREPARE stmt3;
