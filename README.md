# 💰 Finance — Family Finance Tracker

Семейное приложение для управления финансами: учёт доходов/расходов, цели, желания, бюджеты, recurring-транзакции, подушка безопасности, долги, импорт/экспорт, аналитика и настраиваемая приборная панель.

[![License](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-green.svg)](package.json)
[![PostgreSQL](https://img.shields.io/badge/postgresql-15+-blue.svg)](https://www.postgresql.org)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](client/package.json)
[![Docker](https://img.shields.io/badge/docker-compose-2496ed.svg)](#-docker)

---

## Содержание

- [Возможности](#-возможности)
- [Технологии](#-технологии)
- [Быстрый старт](#-быстрый-старт)
- [Переменные окружения](#-переменные-окружения)
- [База данных](#-база-данных)
- [Разработка](#-разработка)
- [Тестирование](#-тестирование)
- [Docker](#-docker)
- [CI/CD](#-cicd)
- [Мониторинг](#-мониторинг)
- [Структура проекта](#-структура-проекта)
- [API](#-api)
- [Галерея](#-галерея)
- [Безопасность](#-безопасность)
- [Лицензия](#-лицензия)

---

## ✨ Возможности

### 🔐 Аутентификация и управление доступом
- JWT-аутентификация (access + refresh token) с auto-refresh
- Регистрация, вход, выход
- Сброс пароля через email (SMTP/Nodemailer)
- Ролевая модель: Owner / Member в рамках семьи

### 👨‍👩‍👧‍👦 Семья
- Создание семьи и приглашение участников по коду
- Общие и личные финансы в рамках семьи
- Ролевой доступ (Owner может управлять семьёй)

### 💳 Транзакции
- Доходы и расходы с привязкой к категориям и счетам
- Приватные транзакции (видит только автор)
- Фильтрация по дате, категории, типу, счету
- Автоматическое обновление баланса счёта

### 🏦 Счета
- Несколько счетов (дебетовые, кредитные, наличные)
- Автоматический пересчёт баланса при транзакциях
- Отдельный баланс для каждого счёта

### 🎯 Цели (Goals)
- Накопительные цели с дедлайном и суммой
- Автонакопление — % от каждого дохода
- Ежемесячная капитализация процентов (interest)
- Прогресс в процентах

### 🎀 Желания (Wishes)
- Список желаний с приоритетами (низкий / средний / высокий)
- Частичное финансирование желаний
- Автонакопление от доходов

### 📊 Бюджеты
- Месячные лимиты по категориям
- Сравнение план/факт
- Предупреждения при превышении
- Перенос остатка (rollover) на следующий месяц

### 🛡️ Подушка безопасности
- Целевая сумма (X месяцев покрытия расходов)
- Ежемесячные снимки баланса
- Настраиваемый период покрытия (3/6/12 месяцев)

### 💸 Долги
- Учёт долгов (кредитор, сумма, проценты)
- Частичное погашение с пересчётом остатка
- Автосоздание recurring-транзакции при создании долга

### 🔁 Recurring-транзакции
- Ежемесячное автоматическое создание транзакций по шаблону
- Cron-задача с защитой от двойного запуска
- Ручной запуск через API

### 📈 Аналитика и отчёты
- Динамика доходов/расходов (графики Chart.js)
- Распределение по категориям
- Сравнение месяц к месяцу
- Экспорт в CSV, Excel (exceljs), PDF (pdfkit + jspdf)
- Импорт из CSV / Excel с валидацией

### 🧩 Приборная панель (Dashboard)
- 10 типов виджетов: баланс, последние транзакции, цели, бюджеты, аналитика и др.
- Drag-and-drop (библиотека @dnd-kit)
- Персональная конфигурация виджетов для каждого пользователя
- Сохранение порядка в localStorage и на сервере

### 🔔 Уведомления
- In-app уведомления (превышение бюджета, достижение цели)
- Real-time через Socket.IO
- Настраиваемые типы уведомлений
- Прочитано / непрочитано

### 📋 Журнал аудита
- Неизменяемый audit-log всех значимых действий
- Привязка к пользователю и семье

### 🎨 Тема
- Светлая / тёмная тема
- Сохраняется в localStorage

---

## 🛠 Технологии

| Слой | Технология |
|:-----|:-----------|
| **Backend** | Node.js 20, Express 4 |
| **ORM** | Prisma (PostgreSQL adapter) |
| **База данных** | PostgreSQL 15+ |
| **Frontend** | React 19, React Router 7, Tailwind CSS 3 |
| **Валидация** | Zod (бекенд), react-hook-form (фронтенд) |
| **Графики** | Chart.js 4 |
| **Drag-and-drop** | @dnd-kit |
| **Auth** | JWT (HS256) + Refresh Token, bcrypt |
| **Real-time** | Socket.IO |
| **Email** | Nodemailer (SMTP) |
| **Экспорт** | exceljs, pdfkit, jspdf, html2canvas |
| **Кеширование** | In-memory (Map, TTL 5 мин, макс. 1000 записей) |
| **Логирование** | Pino |
| **Метрики** | Prometheus (prom-client) |
| **Ошибки** | Sentry SDK |
| **Тестирование** | Jest, Supertest, React Testing Library, Playwright |
| **Безопасность** | Helmet, express-rate-limit, CORS |
| **Контейнеризация** | Docker, Docker Compose |
| **CI/CD** | GitHub Actions |
| **Региistry** | GitHub Container Registry (ghcr.io) |

---

## 🚀 Быстрый старт

### Требования
- Node.js >= 20
- PostgreSQL >= 15
- npm

### Установка

```bash
git clone <repo-url>
cd Finance
npm install
cd client && npm install && cd ..
```

### Настройка окружения

Создайте `.env` в корне проекта:

```env
PORT=5000
NODE_ENV=development

# База данных
DATABASE_URL=postgresql://user:password@localhost:5432/finance_db

# JWT (сгенерировать: openssl rand -base64 32)
JWT_SECRET=your_secure_secret_key
JWT_REFRESH_SECRET=your_refresh_secret_key

# Email (опционально, для сброса пароля)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your_password
SMTP_FROM=Finance <noreply@example.com>

# Frontend URL для CORS
FRONTEND_URL=http://localhost:5173

# Sentry DSN (опционально)
# SENTRY_DSN=
```

### База данных

```bash
npx prisma generate
npx prisma db push

# Сиды (тестовые данные)
npx prisma db seed
# или
node scripts/prisma-seed.js
```

### Запуск

```bash
# Бекенд + фронтенд одновременно
npm run dev

# Только бекенд
npm start

# Только фронтенд (Vite)
cd client && npm run dev
```

Бекенд: `http://localhost:5000`
Фронтенд: `http://localhost:5173`

---

## 📦 Переменные окружения

| Переменная | Обязательно | Описание |
|:-----------|:------------|:---------|
| `PORT` | Нет | Порт сервера (по умолч. 5000) |
| `NODE_ENV` | Нет | `development` / `production` |
| `DATABASE_URL` | **Да** | Строка подключения PostgreSQL |
| `JWT_SECRET` | **Да** | Секрет JWT (мин. 32 символа) |
| `JWT_REFRESH_SECRET` | **Да** | Секрет refresh-токена |
| `JWT_EXPIRES_IN` | Нет | Время жизни access-токена (по умолч. `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | Нет | Время жизни refresh-токена (по умолч. `7d`) |
| `CORS_ORIGINS` | Нет | Разрешённые origin (через запятую) |
| `SMTP_HOST` | Нет | SMTP-сервер |
| `SMTP_PORT` | Нет | Порт SMTP |
| `SMTP_USER` | Нет | Пользователь SMTP |
| `SMTP_PASS` | Нет | Пароль SMTP |
| `SMTP_FROM` | Нет | Адрес отправителя |
| `FRONTEND_URL` | Нет | URL фронтенда для CORS |
| `SENTRY_DSN` | Нет | DSN для Sentry |
| `RATE_LIMIT_WINDOW_MS` | Нет | Окно rate limiting (мс) |
| `RATE_LIMIT_MAX` | Нет | Макс. запросов в окне |

---

## 🗄 База данных

### Модели (10)

| Модель | Назначение |
|:-------|:-----------|
| `User` | Пользователь (email, пароль, профиль, тема, валюта) |
| `Family` | Семья (название, код приглашения) |
| `FamilyMember` | Член семьи (роль: Owner/Member) |
| `FamilyInvite` | Приглашения (код, срок действия) |
| `Account` | Финансовый счёт (тип, баланс, валюта) |
| `Transaction` | Транзакция (сумма, тип, категория, счёт, приватность) |
| `Category` | Категория (иерархическая, тип: income/expense) |
| `Budget` | Бюджет (месяц, категория, лимит, rollover) |
| `Goal` | Цель (сумма, дедлайн, автопроцент, интерес) |
| `GoalContribution` | Взнос в цель |
| `Wish` | Желание (приоритет, стоимость, автопроцент) |
| `WishContribution` | Взнос в желание |
| `RecurringTransaction` | Шаблон recurring-транзакции |
| `Debt` | Долг (кредитор, сумма, проценты) |
| `DebtPayment` | Платеж по долгу |
| `Notification` | Уведомление (тип, прочитано) |
| `NotificationSetting` | Настройки уведомлений |
| `SafetyPillowSetting` | Настройки подушки (месяцев покрытия) |
| `SafetyPillowHistory` | История подушки |
| `SafetyPillowSnapshot` | Снимки подушки |
| `AuditLog` | Журнал аудита (иммутабельный) |
| `RefreshToken` | Refresh-токены |
| `PasswordResetCode` | Коды сброса пароля (15 мин) |
| `UserWidgetConfig` | Конфигурация виджетов панели |

### Миграции

```bash
# Создать миграцию
npx prisma migrate dev --name init

# Применить миграции
npx prisma migrate deploy

# Сброс БД
npx prisma migrate reset
```

---

## 🧪 Тестирование

```bash
# Все бекенд-тесты (Jest)
npm test

# API smoke-тесты
npm run test:smoke

# E2E-тесты (Playwright)
npm run test:e2e

# Фронтенд-тесты
cd client && npm test
```

### Тестовые файлы

- `tests/api.test.js` — интеграционные тесты API
- `tests/auth.test.js` — тесты аутентификации
- `tests/transactions.test.js` — тесты транзакций
- `tests/goals.test.js` — тесты целей
- `tests/wishes.test.js` — тесты желаний
- `tests/budget.test.js` — тесты бюджетов
- `tests/smoke.js` — smoke-тесты
- `tests/e2e/auth.spec.js` — E2E аутентификация
- `tests/e2e/transactions.spec.js` — E2E транзакции
- `client/src/pages/Analytics.test.jsx` — тесты аналитики
- `client/src/services/widgetStorage.test.js` — тесты виджетов

---

## 🐳 Docker

### Полный стек (production)

```bash
docker compose up -d
```

Поднимает:
- `postgres` — PostgreSQL 16 Alpine
- `backend` — Express-приложение
- `frontend` — Nginx + React SPA

### Мониторинг

```bash
docker compose -f docker-compose.monitoring.yml up -d
```

Поднимает:
- `prometheus` — сбор метрик
- `grafana` — визуализация
- `loki` — агрегация логов

---

## 🔄 CI/CD

GitHub Actions (`.github/workflows/`):

| Файл | Триггер | Что делает |
|:-----|:--------|:-----------|
| `ci.yml` | push / PR | Бекенд-тесты, фронтенд-тесты, smoke, E2E |
| `test.yml` | push / PR | Упрощённый запуск тестов |
| `deploy.yml` | push на `main` | Docker build → ghcr.io → SSH deploy |

---

## 📁 Структура проекта

```
Finance/
├── client/                    # React SPA (Vite)
│   ├── src/
│   │   ├── pages/             # 14 страниц (ленивая загрузка)
│   │   ├── widgets/           # 10 виджетов + DnD система
│   │   ├── contexts/          # AuthContext
│   │   └── services/          # API-клиент (axios), Socket.IO
│   ├── package.json
│   ├── tailwind.config.js
│   └── nginx.conf
├── controllers/               # Express-контроллеры (14)
├── routes/                    # Маршруты (14)
├── services/                  # Бизнес-логика (8)
│   ├── transactionService.js
│   ├── goalService.js
│   ├── budgetService.js
│   ├── debtService.js
│   └── ...
├── middleware/                 # auth.js, scopeMiddleware.js, errorHandler.js
├── lib/                        # Core-модули
│   ├── validation.js          # 25+ Zod схем
│   ├── errors.js              # Иерархия ошибок
│   ├── logger.js              # Pino
│   ├── cache.js               # In-memory кеш
│   └── prisma-client.js       # Prisma Client
├── prisma/                    # Schema + migrations
├── jobs/                       # Cron-задачи
│   ├── recurringJob.js        # Recurring-транзакции
│   ├── interestJob.js         # Проценты по целям
│   └── snapshotJob.js         # Снимки подушки
├── tests/                      # Jest, Playwright
├── scripts/                    # prisma-seed.js
├── monitoring/                 # prometheus.yml
├── docker-compose.yml          # Продакшен стек
├── docker-compose.monitoring.yml
├── Dockerfile                  # Multi-stage сборка
├── server.js                   # Точка входа Express
└── package.json
```

---

## 🔌 API

### 🔐 Аутентификация

| Метод | Путь | Описание |
|:------|:-----|:---------|
| POST | `/api/auth/register` | Регистрация |
| POST | `/api/auth/login` | Вход |
| POST | `/api/auth/refresh` | Обновление токена |
| POST | `/api/auth/logout` | Выход |
| POST | `/api/auth/forgot-password` | Запрос сброса пароля |
| POST | `/api/auth/reset-password` | Сброс пароля |
| GET | `/api/auth/me` | Текущий пользователь |

### 👨‍👩‍👧‍👦 Семья

| Метод | Путь | Описание |
|:------|:-----|:---------|
| POST | `/api/auth/family/create` | Создать семью |
| POST | `/api/auth/family/join` | Присоединиться по коду |
| POST | `/api/auth/family/leave` | Покинуть семью |
| GET | `/api/auth/family/settings` | Настройки семьи |
| PUT | `/api/auth/family/settings` | Обновить настройки |

### 💳 Транзакции

| Метод | Путь | Описание |
|:------|:-----|:---------|
| GET | `/api/transactions` | Список (с фильтрами) |
| POST | `/api/transactions` | Создать |
| PUT | `/api/transactions/:id` | Обновить |
| DELETE | `/api/transactions/:id` | Удалить |

### 🏦 Счета

| Метод | Путь | Описание |
|:------|:-----|:---------|
| GET | `/api/accounts` | Список счетов |
| POST | `/api/accounts` | Создать счёт |
| PUT | `/api/accounts/:id` | Обновить |
| DELETE | `/api/accounts/:id` | Удалить |
| GET | `/api/accounts/:id/balance` | Баланс счёта |

### 🎯 Цели

| Метод | Путь | Описание |
|:------|:-----|:---------|
| GET | `/api/goals` | Список целей |
| POST | `/api/goals` | Создать |
| PUT | `/api/goals/:id` | Обновить |
| DELETE | `/api/goals/:id` | Удалить |
| POST | `/api/goals/:id/contribute` | Внести средства |

### 🎀 Желания

| Метод | Путь | Описание |
|:------|:-----|:---------|
| GET | `/api/wishes` | Список желаний |
| POST | `/api/wishes` | Создать |
| PUT | `/api/wishes/:id` | Обновить |
| DELETE | `/api/wishes/:id` | Удалить |
| POST | `/api/wishes/:id/contribute` | Внести средства |

### 📊 Бюджеты

| Метод | Путь | Описание |
|:------|:-----|:---------|
| GET | `/api/budgets` | Список (с фактом) |
| POST | `/api/budgets` | Создать |
| PUT | `/api/budgets/:id` | Обновить |
| DELETE | `/api/budgets/:id` | Удалить |
| GET | `/api/budgets/check` | Проверка превышений |

### 💸 Долги

| Метод | Путь | Описание |
|:------|:-----|:---------|
| GET | `/api/debts` | Список долгов |
| POST | `/api/debts` | Создать |
| PUT | `/api/debts/:id` | Обновить |
| DELETE | `/api/debts/:id` | Удалить |
| POST | `/api/debts/:id/partial-close` | Частичное погашение |

### 🔁 Recurring-транзакции

| Метод | Путь | Описание |
|:------|:-----|:---------|
| GET | `/api/recurring` | Список шаблонов |
| POST | `/api/recurring` | Создать |
| PUT | `/api/recurring/:id` | Обновить |
| DELETE | `/api/recurring/:id` | Удалить |
| POST | `/api/recurring/execute` | Ручной запуск |

### 🛡️ Подушка безопасности

| Метод | Путь | Описание |
|:------|:-----|:---------|
| GET | `/api/safety-pillow/settings` | Настройки |
| PUT | `/api/safety-pillow/settings` | Обновить настройки |
| GET | `/api/safety-pillow/history` | История |
| GET | `/api/safety-pillow/snapshots` | Снимки |

### 📈 Аналитика

| Метод | Путь | Описание |
|:------|:-----|:---------|
| GET | `/api/reports/dynamics` | Динамика доходов/расходов |
| GET | `/api/reports/category` | По категориям |
| GET | `/api/reports/monthly-comparison` | Сравнение по месяцам |

### 📤 Импорт / Экспорт

| Метод | Путь | Описание |
|:------|:-----|:---------|
| POST | `/api/import/csv` | Импорт CSV |
| POST | `/api/import/excel` | Импорт Excel |
| GET | `/api/export/csv` | Экспорт CSV |
| GET | `/api/export/excel` | Экспорт Excel |
| GET | `/api/export/pdf` | Экспорт PDF |

### 🔔 Уведомления

| Метод | Путь | Описание |
|:------|:-----|:---------|
| GET | `/api/notifications` | Список уведомлений |
| PUT | `/api/notifications/:id/read` | Отметить прочитанным |
| GET | `/api/notifications/settings` | Настройки |
| PUT | `/api/notifications/settings` | Обновить настройки |

### 🧩 Виджеты

| Метод | Путь | Описание |
|:------|:-----|:---------|
| POST | `/api/widgets/save-order` | Сохранить порядок |

### 🏠 Dashboard

| Метод | Путь | Описание |
|:------|:-----|:---------|
| GET | `/api/dashboard` | Агрегированные данные |

### 📂 Категории

| Метод | Путь | Описание |
|:------|:-----|:---------|
| GET | `/api/categories` | Список категорий |
| POST | `/api/categories` | Создать |
| PUT | `/api/categories/:id` | Обновить |
| DELETE | `/api/categories/:id` | Удалить |
| POST | `/api/categories/batch` | Пакетное создание |

### 🩺 Health / Метрики

| Метод | Путь | Описание |
|:------|:-----|:---------|
| GET | `/api/health` | Health check |
| GET | `/metrics` | Prometheus метрики |

> 🔒 Все защищённые маршруты требуют заголовок `Authorization: Bearer <token>` или cookie.

---

## 🛡 Безопасность

Подробный аудит — в [SECURITY.md](SECURITY.md).

### Реализовано
- JWT (HS256) + refresh token с ротацией
- Хеширование паролей (bcrypt, cost 10)
- Валидация всех входных данных (Zod)
- Rate limiting на auth-эндпоинтах
- Helmet security headers
- CORS (настраиваемые origin)
- IDOR-защита во всех контроллерах
- Санитизация ошибок (логи без чувствительных данных)

### Наработки необходимые для продакшена
- Использовать менеджер секретов (AWS Secrets Manager, HashiCorp Vault)
- Генерировать надёжные секреты: `openssl rand -base64 32`
- Явно указать `CORS_ORIGINS`
- Включить SSL/TLS
- Настроить агрегацию логов (Loki / ELK)
- Установить Sentry DSN

---

## 📝 Лицензия

ISC License — см. [LICENSE](LICENSE).
