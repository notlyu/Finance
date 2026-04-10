# 💰 Финансы — Семейный финансовый трекер

Веб-приложение для управления семейными и личными финансами. Поддержка нескольких пользователей в семье, целей накоплений, желаний, бюджетов, регулярных операций, подушки безопасности и аналитики.

![License](https://img.shields.io/badge/license-ISC-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-green.svg)
![MySQL](https://img.shields.io/badge/mysql-8.0-orange.svg)
![React](https://img.shields.io/badge/react-18-blue.svg)
![Tailwind](https://img.shields.io/badge/tailwind-3-06B6D4.svg)

---

## 📋 Оглавление

- [Возможности](#-возможности)
- [Архитектура данных](#-архитектура-данных)
- [Дизайн-система](#-дизайн-система)
- [Технологический стек](#-технологический-стек)
- [Установка](#-установка)
- [Настройка БД](#-настройка-бд)
- [Запуск](#-запуск)
- [Структура проекта](#-структура-проекта)
- [API](#-api)
- [Сущности и модели](#-сущности-и-модели)
- [Лицензия](#-лицензия)

---

## ✨ Возможности

### 🔐 Аккаунт и восстановление
- Регистрация и авторизация (JWT)
- **Восстановление пароля** — отправка 6-значного кода на email (SMTP), срок действия 15 минут
- Смена пароля в настройках

### 👨‍👩‍👧 Семья
- Создание семьи и приглашение участников по коду (7 дней)
- Роли: **Владелец** / **Участник**
- Переключение контекста между членами семьи (dropdown в sidebar)
- Удаление участников, передача владения
- **Выход из семьи** — все данные (транзакции, бюджеты) остаются личными; цели, желания и регулярные операции сохраняются за счётой FK `SET NULL`

### 💳 Операции
- Доходы и расходы с категориями
- Приватные операции — скрыты от других членов семьи
- Фильтрация по дате, типу, категории, видимости
- Предупреждение при превышении бюджета
- Редактирование и удаление (с проверкой владельца)
- **Теги:** 🏠 Семейная / 👤 Личная операция

### 📱 Главная страница (Dashboard)
- **Контекстное переключение:** Пиккер "Личное / Семья" (только для пользователей с семьёй)
- **Динамический заголовок:** "Личные финансы" / "Семейные финансы"
- **Метрики:** Общий остаток (семья) / Ваш остаток (личное)
- **Вклад участников:** Показывает личный вклад в семейный бюджет (процент)
- **Операции с тегами:** Каждая операция помечена 🏠 или 👤 + имя участника
- **Цели:** Семейные или личные — в зависимости от режима
- **Onboarding toast:** При первом переходе в семейный режим — подсказка о видимости финансов

### 🎯 Цели накоплений
- Семейные и личные цели (табы)
- Целевая сумма, срок, категория
- **Автозачисление** — автоматическое пополнение из доходов (% или фикс. сумма)
- **Процентная ставка** — сложные проценты через cron (1-го числа)
- Прогнозный калькулятор
- Архивирование выполненных целей
- Пополнение с предупреждением о риске уйти в минус

### ⭐ Желания
- Семейные и личные желания (табы)
- Приоритет (звёзды), статус (активно/выполнено/отложено)
- Пополнение из свободных средств с быстрыми долями
- Bento-статистика: общий бюджет + доступно

### 💰 Бюджеты
- Лимиты расходов по категориям на месяц
- Семейные и личные бюджеты
- Фильтрация по участнику
- Предупреждение при превышении

### 🛡️ Подушка безопасности
- Ликвидные средства = доходы − расходы − резервы (цели + желания)
- Три уровня: Минимальная (3 мес), Комфортная (6 мес), Оптимальная (12 мес)
- Рекомендация по ежемесячному взносу
- Топ расходов за 3 месяца
- История изменений
- Поддержка solo и family режима

### 📊 Аналитика
- Линейный график доходов/расходов по месяцам
- Doughnut-диаграммы расходов и доходов по категориям
- График динамики подушки безопасности
- Экспорт в **CSV** и **Excel (.xlsx)**

### 🔄 Регулярные операции
- Ежемесячные регулярные платежи (1-28 числа)
- Автоматическое создание транзакций через cron
- Семейные и личные (в семье видны оба типа)

### 🔔 Уведомления
- Достижение целей, выполнение желаний, превышение бюджета
- Колокольчик с бейджем непрочитанных
- Настройка категорий уведомлений

### 🌙 Тёмная тема
- Material Design 3 дизайн-система
- Material Symbols Outlined иконки
- Glassmorphism-эффекты, ambient-тени

---

## 🏗 Архитектура данных

### Семейный и Solo режим

Каждая финансовая сущность имеет поле `family_id` (`allowNull: true`) и `user_id`:

| Сущность | Семейная | Личная | Примечание |
|:---|:---:|:---:|---|
| Transaction | `family_id = N` | `family_id = NULL` | При выходе из семьи → личная |
| Goal | `family_id = N, user_id = creator` | `family_id = NULL` | Автопополнение — только свои цели |
| Wish | `family_id = N, user_id = creator` | `family_id = NULL` | По умолчанию `is_private: true` |
| Budget | `family_id = N` | `family_id = NULL` | |
| RecurringTransaction | `family_id = N` | `family_id = NULL` | |

### Логика для членов семьи
- Видят **семейные** транзакции (всех участников)
- Видят **личные** транзакции только свои
- Видят **свои** семейные цели/желания (пополнять — только автору)
- Отчёты и аналитика учитывают обе категории

### Безопасность
- При редактировании/удалении — проверка `user_id` для личных записей
- При автопополнении целей — пополняются только **свои** семейные цели
- При выходе из семьи — FK `ON DELETE SET NULL` сохраняет данные

---

## 🎨 Дизайн-система

### Философия: «Digital Curator»
Премиальный редакционный стиль финансов, а не банковский трекер.

### Цвета (Material 3)

| Роль | Светлая | Тёмная | Использование |
|:---|:---|:---|:---|
| Primary | `#3525cd` | `#c3c0ff` | Кнопки, акценты, ссылки |
| Secondary | `#006c49` | `#4edea3` | Доходы, успех |
| Error | `#ba1a1a` | `#ffb3ad` | Расходы, ошибки |
| Surface | `#f8f9ff` | `#0b1c30` | Фон карточек |
| On Surface | `#0b1c30` | `#eaf1ff` | Основной текст |

### Типографика
- **Заголовки**: Manrope (600, 700, 800)
- **Текст**: Inter (400, 500, 600, 700)
- **Иконки**: Material Symbols Outlined

### Принципы
- **No-Line Rule**: разделение через тон фона
- **Скругления**: `2rem` карточки, `1rem` кнопки, `9999px` chips
- **Тени**: Ambient (`0 20px 40px`), Card (`0 4px 20px`), Button (`0 8px 24px`)
- **Glassmorphism**: `backdrop-blur` для навигации

---

## 🛠 Технологический стек

| Слой | Технологии |
|:---|:---|
| **Бэкенд** | Node.js, Express, Sequelize ORM |
| **База данных** | MySQL 8.0 |
| **Фронтенд** | React 18, React Router, Tailwind CSS, Chart.js |
| **Аутентификация** | JWT (jsonwebtoken), bcrypt |
| **Email** | Nodemailer (SMTP) |
| **Экспорт** | ExcelJS |
| **Cron** | node-cron |
| **Безопасность** | Helmet, rate limiting, input sanitization |

---

## 📦 Установка

### Требования
- Node.js >= 18
- MySQL >= 8.0

### 1. Клонирование и установка
```bash
git clone <repository-url>
cd Finance

# Бэкенд
npm install

# Фронтенд
cd client && npm install && cd ..
```

### 2. Настройка переменных окружения
Создайте файл `.env` в корне проекта:
```env
PORT=5000
JWT_SECRET=your_super_secret_key_here
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=finance_db
DB_DIALECT=mysql

# SMTP для восстановления пароля (опционально)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your@email.com
SMTP_PASS=your_password
SMTP_FROM="Finance <noreply@example.com>"
FRONTEND_URL=http://localhost:5173
```

---

## 🗄 Настройка БД

### 1. Создайте базу данных
```sql
CREATE DATABASE finance_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Примените миграции
```bash
mysql -u root -p finance_db < migrations/fix_solo_users.sql
```

Эта миграция:
- Удаляет FK `fk_transactions_family_id` (cascade → нет)
- Делает `family_id` nullable для всех таблиц
- Меняет `ON DELETE CASCADE` на `SET NULL` для целей, желаний и регулярных операций
- Исправляет данные пользователя Ly (user_id=1)

---

## 🚀 Запуск

### Разработка
```bash
# Одной командой (backend + frontend)
npm run dev:all

# Или вручную в двух терминалах:
# Терминал 1: бэкенд (порт 5000)
npm run dev

# Терминал 2: фронтенд (порт 5173)
cd client && npm start
```

### Продакшн
```bash
# Бэкенд
npm start

# Фронтенд
cd client && npm run build
```

Откройте [http://localhost:5173](http://localhost:5173) (dev) или сконфигурируйте веб-сервер для `/client/build`.

---

## 📁 Структура проекта

```
Finance/
├── client/                          # React фронтенд (Vite)
│   └── src/
│       ├── components/
│       │   └── Layout.jsx           # Основной layout + sidebar + bottom nav
│       ├── pages/
│       │   ├── Login.jsx            # Вход / регистрация
│       │   ├── ForgotPassword.jsx   # Восстановление пароля
│       │   ├── Dashboard.jsx         # Главная страница
│       │   ├── Transactions.jsx     # Операции
│       │   ├── Goals.jsx            # Цели накоплений
│       │   ├── Wishes.jsx           # Желания
│       │   ├── Budgets.jsx          # Бюджеты
│       │   ├── SafetyPillow.jsx     # Подушка безопасности
│       │   ├── Recurring.jsx        # Регулярные операции
│       │   ├── Analytics.jsx        # Аналитика
│       │   ├── Family.jsx           # Управление семьёй
│       │   └── Settings.jsx         # Настройки
│       ├── services/api.js         # Axios клиент
│       ├── utils/format.js          # Форматирование денег
│       └── App.js                   # Роутинг
├── controllers/                     # Express контроллеры
│   ├── authController.js            # Аутентификация, семья, восстановление пароля
│   ├── transactionController.js
│   ├── goalController.js
│   ├── wishController.js
│   ├── budgetController.js
│   ├── dashboardController.js
│   ├── safetyPillowController.js
│   ├── recurringController.js
│   ├── reportController.js          # Аналитика и экспорт
│   ├── categoryController.js
│   └── notificationController.js
├── models/                          # Sequelize модели
│   ├── index.js                    # Загрузка и ассоциации
│   ├── user.js
│   ├── family.js
│   ├── transaction.js
│   ├── goal.js
│   ├── wish.js
│   ├── budget.js
│   ├── recurringTransaction.js
│   ├── goalContribution.js
│   ├── wishContribution.js
│   ├── category.js
│   ├── familyInvite.js
│   ├── passwordResetToken.js
│   ├── safetyPillowSetting.js
│   ├── safetyPillowHistory.js
│   └── notification.js
├── routes/                          # Express маршруты
├── services/                        # Бизнес-логика
│   ├── transactionService.js         # Создание, автопополнение, бюджет-чека
│   ├── safetyPillowService.js       # Расчёт подушки безопасности
│   └── emailService.js              # Отправка email (nodemailer)
├── jobs/                            # Cron задачи
│   ├── recurringJob.js              # Создание регулярных транзакций (03:05)
│   └── interestJob.js               # Начисление процентов на цели (1-го числа)
├── middleware/
│   ├── auth.js                       # JWT верификация + подгрузка Family
│   └── errorHandler.js
├── migrations/
│   └── fix_solo_users.sql           # Основная миграция для solo/family логики
├── config/
│   ├── database.js                   # Sequelize конфиг
│   └── config.js                     # Sequelize CLI конфиг
├── server.js                         # Точка входа
└── package.json
```

---

## 🔌 API

### Аутентификация
| Метод | Путь | Описание |
|:---|:---|:---|
| POST | `/api/auth/register` | Регистрация |
| POST | `/api/auth/login` | Вход |
| POST | `/api/auth/forgot-password` | Запрос восстановления (email) |
| POST | `/api/auth/reset-password` | Сброс пароля по токену |
| GET | `/api/auth/me` | Текущий пользователь + семья |
| POST | `/api/auth/change-password` | Смена пароля |

### Семья
| Метод | Путь | Описание |
|:---|:---|:---|
| POST | `/api/auth/family/create` | Создать семью |
| POST | `/api/auth/family/join` | Присоединиться по коду |
| POST | `/api/auth/family/leave` | Покинуть семью |
| POST | `/api/auth/family/invites` | Создать приглашение |
| DELETE | `/api/auth/family/invites/:id` | Отозвать приглашение |
| DELETE | `/api/auth/family/members/:memberId` | Удалить участника |
| POST | `/api/auth/family/transfer-ownership` | Передать владение |

### Операции
| Метод | Путь | Описание |
|:---|:---|:---|
| GET | `/api/transactions` | Список (с фильтрами) |
| POST | `/api/transactions` | Создать |
| PUT | `/api/transactions/:id` | Обновить |
| DELETE | `/api/transactions/:id` | Удалить |

### Цели
| Метод | Путь | Описание |
|:---|:---|:---|
| GET | `/api/goals` | Список (семейные + личные) |
| POST | `/api/goals` | Создать |
| PUT | `/api/goals/:id` | Обновить |
| DELETE | `/api/goals/:id` | Удалить |
| POST | `/api/goals/:id/contribute` | Пополнить |
| GET | `/api/goals/:id/forecast` | Прогноз |

### Желания
| Метод | Путь | Описание |
|:---|:---|:---|
| GET | `/api/wishes` | Список |
| POST | `/api/wishes` | Создать |
| PUT | `/api/wishes/:id` | Обновить |
| DELETE | `/api/wishes/:id` | Удалить |
| POST | `/api/wishes/:id/fund` | Пополнить (с предупреждением) |
| POST | `/api/wishes/:id/contribute` | Пополнить (с транзакцией) |
| GET | `/api/wishes/export` | Экспорт CSV |

### Бюджеты
| Метод | Путь | Описание |
|:---|:---|:---|
| GET | `/api/budgets` | Список |
| POST | `/api/budgets` | Создать |
| PUT | `/api/budgets/:id` | Обновить |
| DELETE | `/api/budgets/:id` | Удалить |

### Регулярные операции
| Метод | Путь | Описание |
|:---|:---|:---|
| GET | `/api/recurring` | Список |
| POST | `/api/recurring` | Создать |
| PUT | `/api/recurring/:id` | Обновить |
| DELETE | `/api/recurring/:id` | Удалить |

### Подушка безопасности
| Метод | Путь | Описание |
|:---|:---|:---|
| GET | `/api/safety-pillow/current` | Текущая подушка |
| GET | `/api/safety-pillow/settings` | Настройки |
| PUT | `/api/safety-pillow/settings` | Обновить настройки |
| GET | `/api/safety-pillow/history` | История |

### Дашборд
| Метод | Путь | Описание |
|:---|:---|:---|
| GET | `/api/dashboard` | Сводка (семейный + личный баланс, вклады участников) |

### Аналитика
| Метод | Путь | Описание |
|:---|:---|:---|
| GET | `/api/reports/dynamics` | Динамика доходов/расходов |
| GET | `/api/reports/expenses-by-category` | Расходы по категориям |
| GET | `/api/reports/income-by-category` | Доходы по категориям |
| GET | `/api/reports/export` | Экспорт CSV |
| GET | `/api/reports/export/excel` | Экспорт Excel (.xlsx) |

### Категории
| Метод | Путь | Описание |
|:---|:---|:---|
| GET | `/api/categories` | Список |
| POST | `/api/categories` | Создать |
| DELETE | `/api/categories/:id` | Удалить |

### Уведомления
| Метод | Путь | Описание |
|:---|:---|:---|
| GET | `/api/notifications` | Список |
| GET | `/api/notifications/unread-count` | Счётчик непрочитанных |
| PUT | `/api/notifications/:id/read` | Прочитать |
| PUT | `/api/notifications/read-all` | Прочитать все |
| GET | `/api/notifications/settings` | Настройки |
| PUT | `/api/notifications/settings` | Обновить настройки |

---

## 🗃 Сущности и модели

### Основные таблицы

| Таблица | Описание |
|:---|:---|
| `users` | Пользователи (`family_id` nullable) |
| `families` | Семьи (имя, invite_code, owner_user_id) |
| `family_invites` | Приглашения с кодом и сроком действия |
| `transactions` | Операции (`family_id` nullable) |
| `categories` | Категории (системные + пользовательские) |
| `goals` | Цели (`family_id` nullable) |
| `goal_contributions` | Пополнения целей (FK → Transaction) |
| `wishes` | Желания (`family_id` nullable, `is_private` default true) |
| `wish_contributions` | Пополнения желаний (FK → Transaction) |
| `budgets` | Бюджеты (`family_id` nullable) |
| `recurring_transactions` | Регулярные операции (`family_id` nullable) |
| `safety_pillow_settings` | Настройки подушки (per-user) |
| `safety_pillow_history` | История расчётов подушки |
| `notifications` | Уведомления |
| `password_reset_tokens` | Токены восстановления пароля (1 час TTL) |

### FK constraints (SET NULL)
При удалении семьи (`DELETE FROM families`) все связанные записи получают `family_id = NULL`, данные сохраняются как личные.

---

## 📝 Лицензия

ISC
