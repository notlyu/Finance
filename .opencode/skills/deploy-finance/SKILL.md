---
name: deploy-finance
description: >
  Пайплайн деплоя Finance-проекта. Использовать при фразах "задеплой",
  "deploy", "выкатить", "запушить на сервер". Собирает, мигрирует БД,
  перезапускает Docker и проверяет health.
---

# deploy-finance — пайплайн деплоя

## Триггеры
- `"задеплой"` / `"deploy"` / `"выкатить"`
- `"запушить на сервер"`
- `"release"`
- `"выпустить версию"`

## Пайплайн

### Шаг 1: Preflight
- `git status` — проверить что нет незакоммиченных изменений
- Если есть незакоммиченные → спросить что делать (commit/stash/отмена)

### Шаг 2: Проверка кода
- `npm run lint` — линтинг
- `npm test` — тесты
- Если что-то упало → прервать деплой

### Шаг 3: Билд и миграции
- `npx prisma migrate deploy` — миграции БД
- `docker-compose build` — сборка образов

### Шаг 4: Запуск
- `docker-compose up -d` — перезапуск контейнеров
- `sleep 5` — дать время на инициализацию

### Шаг 5: Health-check
- `curl -f http://localhost:3000/health`
- Если упал → `docker-compose logs --tail=50` для диагностики
- Если успех → сообщить время деплоя

## Формат ответа

```
🚀 Deploy report — YYYY-MM-DD HH:MM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Lint: passed
✅ Tests: passed (42/42)
✅ Prisma migrate: applied 1 migration
✅ Docker build: done
✅ Docker up: ok
✅ Health-check: 200 OK

Время: 2m 34s
```

## Важно
- Если `NODE_ENV=production` — спрашивать подтверждение
- Всегда проверять health-check — не верить просто "exit code 0"
- Если health-check упал 3 раза подряд — прервать деплой
