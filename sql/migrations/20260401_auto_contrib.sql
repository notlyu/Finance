-- Migration: add auto-contribution tracking fields to goal_contributions
-- 1) automatic flag
ALTER TABLE goal_contributions
  ADD COLUMN automatic BOOLEAN NOT NULL DEFAULT FALSE;

-- 2) source transaction reference (income that triggered the auto-contribution)
ALTER TABLE goal_contributions
  ADD COLUMN source_transaction_id INT UNSIGNED NULL;

-- 3) type of contribution: 'contribution' or 'interest'
ALTER TABLE goal_contributions
  ADD COLUMN type ENUM('contribution','interest') DEFAULT 'contribution' NOT NULL;

-- 4) foreign key constraint (optional, for data integrity)
ALTER TABLE goal_contributions
  ADD CONSTRAINT fk_goal_contributions_source_transaction
  FOREIGN KEY (source_transaction_id) REFERENCES transactions(id)
  ON DELETE SET NULL;

-- 5) indexes to speed up lookups by source transaction
CREATE INDEX idx_goal_contrib_source_tx ON goal_contributions (source_transaction_id);
