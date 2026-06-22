---
name: ondelete-migration
description: >
  Безопасное добавление onDelete-правил на foreign keys в Prisma-схеме
  Finance-проекта. Использовать при фразах "ondelete миграция",
  "почини БД", "добавь onDelete", "каскадное удаление", "новый FK",
  "новая связь в схеме". Проверяет FK violations ПЕРЕД миграцией,
  генерирует и применяет миграцию безопасно.
---

# ondelete-migration — onDelete для foreign keys

## Триггеры
- `"ondelete миграция"` / `"добавь onDelete"`
- `"почини БД"` (в контексте схемы/связей)
- `"каскадное удаление"`
- При создании новой `@relation` в `prisma/schema.prisma`

## Контекст проекта (важно!)

- onDelete УЖЕ добавлен на все 43 связи (сессия 2026-06-10, Этап 4.1).
- Стратегия: **Cascade** для владения (user→его данные), **SetNull** для опциональных
  ссылок (audit, family_id у User), **Restrict** для справочников (category_id).
- ⚠️ **Migration drift**: dev-БД развивалась через `db push`, а не миграции.
  Существует только `20260411092957_init`. Перед продакшен-деплоем нужен baseline.

Этот скилл — для **будущих** FK и для безопасного применения изменений.

## Стратегия onDelete (эталон)

| Тип связи | Правило | Пример |
|-----------|---------|--------|
| Владение (родитель→дети) | `Cascade` | User → Transaction, Goal, Budget |
| Опциональная ссылка | `SetNull` | User.family_id, AuditLog.user_id, Transaction.goal_id |
| Справочник (нельзя удалить если используется) | `Restrict` | Transaction.category_id, Budget.category_id |

Правило: `onDelete: SetNull` требует, чтобы FK-поле было **nullable** (`Int?`).

## Порядок работы

### Шаг 1 — проверить FK violations ПЕРЕД миграцией (КРИТИЧНО)
Для Cascade/Restrict проверить, что нет orphan-записей, которые сломают миграцию:
```sql
-- пример: транзакции, ссылающиеся на несуществующую категорию
SELECT COUNT(*) FROM "Transaction" t
LEFT JOIN "Category" c ON t."category_id" = c."id"
WHERE t."category_id" IS NOT NULL AND c."id" IS NULL;
```
Если есть orphans → сначала почистить данные (см. скилл `db-audit`), потом мигрировать.

### Шаг 2 — отредактировать схему
Добавить `onDelete:` (и `onUpdate:` при необходимости) в `@relation`:
```prisma
category Category @relation(fields: [category_id], references: [id], onDelete: Restrict)
```

### Шаг 3 — применить
- **Прод / правильный flow:** `npx prisma migrate dev --name add_ondelete_<table>`
- **Dev с drift (текущая ситуация):** изменения onDelete — это только метаданные FK,
  применяй через `npx prisma db push` (не теряет данные), либо сначала сделай baseline.

### Шаг 4 — верифицировать в БД
```sql
SELECT
  tc.constraint_name, tc.table_name, rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;
```
Сверить `delete_rule` (CASCADE / SET NULL / RESTRICT / NO ACTION) с эталоном.

### Шаг 5 — регенерировать клиент и прогнать тесты
```bash
npx prisma generate
npm test
```

## Чеклист baseline (для устранения drift перед продом)
1. `npx prisma migrate diff --from-schema-datasource --to-schema-datamodel` — увидеть расхождение
2. Создать baseline-миграцию из текущего состояния
3. `npx prisma migrate resolve --applied <migration>` на проде

## Важно
- НЕ запускать `migrate dev` на проде (он может сбросить БД при drift) — только `migrate deploy`
- Cascade — самое опасное: проверь, что не удалит больше, чем ожидаешь
- После любой миграции — `npx prisma generate` + `npm test`
- onDelete меняет только поведение FK на уровне БД, не данные (если нет orphans)
