---
name: api-doc-sync
description: >
  Синхронизация API.md с фактическими endpoint'ами в routes/.
  Использовать при фразах "синхронизируй API", "api-doc",
  "обнови документацию", "сверь документацию".
---

# api-doc-sync — синхронизация API документации

## Триггеры
- `"синхронизируй API"` / `"api-doc"`
- `"обнови документацию"` / `"сверь документацию"`
- `"актуальность API"` / `"проверь API.md"`

## Процедура

### Шаг 1: Сбор актуальных endpoint'ов
- Прочитать все файлы в `routes/`
- Извлечь паттерны: `router.get(...)`, `router.post(...)`, `router.put(...)`, `router.delete(...)`, `router.patch(...)`
- Собрать: метод, путь, middleware (auth, scope)

### Шаг 2: Чтение API.md
- Прочитать `API.md`
- Извлечь все задокументированные endpoint'ы
- Собрать: метод, путь, описание

### Шаг 3: Сравнение
- Endpoint'ы в коде но не в API.md → **незадокументированные**
- Endpoint'ы в API.md но не в коде → **устаревшие**
- Endpoint'ы где путь совпадает но метод различается → **несоответствие**

### Шаг 4: Отчёт
```
📖 API Sync Report — YYYY-MM-DD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 Незадокументировано (3):
  + GET  /api/personal/reports/summary
  + POST /api/personal/export/csv
  + DELETE /api/personal/accounts/:id/force

🗑️  Устарело (1):
  - POST /api/transactions  →  заменился на /api/personal/transactions

⚠️  Несоответствие (0):

📊 API.md: 24 endpoint'а из 27 актуальны (89%)
```

## Важно
- Только анализ — не изменять API.md без подтверждения
- Игнорировать middleware-роуты (router.use)
- Учитывать dynamic параметры (`:id`, `:slug`) как паттерны
