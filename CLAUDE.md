# CLAUDE.md — Finance Project

## Project
Full-stack finance app (Node.js+Express 5, Prisma 7, PostgreSQL, Zod 4).
Личные и семейные финансы: учёт доходов/расходов, цели, желания, долги, подушка безопасности, бюджеты, регулярные операции.

## Commands
- `npm run dev` — запуск dev-сервера (nodemon)
- `npm test` — все тесты (Jest)
- `npm run test:e2e` — Playwright e2e
- `npm run lint` — линтинг (если настроен)
- `npx prisma migrate dev` — миграция БД
- `npx prisma studio` — просмотр БД

## Conventions
- Всегда запускать lint + тесты перед commit/push
- API роуты: `/api/personal/*` и `/api/family/*` (v3)
- Ошибки через `AppError` из `lib/errors.js`
- Валидация через Zod схемы
- Scope (personal/family/shared) через `req.scope` из `scopeMiddleware`
- Логи через Pino (`lib/logger.js`)

## Session
- `spin-up` при старте: читает git status, glossary, pinboard, последний session log
- `wrap-up` в конце: session log → pinned items → commit
- Session logs: `Code/_Claude Session Logs/`
