-- Indexes to optimize common queries for transactions
CREATE INDEX idx_transactions_family_date_type ON transactions (family_id, date, type);
CREATE INDEX idx_transactions_user ON transactions (user_id);
CREATE INDEX idx_transactions_family_id ON transactions (family_id);
