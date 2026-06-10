---
name: scope-migration-helper
description: >
  Помощник миграции на v3 API (scope-разделение роутов).
  Использовать при фразах "scope миграция", "проверь роуты",
  "v3 migration". Анализирует роуты и контроллеры на готовность.
---

# scope-migration-helper — помощник scope-миграции v3

## Триггеры
- `"scope миграция"` / `"проверь роуты"`
- `"v3 migration"` / `"v3"` (в контексте миграции)
- `"какие роуты не мигрированы"`

## Что проверяет

### 1. Старые роуты
Ищет в `routes/*.js` паттерны:
```js
// ❌ Старый стиль (без scope)
router.get('/api/transactions')
router.post('/api/categories')

// ✅ Новый стиль
router.get('/api/personal/transactions')
router.get('/api/family/transactions')
```

### 2. Наличие scopeMiddleware
Проверяет что в каждом файле роутов есть:
```js
const scopeMiddleware = require('../middleware/scopeMiddleware');
// ...
router.use(scopeMiddleware);
// или
router.get('/path', scopeMiddleware, handler);
```

### 3. Использование req.scope в контроллерах
Ищет что каждый handler в `controllers/*.js` использует:
```js
const { scope } = req;
// или
req.scope
```

### 4. Prisma запросы с scope-фильтром
Проверяет что в сервисах есть:
```js
where: { scope }
```

## Формат отчёта

```
📋 Scope Migration Report — YYYY-MM-DD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Полностью мигрированы:
  - routes/transactionRoutes.js
  - routes/categoryRoutes.js

⚠️  Частично:
  - routes/budgetRoutes.js (scopeMiddleware есть, но 2 роута без scope)

❌ Не мигрированы:
  - routes/debtRoutes.js
  - routes/recurringRoutes.js

📊 Прогресс: 12/18 роутов = 67%
```

## Важно
- Не изменять файлы — только анализ
- Отмечать роуты которые используют `req.params.scope` вместо `req.scope`
- Этот скилл станет неактуален после завершения v3 миграции — удалить
