# Техническое задание на доработку приложения «Финансы» (версия 3.0)

> Составлено на основе аудита кодовой базы, анализа TZ_v2.md и «Списка проблем».
> Дата: 2026-06

---

## 0. Принципы версии 3.0

1. **Fix first, feature second** — все CRITICAL-баги из аудита устраняются до добавления новых функций.
2. **Единая дизайн-система** — унифицированы токены скруглений, типографика, иконки, состояния загрузки.
3. **API-контракт** — маршруты `/api/personal/*` и `/api/family/*` полностью разделены; ответы унифицированы.
4. **Безопасность по умолчанию** — токены только в httpOnly cookie, CSRF-защита, Zod на query-параметры.
5. **Покрытие тестами** — каждая новая бизнес-фича сопровождается unit + integration тестом.

---

## 1. Архитектура

### 1.1. Разделение пространств (Backend)

**Проблема:** В `server.js:142-145` маршруты `/api/personal` и `/api/family` указывают на один и тот же `dashboardRoutes`. Остальные 16 роутеров продолжают работать через единый `/api/*` без разделения scope.

**Решение:**

Создать единый middleware `scopeMiddleware.js`, который определяет `req.scope` из URL (`personal` | `family`) и прокидывает его во все контроллеры. Это избавляет от дублирования маршрутов и делает логику скоупа явной.

```
middleware/
  scopeMiddleware.js   — извлекает scope из URL, пишет req.scope
```

Маршруты переходят на схему:
```
/api/personal/transactions
/api/personal/goals
/api/family/transactions
/api/family/goals
... и т.д.
```

Старые `/api/transactions` и пр. остаются как deprecated-алиасы на переходный период (6 недель), затем удаляются.

### 1.2. Слой сервисов

**Проблема:** Контроллеры вызывают `transactionService` без `$transaction` (Prisma). Операции создания транзакции + обновления бюджета + автопополнения цели — не атомарны.

**Решение:**

Обернуть в `prisma.$transaction(async (tx) => { ... })`:
- `transactionService.createTransaction`
- `transactionService.updateTransaction`
- `transactionService.deleteTransaction`
- `goalService.contribute`

### 1.3. Форматы ответов

**Проблема:** Два формата ошибок в обиходе: `{ message }` и `{ side, error, message }`. DELETE возвращает 200 вместо 204. PUT вместо PATCH там, где меняется одно поле.

**Решение:**

Единый конверт ошибки через `errorHandler.js`:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "...",
    "details": [...]
  }
}
```

HTTP-коды:
- `DELETE` → `204 No Content`
- Частичное обновление → `PATCH`

### 1.4. Валидация query-параметров

**Проблема:** Zod применяется только к `req.body`. Query-параметры парсятся вручную.

**Решение:**

Добавить `validate(schema, 'query')` middleware во все GET-эндпоинты. Схемы — в `lib/validation.js`.

---

## 2. Безопасность

### 2.1. Токены (CRITICAL)

**Проблема:** Access token, refresh token и expiry хранятся в `localStorage` (`AuthContext.jsx:75-77`, `api.js:72-74`). Любой XSS украдёт их.

**Решение:**
- Access token держать только в памяти (переменная модуля `api.js`, не `localStorage`).
- Refresh token — только в `httpOnly; Secure; SameSite=Strict` cookie (бэкенд уже умеет выставлять cookie).
- `localStorage` оставить только для `currentSpace` и настроек UI (тема, язык).

### 2.2. Рефреш-токен (CRITICAL)

**Проблема:** Бэкенд возвращает `{ message: 'Token refreshed' }`, фронтенд ожидает `{ token, refreshToken, refreshTokenExpiresAt }` — несоответствие контракта.

**Решение:**

Бэкенд `authController.js:600-651` должен возвращать:
```json
{ "accessToken": "...", "expiresIn": 900 }
```
Refresh token идёт в httpOnly cookie (Set-Cookie), не в теле ответа.

`api.js` interceptor использует только `accessToken` из тела и ротирует его в памяти.

### 2.3. Race condition в refresh

**Проблема:** Если несколько запросов параллельно получают 401, каждый запускает refresh. Race condition ломает очередь.

**Решение:**

Стандартный паттерн «один промис на весь refresh»:
```js
let refreshPromise = null;
// при 401: если !refreshPromise, создать; иначе — await существующего
```

### 2.4. Logout (CRITICAL)

**Проблема:** Logout требует валидный токен; при истёкшем токене серверная сессия не очищается.

**Решение:**

Эндпоинт `POST /api/auth/logout` принимает refresh token из cookie и инвалидирует его без проверки access token.

### 2.5. CSRF

Добавить `csurf` (или double submit cookie pattern) для всех POST/PUT/PATCH/DELETE.

### 2.6. Password hash в `req.user`

**Проблема:** `password_hash` присутствует в объекте `req.user` — может утечь через логи.

**Решение:**

В middleware `auth.js` при SELECT пользователя явно исключить `password_hash` через `omit`:
```js
const user = await prisma.user.findUnique({ where: { id }, omit: { password_hash: true } });
```

---

## 3. Модель данных — изменения

### 3.1. User — новые поля
```
+ notification_settings Json   @default("{}")
+ theme_preference      String @default("system")
+ timezone              String @default("Europe/Moscow")
+ two_factor_enabled    Boolean @default(false)
+ email_verified        Boolean @default(false)
+ email_verify_token    String?
+ deleted_at            DateTime?   // soft delete
```

### 3.2. Transaction — новые поля
```
+ is_private    Boolean @default(false)
```

### 3.3. RecurringTransaction — новые поля
```
+ end_date      DateTime?
+ skip_next     Boolean @default(false)
```

### 3.4. Debt — новые поля
```
+ debt_type     String @default("loan")  // loan | owe
```
Поле `debt_type` различает «я должен» и «мне должны».

### 3.5. Category — исправление
Добавить Route + Controller для `PATCH /api/categories/:id` (схема в `validation.js` уже есть, роута нет).

### 3.6. Пагинация

Все эндпоинты без пагинации должны принять `page` + `limit`:
- `GET /api/goals`
- `GET /api/wishes`
- `GET /api/budgets`
- `GET /api/recurring`
- `GET /api/debts`
- `GET /api/accounts`
- `GET /api/categories`

Стандартный ответ:
```json
{
  "data": [...],
  "pagination": { "page": 1, "limit": 20, "total": 87, "totalPages": 5 }
}
```

---

## 4. Функциональность — что дорабатывать

### 4.1. Регулярные платежи

| # | Задача | Приоритет |
|---|--------|-----------|
| 1 | **Редактирование** — добавить `PUT /api/recurring/:id` и форму | P0 |
| 2 | Поле `end_date` — дата окончания регулярного платежа | P1 |
| 3 | «Пропустить следующий» — поле `skip_next`, cron его учитывает | P1 |
| 4 | Фильтр по типу и статусу на странице | P1 |
| 5 | Поиск по названию/комментарию | P2 |

### 4.2. Долги (Debts)

| # | Задача | Приоритет |
|---|--------|-----------|
| 1 | **Редактирование** — `PUT /api/debts/:id` и форма | P0 |
| 2 | Вычисление ближайшего платежа из `monthly_payment` + `start_date` | P0 |
| 3 | `debt_type` (я должен / мне должны) | P1 |
| 4 | Фильтры, поиск | P1 |
| 5 | График амортизации (опционально) | P3 |

### 4.3. Категории

| # | Задача | Приоритет |
|---|--------|-----------|
| 1 | `PATCH /api/categories/:id` — роут + контроллер | P0 |
| 2 | UI переименования категории в Настройках | P0 |

### 4.4. Настройки

| # | Задача | Приоритет |
|---|--------|-----------|
| 1 | Изменение имени и email | P0 |
| 2 | Удаление аккаунта (soft delete) | P1 |
| 3 | Смена валюты по умолчанию | P1 |
| 4 | Часовой пояс | P2 |
| 5 | Верификация email при регистрации | P1 |
| 6 | Тестовое уведомление | P2 |

### 4.5. Транзакции

| # | Задача | Приоритет |
|---|--------|-----------|
| 1 | Фильтр по счёту (`account_id` в `buildParams`) | P0 |
| 2 | Фильтр по диапазону суммы | P1 |
| 3 | Фильтр по члену семьи | P1 |
| 4 | Поиск по сумме, категории (не только комментарию) | P1 |
| 5 | Изменить дефолтный диапазон дат с «сегодня» на «текущий месяц» | P0 |
| 6 | Массовое удаление (batch endpoint) | P2 |

### 4.6. Бюджеты

| # | Задача | Приоритет |
|---|--------|-----------|
| 1 | Редактирование категории, типа, месяца после создания | P1 |
| 2 | Фильтр по типу (доход/расход) | P1 |
| 3 | Фильтр по прогрессу | P2 |

### 4.7. Цели и желания

| # | Задача | Приоритет |
|---|--------|-----------|
| 1 | UI для архивации (кнопка на карточке) | P0 |
| 2 | Убрать мёртвый `showCelebration` — заменить на toast при 100% | P0 |
| 3 | Поиск по названию | P1 |

### 4.8. Аналитика

| # | Задача | Приоритет |
|---|--------|-----------|
| 1 | Drill-down: клик на сектор пончика → список транзакций | P1 |
| 2 | Сравнение периодов (MoM, YoY) | P2 |
| 3 | Net worth график | P2 |
| 4 | Прогноз расходов до конца месяца | P2 |
| 5 | Фикс экспорта — экспортировать данные аналитики, не транзакции | P1 |

---

## 5. UI/UX — дизайн-система

### 5.1. Токены Tailwind (унификация)

В `tailwind.config.js` определить:
```js
borderRadius: {
  'sm': '6px',    // rounded-sm — мелкие элементы: бейджи, чипы
  'md': '12px',   // rounded-md — инпуты, кнопки
  'lg': '16px',   // rounded-lg — карточки
  'xl': '24px',   // rounded-xl — модальные окна
}
```
Убрать `rounded-2xl`, `rounded-3xl`, `rounded-[1.5rem]`, `rounded-[2rem]` из всего кода.

### 5.2. Типографическая шкала

| Класс | Размер | Использование |
|-------|--------|---------------|
| `text-page` | 28px / 700 | Заголовок страницы |
| `text-section` | 20px / 600 | Заголовок секции |
| `text-body` | 15px / 400 | Основной текст |
| `text-caption` | 12px / 400 | Подписи, метки |

Прописать в `tailwind.config.js` через `extend.fontSize`.

### 5.3. Состояния загрузки

Везде где сейчас `animate-spin` полностраничный — заменить на `Skeleton.jsx` (компонент уже есть, не используется).

Паттерн:
```jsx
if (isLoading) return <SkeletonList count={5} />;
if (isError) return <ErrorState onRetry={refetch} />;
if (!data.length) return <EmptyState ... />;
return <List data={data} />;
```

### 5.4. Тема

Создать `useTheme()` хук (`client/src/utils/useTheme.js`):
```js
export function useTheme() {
  // читает/пишет localStorage['theme'] + toggles html.classList
}
```
Убрать дублированную логику из `App.js`, `Settings.jsx` и других файлов.

### 5.5. Иконки

Единая система: Material Symbols (уже подключены). Убрать эмодзи из navigation и заголовков. Использовать `<span className="material-symbols-outlined">...</span>` везде единообразно.

### 5.6. Утилита `cn()`

Добавить `client/src/utils/cn.js`:
```js
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
export const cn = (...args) => twMerge(clsx(args));
```
Использовать вместо ручной конкатенации классов.

### 5.7. Мобильная версия

| Задача | Приоритет |
|--------|-----------|
| Добавить гамбургер-кнопку (открытие мобильного меню) | P0 |
| Touch targets ≥ 44px для таб-бара | P0 |
| Размер текста таб-бара `text-xs` (12px) вместо `text-[10px]` | P0 |

### 5.8. Доступность

| Задача | Приоритет |
|--------|-----------|
| `aria-label` на иконочных кнопках | P0 |
| `role="dialog"`, `aria-modal`, фокус-ловушка в Modal.jsx | P0 |
| Escape закрывает модалки | P0 |
| `aria-current="page"` в навигации | P1 |

---

## 6. Рефакторинг — устранение дублирования

| Дубликат | Решение |
|----------|---------|
| `localDateStr()` — 5 копий | Оставить только `client/src/utils/date.js`, убрать остальные |
| Toggle switch — 7+ копий | Использовать `Toggle.jsx` (уже есть в `components/ui/`) |
| Полностраничный спиннер — 7+ копий | Компонент `PageLoader` из `App.js` вынести в `components/ui/` |
| Логика contribution (цели и желания) | Единый `useContribute(entityType)` хук |
| Вёрстка ошибок — 5+ копий | `ErrorState.jsx` компонент в `components/ui/` |

---

## 7. Мёртвый код — удалить

| Файл | Что удалить |
|------|-------------|
| `GoalsWishes.jsx:23` | `showCelebration` — заменить на toast |
| `Debts.jsx:472-474` | Кнопка «Досрочное погашение» — реализовать или удалить |
| `SafetyPillow.jsx:281` | Кнопка «Подробнее» — реализовать или удалить |
| `index.css:179-237` | Классы `.btn-*` — либо использовать в `Button.jsx`, либо удалить |
| `familyRoleService.js:22` | `setUserRole()` — добавить route или удалить |
| `fix_scope.js` (корень) | Одноразовый скрипт — удалить |

---

## 8. Тестирование

### 8.1. Покрытие (цели)

| Слой | Текущее | Цель |
|------|---------|------|
| Backend unit | ~60% | 80% |
| Backend integration | ~50% | 75% |
| Frontend unit | ~40% | 70% |
| E2E | 3 сценария | 10 сценариев |

### 8.2. Новые тесты — обязательные

- `auth.test.js` — refresh race condition, logout без токена
- `transactions.test.js` — атомарность createTransaction
- `debts.test.js` — вычисление ближайшего платежа
- `recurring.test.js` — skip_next, end_date
- E2E: регистрация → онбординг → создание транзакции → выход

---

## 9. API — итоговая структура (v3)

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
GET    /api/auth/me
PUT    /api/auth/me              (имя, email)
POST   /api/auth/change-password
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
DELETE /api/auth/account         (soft delete)

GET    /api/{scope}/transactions
POST   /api/{scope}/transactions
GET    /api/{scope}/transactions/:id
PUT    /api/{scope}/transactions/:id
DELETE /api/{scope}/transactions/:id

GET    /api/{scope}/goals
POST   /api/{scope}/goals
PUT    /api/{scope}/goals/:id
DELETE /api/{scope}/goals/:id
POST   /api/{scope}/goals/:id/contribute
POST   /api/{scope}/goals/:id/archive

GET    /api/{scope}/wishes
POST   /api/{scope}/wishes
PUT    /api/{scope}/wishes/:id
DELETE /api/{scope}/wishes/:id
POST   /api/{scope}/wishes/:id/contribute

GET    /api/{scope}/budgets
POST   /api/{scope}/budgets
PATCH  /api/{scope}/budgets/:id
DELETE /api/{scope}/budgets/:id

GET    /api/{scope}/recurring
POST   /api/{scope}/recurring
PUT    /api/{scope}/recurring/:id
DELETE /api/{scope}/recurring/:id
POST   /api/{scope}/recurring/:id/skip-next

GET    /api/{scope}/debts
POST   /api/{scope}/debts
PUT    /api/{scope}/debts/:id
DELETE /api/{scope}/debts/:id
POST   /api/{scope}/debts/:id/payment

GET    /api/{scope}/safety-pillow
PUT    /api/{scope}/safety-pillow
GET    /api/{scope}/safety-pillow/history

GET    /api/{scope}/analytics
GET    /api/{scope}/dashboard

GET    /api/categories
POST   /api/categories
PATCH  /api/categories/:id
DELETE /api/categories/:id

GET    /api/accounts
POST   /api/accounts
PUT    /api/accounts/:id
DELETE /api/accounts/:id

GET    /api/notifications
PATCH  /api/notifications/:id/read
POST   /api/notifications/read-all

GET    /api/audit
GET    /api/family/members
POST   /api/family/invite
DELETE /api/family/members/:id

POST   /api/import
GET    /api/export

GET    /api/widget-config
PUT    /api/widget-config
```

`{scope}` = `personal` | `family`

---

## 10. Приоритеты выполнения

### Sprint 1 — Critical fixes (1-2 недели)
1. Refresh token: fix контракта бэк/фронт
2. Токены в httpOnly cookie, убрать из localStorage
3. Logout без валидного access token
4. ConfirmModal в Debts: `isOpen` вместо `open`
5. Вычисление ближайшего платежа в Debts
6. Фильтр транзакций по умолчанию — текущий месяц

### Sprint 2 — Missing CRUD (2-3 недели)
1. Редактирование регулярных платежей
2. Редактирование долгов
3. PATCH categories
4. Изменение имени/email в настройках
5. Архивация целей через UI

### Sprint 3 — Фильтры и сортировка (1-2 недели)
1. Фильтр транзакций по счёту, сумме, члену семьи
2. Базовая сортировка на всех страницах
3. Пагинация всех эндпоинтов без неё

### Sprint 4 — Дизайн-система (2 недели)
1. Унификация border-radius и типографики
2. Skeleton вместо спиннеров
3. `EmptyState`, `ErrorState` во всех списках
4. `useTheme()` хук
5. Мобильный гамбургер, touch targets

### Sprint 5 — Рефакторинг и безопасность (1-2 недели)
1. Atomic transactions (Prisma `$transaction`)
2. Zod на query-параметры
3. CSRF-защита
4. `password_hash` — убрать из `req.user`
5. Единый формат ошибок
6. Удаление мёртвого кода

---

## Version: 3.0
## Date: 2026-06
## Based on: TZ_v2.md + audit of codebase
