---
name: db-audit
description: >
  Проверка целостности БД в Finance-проекте (Prisma/PostgreSQL).
  Использовать при фразах "проверь БД", "audit database",
  "целостность данных", "проверь базу". Проверяет orphan-записи,
  scope-консистентность, нарушенные foreign keys.
---

# db-audit — проверка целостности БД

## Триггеры
- `"проверь БД"` / `"проверь базу"`
- `"audit database"`
- `"целостность данных"`
- `"db-audit"`

## Что проверяет

### 1. Сиротские транзакции (Transaction без Account)
```sql
SELECT COUNT(*) FROM "Transaction" WHERE "account_id" NOT IN (SELECT id FROM "Account");
```

### 2. Сиротские категории (Category без User, кроме системных)
```sql
SELECT COUNT(*) FROM "Category"
LEFT JOIN "User" ON "Category"."user_id" = "User"."id"
WHERE "User"."id" IS NULL AND "is_system" = false;
```

### 3. Goal с некорректным auto_contribute_percent
```sql
SELECT id, name, auto_contribute_percent FROM "Goal"
WHERE "auto_contribute_percent" IS NOT NULL
  AND ("auto_contribute_percent" <= 0 OR "auto_contribute_percent" > 100);
```

### 4. Budget с некорректным limit
```sql
SELECT id, name, limit_amount FROM "Budget" WHERE "limit_amount" <= 0;
```

### 5. SafetyPillowSetting с отрицательными months
```sql
SELECT COUNT(*) FROM "SafetyPillowSetting" WHERE "months" <= 0;
```

### 6. Scope-консистентность
Транзакции с `scope = 'personal'` но с заполненным `family_id` (и наоборот):
```sql
-- personal + family_id
SELECT id FROM "Transaction" WHERE "scope" = 'personal' AND "family_id" IS NOT NULL;
-- family + family_id IS NULL
SELECT id FROM "Transaction" WHERE "scope" = 'family' AND "family_id" IS NULL;
```

### 7. Семья без владельца
```sql
SELECT id, name FROM "Family" WHERE "owner_user_id" NOT IN (SELECT id FROM "User");
```

### 8. FamilyMember/OWNER mismatch
```sql
SELECT fm.id, fm.user_id, fm.family_id, f.owner_user_id
FROM "FamilyMember" fm
JOIN "Family" f ON fm."family_id" = f."id"
WHERE fm."role" = 'OWNER' AND fm."user_id" != f."owner_user_id";
```

## Формат отчёта

```
🔍 db-audit report — YYYY-MM-DD
━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Транзакции без account: 0
✅ Сиротские категории: 0
⚠️  Goal с некорректным auto_contribute: 2 (id: 12, 45)
✅ Budget с limit <= 0: 0
✅ SafetyPillow с months <= 0: 0
⚠️  Scope mismatch: 1 (Transaction id: 89 — personal + family_id)
✅ Семьи без owner: 0
⚠️  FamilyMember/OWNER mismatch: 1 (member id: 7)

Итого: 3 warnings, 0 errors
```

### Дополнительные проверки (по результатам аудита)

**9. Отсутствующие индексы на FK**
```sql
-- Проверка что индексы существуют
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('Category', 'Goal', 'Budget', 'RecurringTransaction')
  AND indexdef NOT LIKE '%_pkey%'
ORDER BY tablename;
-- Должны быть: Category.user_id, Category.family_id, Goal.category_id,
-- Budget.category_id, RecurringTransaction.user_id, RecurringTransaction.category_id
```

**10. Наличие `onDelete` в Prisma (проверка на уровне схемы)**
```bash
# Проверить что schema.prisma содержит onDelete
grep -c "onDelete:" prisma/schema.prisma
# Должно быть 43 (добавлено в Этапе 4.1, сессия 2026-06-10). Если < 43 — регрессия.
```

**11. Сиротские RecurringTransaction без Account**
```sql
SELECT COUNT(*) FROM "RecurringTransaction"
WHERE "account_id" IS NOT NULL
  AND "account_id" NOT IN (SELECT id FROM "Account");
```

**12. Budgets с month = NULL (нет дефолта в схеме)**
```sql
SELECT COUNT(*) FROM "Budget" WHERE "month" IS NULL;
```

## Формат отчёта (расширенный)

```
🔍 db-audit report — YYYY-MM-DD
━━━━━━━━━━━━━━━━━━━━━━━━━
[Базовые проверки 1-8]
...
📊 Дополнительные проверки
━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Индексы Category: 2/2
✅ Индексы Goal: 1/1
✅ Индексы Budget: 1/1
✅ onDelete в Prisma: 43 (норма после Этапа 4.1)
✅ Recurring без Account: 0
✅ Budget с month IS NULL: 0

Итого: 0 warnings, 0 errors
```

## Порядок выполнения

1. Подключиться к БД через Prisma (`lib/prisma-client.js`)
2. Выполнить все 12 проверок через `prisma.$queryRawUnsafe()` (или через Prisma API где возможно)
3. Собрать отчёт
4. Если есть ошибки — предложить фикс для каждого типа ошибки
5. Если warnings — отметить что требуется ручная проверка
6. Если MIGRATION NEEDED — сгенерировать команду миграции

## Важно
- Только read-only операции — НЕ изменять данные
- Если БД недоступна — сообщить и предложить проверить `docker-compose.yml` и `.env`
- Все запросы выполнять в `try/catch` — одна упавшая проверка не должна прерывать весь audit
