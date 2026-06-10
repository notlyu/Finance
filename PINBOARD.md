# Pinboard

## To-Do (по результатам аудита кода)

### 🔴 Фаза 1: Safety (сделать сейчас)
- [ ] [2026-06-10] Добавить `onDelete` на все `@relation` в Prisma → миграция
- [ ] [2026-06-10] Добавить `process.on('unhandledRejection')` + `uncaughtException` в server.js
- [ ] [2026-06-10] Исправить `req.body` → `req.validated` в goalController.js:227
- [ ] [2026-06-10] Исправить `req.body` → `req.validated` в budgetController.js:303
- [ ] [2026-06-10] Исправить `req.body` → `req.validated` в authController.js:685
- [ ] [2026-06-10] Исправить `next(err)` после `res.json()` в goalController.js:499
- [ ] [2026-06-10] Пересохранить transactionService.js — mojibake (битая кириллица)
- [ ] [2026-06-10] Исправить `raw Error` → `AppError` в accountController, debtController, debtService

### 🟡 Фаза 2: Data Integrity
- [ ] [2026-06-10] Обернуть `updateTransaction` в `$transaction`
- [ ] [2026-06-10] Обернуть `fundWish` в `$transaction`
- [ ] [2026-06-10] Обернуть `createDebt` + `recurring` в `$transaction`
- [ ] [2026-06-10] Обернуть `leaveFamily` в `$transaction`
- [ ] [2026-06-10] Добавить индексы: Category.user_id, Category.family_id, Goal.category_id, Budget.category_id
- [ ] [2026-06-10] Исправить `sanitizeHtml` — добавить `&` экранирование
- [ ] [2026-06-10] Исправить дублирование PrismaClientKnownRequestError в errors.js
- [ ] [2026-06-10] scopeMiddleware — внедрить req.scope в контроллеры или удалить

### 🟢 Фаза 3: v3 Migration + Тесты
- [ ] [2026-06-10] Добавить 8 scoped-роутов (/api/personal/accounts, /api/personal/categories, ...)
- [ ] [2026-06-10] DELETE → 204, PATCH вместо PUT
- [ ] [2026-06-10] validateQuery на все GET-эндпоинты
- [ ] [2026-06-10] Исправить тест accounts.test.js:81 (ожидает 500 вместо 404)
- [ ] [2026-06-10] Написать тест на атомарность createTransaction
- [ ] [2026-06-10] Написать scope-тесты (личные vs семейные)

### ⚪ Фаза 4: Чистка
- [ ] [2026-06-10] Удалить мёртвый код: fix_scope.js, showCelebration, .btn-* классы
- [ ] [2026-06-10] Удалить Sequelize/Mongo из errorTranslations
- [ ] [2026-06-10] Настроить ESLint/Prettier (сейчас `npm run lint` не существует)
- [ ] [2026-06-10] Настроить Sentry (установлен, но не подключен)
- [ ] [2026-06-10] Протестировать command-phrase "проверь код" — запускает lint + test
- [ ] [2026-06-10] Протестировать авто-обнаружение скиллов

## Ideas
- [ ] [2026-06-10] Создать command-phrase "аудит кода" — запускает полный аудит (db-audit + scope-check + transaction-check)

## Data Issues

---

## Done
- [x] [2026-06-10] Создать ТЗ-заметку в Obsidian с планом реализации навыков ✓ completed 2026-06-10
- [x] [2026-06-10] Настроить db-audit скилл — проверка целостности БД ✓ completed 2026-06-10
- [x] [2026-06-10] Настроить dbg скилл — debug-помощник ✓ completed 2026-06-10
- [x] [2026-06-10] Создать .opencode/ директорию для кастомных скиллов ✓ completed 2026-06-10
- [x] [2026-06-10] Инициализировать GLOSSARY.md и PINBOARD.md ✓ completed 2026-06-10
- [x] [2026-06-10] Создать кастомные скиллы: deploy-finance, scope-migration-helper, api-doc-sync ✓ completed 2026-06-10
- [x] [2026-06-10] Провести полный аудит кода (57 файлов) — найдено 10 critical + 15 high ошибок ✓ completed 2026-06-10
- [x] [2026-06-10] Обновить ТЗ в Obsidian с результатами аудита и планом исправлений ✓ completed 2026-06-10
