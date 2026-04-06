-- 1. Wishes: family_id nullable, is_private = true (already applied)

-- 2. Budgets: is_personal column (already applied)

-- 3. Password Reset Tokens (already applied)

-- 4. Transactions: family_id nullable + REMOVE FK constraint (already applied)
-- ALTER TABLE transactions CHANGE COLUMN family_id family_id INT UNSIGNED NULL;
-- ALTER TABLE transactions DROP FOREIGN KEY fk_transactions_family_id;

-- 5. Recurring Transactions: family_id nullable (already applied)

-- 6. FK fixes: change CASCADE to SET NULL for goals, wishes, recurring_transactions
-- ALTER TABLE goals DROP FOREIGN KEY fk_goals_family_id;
-- ALTER TABLE goals ADD CONSTRAINT fk_goals_family_id FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE SET NULL;
-- ALTER TABLE wishes DROP FOREIGN KEY fk_wishes_family_id;
-- ALTER TABLE wishes ADD CONSTRAINT fk_wishes_family_id FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE SET NULL;
-- ALTER TABLE recurring_transactions DROP FOREIGN KEY fk_recurring_family;
-- ALTER TABLE recurring_transactions ADD CONSTRAINT fk_recurring_family FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE SET NULL;
