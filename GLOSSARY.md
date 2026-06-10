# Glossary

<!-- Project-specific command-phrases, definitions, and abbreviations. -->
<!-- Command-Phrases load eagerly at session start (via /spin-up); Definitions and -->
<!-- Abbreviations load lazily / on demand. Manage with /glossary. -->

## Command-Phrases
- **"проверь код"** — запустить `npm run lint` и `npm test` (⚠️ lint не настроен!)
- **"статус"** — показать статус проекта (git, тесты, БД)
- **"задеплой"** — запустить пайплайн деплоя (build → migrate → up → health-check)
- **"проверь БД"** — запустить db-audit (8 проверок целостности)
- **"что нового"** — показать последние git log + изменения
- **"аудит кода"** — запустить комбо: db-audit + scope-check + transaction-check
- **"почини БД"** — запустить ondelete-migration (Prisma onDelete)

## Definitions
- **scope** — контекст данных: `personal` / `family` / `shared`; определяет видимость записей
- **safety pillow** — подушка безопасности: `среднемесячные_расходы × months`
- **auto_contribute** — автоматическое отчисление процента от дохода на цель или желание
- **mode** — режим приложения: личные финансы / семейные финансы (переключается в header)
- **widget** — конфигурируемый блок на дашборде (настройки в `UserWidgetConfig`)
- **BudgetType** — `income` (доход) или `expense` (расход)
- **FamilyRole** — роль в семье: `OWNER` / `ADMIN` / `MEMBER` / `VIEWER`
- **AuditLog** — таблица логов изменений с JSON-полями `changes` и `metadata`
- **RecurringTransaction** — регулярная операция с `day_of_month`, `start_month`, `skip_next`
- **FailedJob** — очередь джобов с `payload` (JSON), `attempts`, `max_attempts`
- **InviteStatus** — статус приглашения в семью: `active` / `used` / `revoked`
- **Scope** — enum: `personal | family | shared` (Prisma enum)
- **onDelete** — Prisma директива `@relation(onDelete: Cascade/SetNull/Restrict)` — отсутствует во всей схеме, нужна миграция
- **Mojibake** — битая кириллица в `services/transactionService.js` (строки вида `╨í╨║╤Ç╤ï╤é╨╛`)
- **$transaction** — `prisma.$transaction()` — atomic write operation — отсутствует в 6+ местах
- **N+1** — паттерн: N запросов в цикле вместо одного JOIN — найден в transactionService, csvImportService
- **scopeMiddleware** — middleware в `middleware/scopeMiddleware.js` — устанавливает `req.scope`, НО ни один контроллер его не читает (мёртвый код)
- **validateQuery** — Zod-валидация query-параметров для GET-запросов — не реализована нигде
- **unhandledRejection** — `process.on('unhandledRejection')` — отсутствует, процесс падает при любой rejected Promise

## Abbreviations
