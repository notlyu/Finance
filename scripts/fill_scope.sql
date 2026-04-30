-- Fill scope for Transaction
UPDATE "Transaction" SET scope = 'personal' WHERE scope IS NULL AND (is_private = true OR family_id IS NULL);
UPDATE "Transaction" SET scope = 'family' WHERE scope IS NULL AND family_id IS NOT NULL AND is_private = false;

-- Fill scope for Category  
UPDATE "Category" SET scope = 'personal' WHERE scope IS NULL AND (user_id IS NOT NULL AND family_id IS NULL);
UPDATE "Category" SET scope = 'family' WHERE scope IS NULL AND family_id IS NOT NULL;

-- Fill scope for Account
UPDATE "Account" SET scope = 'personal' WHERE scope IS NULL AND is_shared = false;
UPDATE "Account" SET scope = 'shared' WHERE scope IS NULL AND is_shared = true;

-- Fill scope for Budget
UPDATE "Budget" SET scope = 'personal' WHERE scope IS NULL AND family_id IS NULL;
UPDATE "Budget" SET scope = 'family' WHERE scope IS NULL AND family_id IS NOT NULL;

-- Fill scope for Wish
UPDATE "Wish" SET scope = 'personal' WHERE scope IS NULL AND (is_private = true OR family_id IS NULL);
UPDATE "Wish" SET scope = 'family' WHERE scope IS NULL AND family_id IS NOT NULL AND is_private = false;

-- Fill scope for Goal (if needed)
-- Goal uses family_id only, scope not in schema for Goal originally
