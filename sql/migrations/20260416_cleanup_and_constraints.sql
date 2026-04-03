-- Migration: Cleanup duplicates and enforce uniqueness across key entities
-- Assumes database name: finance_db
USE `finance_db`;

-- 1) Deduplicate categories by (name, family_id, user_id) keeping the smallest id
DELETE c1
FROM categories AS c1
JOIN categories AS c2
  ON c1.name = c2.name
  AND ((c1.family_id = c2.family_id) OR (c1.family_id IS NULL AND c2.family_id IS NULL))
  AND ((c1.user_id = c2.user_id) OR (c1.user_id IS NULL AND c2.user_id IS NULL))
  AND c1.id > c2.id;

-- 2) Prevent future duplicates in categories
ALTER TABLE categories ADD CONSTRAINT uq_categories_name_fid_uid UNIQUE (name, family_id, user_id);

-- 3) Deduplicate goals by (name, family_id, user_id) keeping the smallest id
DELETE g1
FROM goals AS g1
JOIN goals AS g2
  ON g1.name = g2.name
  AND ((g1.family_id = g2.family_id) OR (g1.family_id IS NULL AND g2.family_id IS NULL))
  AND ((g1.user_id = g2.user_id) OR (g1.user_id IS NULL AND g2.user_id IS NULL))
  AND g1.id > g2.id;

-- 4) Re-link goal contributions from duplicates to kept goals
CREATE TEMPORARY TABLE goal_dup_map (dup_id INT UNSIGNED, keep_id INT UNSIGNED);
INSERT INTO goal_dup_map (dup_id, keep_id)
SELECT g2.id AS dup_id, g1.id AS keep_id
FROM goals g1
JOIN goals g2
  ON g1.name = g2.name
  AND ((g1.family_id = g2.family_id) OR (g1.family_id IS NULL AND g2.family_id IS NULL))
  AND ((g1.user_id = g2.user_id) OR (g1.user_id IS NULL AND g2.user_id IS NULL))
  AND g2.id > g1.id;
UPDATE goal_contributions gc
JOIN goal_dup_map m ON gc.goal_id = m.dup_id
SET gc.goal_id = m.keep_id;
DELETE g_dup
FROM goals g_dup
JOIN goal_dup_map m ON g_dup.id = m.dup_id;
DROP TEMPORARY TABLE goal_dup_map;

-- 5) Deduplicate wishes by (name, family_id, user_id) keeping the smallest id
DELETE w1
FROM wishes w1
JOIN wishes w2
  ON w1.name = w2.name
  AND ((w1.family_id = w2.family_id) OR (w1.family_id IS NULL AND w2.family_id IS NULL))
  AND ((w1.user_id = w2.user_id) OR (w1.user_id IS NULL AND w2.user_id IS NULL))
  AND w1.id > w2.id;

-- 6) Re-link wish contributions from duplicates to kept wishes
CREATE TEMPORARY TABLE wish_dup_map (dup_id INT UNSIGNED, keep_id INT UNSIGNED);
INSERT INTO wish_dup_map (dup_id, keep_id)
SELECT w2.id AS dup_id, w1.id AS keep_id
FROM wishes w1
JOIN wishes w2
  ON w1.name = w2.name
  AND ((w1.family_id = w2.family_id) OR (w1.family_id IS NULL AND w2.family_id IS NULL))
  AND ((w1.user_id = w2.user_id) OR (w1.user_id IS NULL AND w2.user_id IS NULL))
  AND w2.id > w1.id;
UPDATE wish_contributions wc
JOIN wish_dup_map m ON wc.wish_id = m.dup_id
SET wc.wish_id = m.keep_id;
DELETE w_dup
FROM wishes w_dup
JOIN wish_dup_map m ON w_dup.id = m.dup_id;
DROP TEMPORARY TABLE wish_dup_map;

-- 7) Add unique constraint for wishes
ALTER TABLE wishes ADD CONSTRAINT uq_wishes_name_fid_uid UNIQUE (name, family_id, user_id);
