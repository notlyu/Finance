-- BEGIN: setup_full_seed_finance_db.sql -- Use your actual database USE finance_db;

SET @now := NOW();

-- 1) Базовые системные данные и тестовая структура (категории) INSERT IGNORE INTO categories (name, type, family_id, user_id, is_system, created_at) VALUES ('Зарплата','income', NULL, NULL, TRUE, @now), ('Продукты','expense', NULL, NULL, TRUE, @now), ('Транспорт','expense', NULL, NULL, TRUE, @now), ('Другое','expense', NULL, NULL, TRUE, @now), ('Без категории','expense', NULL, NULL, TRUE, @now);

SET @salary_id := (SELECT id FROM categories WHERE name='Зарплата' LIMIT 1); SET @products_id := (SELECT id FROM categories WHERE name='Продукты' LIMIT 1); SET @transport_id := (SELECT id FROM categories WHERE name='Транспорт' LIMIT 1); SET @other_id := (SELECT id FROM categories WHERE name='Другое' LIMIT 1); SET @no_cat_id := (SELECT id FROM categories WHERE name='Без категории' LIMIT 1);

-- 2) Пользователь и семья (меньшая зависимость от внешних id) INSERT IGNORE INTO users (email, password_hash, name, family_id, created_at) VALUES ('test@example.com','HASHED_PASSWORD','Test User', NULL, @now); SET @user_id := (SELECT id FROM users WHERE email='test@example.com' LIMIT 1);

INSERT IGNORE INTO families (name, invite_code, owner_user_id, created_at) VALUES ('Test Family','TEST', @user_id, @now); SET @family_id := (SELECT id FROM families WHERE name='Test Family' LIMIT 1);

UPDATE users SET family_id = @family_id WHERE id = @user_id; UPDATE families SET owner_user_id = @user_id WHERE id = @family_id;

-- 3) Примеры транзакций (доходы/расходы) INSERT IGNORE INTO transactions (user_id, family_id, amount, type, category_id, date, comment, is_private, created_at) VALUES (@user_id, @family_id, 5000, 'income', @salary_id, '2026-01-15', 'Зарплата', FALSE, NOW()), (@user_id, @family_id, 3500, 'expense', @products_id, '2026-01-18', 'Продукты', FALSE, NOW()), (@user_id, @family_id, 900, 'expense', @transport_id, '2026-01-20', 'Проезд', FALSE, NOW()), (@user_id, @family_id, 5500, 'income', @salary_id, '2026-02-15', 'Зарплата', FALSE, NOW()), (@user_id, @family_id, 4200, 'expense', @products_id, '2026-02-18', 'Продукты', FALSE, NOW()), (@user_id, @family_id, 1200, 'expense', @other_id, '2026-02-22', 'Подарок другу', FALSE, NOW());

-- 4) Цели накоплений INSERT IGNORE INTO goals (family_id, user_id, name, target_amount, target_date, interest_rate, current_amount, auto_contribute_enabled, auto_contribute_type, auto_contribute_value, created_at, updated_at) VALUES (@family_id, @user_id, 'Отпуск', 120000, NULL, 5, 30000, TRUE, 'percentage', 10, NOW(), NOW()), (@family_id, @user_id, 'Новый ноутбук', 80000, NULL, NULL, 15000, FALSE, NULL, NULL, NOW(), NOW());

-- 5) Желания INSERT IGNORE INTO wishes (user_id, family_id, name, cost, priority, status, saved_amount, is_private, created_at, updated_at, archived, archived_at, category_id) VALUES (@user_id, @family_id, 'Наушники', 12000, 1, 'active', 0, FALSE, NOW(), NOW(), FALSE, NULL, @no_cat_id), (@user_id, @family_id, 'Путёвка', 18000, 2, 'active', 0, FALSE, NOW(), NOW(), FALSE, NULL, @no_cat_id);

-- 6) Подушка безопасности INSERT IGNORE INTO safety_pillow_settings (user_id, months, updated_at) VALUES (@user_id, 3, NOW()); INSERT IGNORE INTO safety_pillow_history (user_id, value, target_value, calculated_at) VALUES (@user_id, 0, 0, NOW());

-- 7) Уведомления INSERT IGNORE INTO notifications (user_id, remind_upcoming, notify_goal_reached, notify_budget_exceeded, created_at, updated_at) VALUES (@user_id, TRUE, TRUE, TRUE, NOW(), NOW());

-- 8) Начальный вклад в цель (опционально) INSERT IGNORE INTO goal_contributions (goal_id, amount, date, transaction_id, source_transaction_id, automatic, type) VALUES ((SELECT id FROM goals WHERE name='Отпуск' LIMIT 1), 1200, NOW(), NULL, NULL, FALSE, 'contribution');

-- END