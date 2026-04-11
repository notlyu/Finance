# 💰 Финансы — Семейный финансовый трекер

Веб-приложение для управления семейными и личными финансами. Поддержка нескольких пользователей в семье, целей накоплений, желаний, бюджетов, регулярных операций, подушки безопасности и аналитики.

![License](https://img.shields.io/badge/license-ISC-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-green.svg)
![PostgreSQL](https://img.shields.io/badge/postgresql-14+-blue.svg)
![React](https://img.shields.io/badge/react-18-blue.svg)
![Tailwind](https://img.shields.io/badge/tailwind-3-06B6D4.svg)

---

## 📋 Оглавление

- [Возможности](#-возможности)
- [Технологический стек](#-технологический-стек)
- [Установка](#-установка)
- [Запуск](#-запуск)
- [Тестирование](#-тестирование)
- [Структура проекта](#-структура-проекта)
- [API](#-api)
- [Лицензия](#-лицензия)

---

## ✨ Возможности

### 🔐 Аккаунт и восстановление
- Регистрация и авторизация (JWT)
- **Восстановление пароля** — отправка 6-значного кода на email (SMTP), срок действия 15 минут
- Смена пароля в настройках

### 👨‍👩‍👧 Семья
- Создание семьи и приглашение участников по коду
- Роли: **Владелец** / **Участник**
- Переключение контекста между членами семьи
- Удаление участников, передача владения
- **Выход из семьи** — все данные остаются личными

### 💳 Операции
- Доходы и расходы с категориями
- Приватные операции — скрыты от других членов семьи
- Фильтрация по дате, типу, категории, видимости
- Предупреждение при превышении бюджета
- Редактирование и удаление
- Теги: 🏠 Семейная / 👤 Личная

### 📱 Главная страница (Dashboard)
- Переключение: Личное / Семья
- Метрики: баланс, доходы, расходы, резервы
- Вклады участников
- Последние операции с категориями
- Цели накоплений
- Круговая диаграмма расходов по категориям

### 🎯 Цели накоплений
- Семейные и личные цели
- Целевая сумма, срок
- **Автозачисление** — автоматическое пополнение из доходов
- Архивирование выполненных целей

### ⭐ Желания
- Семейные и личные желания
- Приоритет, статус
- Пополнение из свободных средств
- Статистика: общий бюджет + доступно

### 💰 Бюджеты
- Лимиты расходов по категориям на месяц
- Семейные и личные бюджеты
- Предупреждение при превышении

### 🛡️ Подушка безопасности
- Ликвидные средства = доходы − расход�� − резервы
- Три уровня: Минимальная (3 мес), Комфортная (6 мес), Оптимальная (12 мес)
- Настройка целевого количества месяцев
- История изменений

### 📊 Аналитика
- Линейный график доходов/расходов по месяцам
- Круговые диаграммы расходов и доходов по категориям
- График динамики подушки безопасности
- Экспорт в **CSV** и **Excel (.xlsx)**

### 🔄 Регулярные операции
- Ежемесячные регулярные платежи
- Автоматическое создание транзакций через cron

### 🌙 Тёмная тема
- Material Design 3 дизайн-система
- Сохранение выбора в localStorage
- Material Symbols Outlined иконки

---

## 🛠 Технологический стек

| Слой | Технологии |
|:---|:---|
| **Бэкенд** | Node.js, Express, Prisma ORM |
| **База данных** | PostgreSQL >= 14 |
| **Фронтенд** | React 18, React Router, Tailwind CSS, Chart.js |
| **Аутентификация** | JWT (jsonwebtoken), bcrypt |
| **Email** | Nodemailer (SMTP) |
| **Экспорт** | ExcelJS |
| **Cron** | node-cron |
| **Тесты** | Jest, Supertest |

---

## 📦 Установка

### Требования
- Node.js >= 18
- PostgreSQL >= 14

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
DATABASE_URL=postgresql://user:password@localhost:5432/finance_db

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
```bash
psql -U postgres -c "CREATE DATABASE finance_db;"
```

### 2. Примените схему Prisma
```bash
npx prisma db push
```

### 3. (Опционально) Заполните тестовыми данными
```bash
node prisma-seed.js
```

---

## 🚀 Запуск

### Разработка
```bash
# Бэкенд (порт 5000)
npm run dev

# Фронтенд (порт 5173) - в другом терминале
cd client && npm run dev
```

### Продакшн
```bash
# Бэкенд
npm start

# Фронтенд
cd client && npm run build
```

Откройте [http://localhost:5173](http://localhost:5173)

---

## 🧪 Тестирование
```bash
npm test
```

Тесты находятся в папке `tests/`:
- `api.test.js` — интеграционные тесты API
- `dashboard.test.js` — тесты дашборда
- `categories.test.js` — тесты категорий

---

## 📁 Структура проекта

```
Finance/
├── client/                      # React фронтенд (Vite)
│   └── src/
│       ├── components/         # UI компоненты
│       ├── pages/            # Страницы
│       ├── hooks/            # React хуки
│       ├── services/         # API клиент
│       ├── utils/           # Утилиты
│       └── App.js           # Роутинг
├── controllers/               # Express контролл��ры
├── routes/                  # Маршруты
├── services/                # Бизнес-логика
├── middleware/             # Auth и error handling
├── lib/                  # Модели и обёртки Prisma
├── prisma/               # Schema и миграции
├── jobs/                 # Cron задачи
├── tests/                # Jest тесты
├── server.js              # Точка входа
└── package.json
```

### Ключевые файлы

| Файл | Назначение |
|:---|:---|
| `lib/models.js` | Prisma client + обёртки |
| `prisma/schema.prisma` | База данных |
| `services/transactionService.js` | Операции и автопополнение |
| `services/safetyPillowService.js` | Подушка безопасности |
| `controllers/dashboardController.js` | Главная страница |
| `controllers/reportController.js` | Аналитика |

---

## 🔌 API

### Аутентификация
| Метод | Путь | Описание |
|:---|:---|:---|
| POST | `/api/auth/register` | Регистрация |
| POST | `/api/auth/login` | Вход |
| POST | `/api/auth/forgot-password` | Запрос восстановления |
| POST | `/api/auth/reset-password` | Сброс пароля |
| GET | `/api/auth/me` | Текущий пользователь |

### Семья
| Метод | Путь | Описание |
|:---|:---|:---|
| POST | `/api/auth/family/create` | Создать семью |
| POST | `/api/auth/family/join` | Присоединиться |
| POST | `/api/auth/family/leave` | Покинуть |

### Операции
| Метод | Путь | Описание |
|:---|:---|:---|
| GET | `/api/transactions` | Список |
| POST | `/api/transactions` | Создать |
| PUT | `/api/transactions/:id` | Обновить |
| DELETE | `/api/transactions/:id` | Удалить |

### Цели
| Метод | Путь | Описание |
|:---|:---|:---|
| GET | `/api/goals` | Список |
| POST | `/api/goals` | Создать |
| PUT | `/api/goals/:id` | Обновить |
| DELETE | `/api/goals/:id` | Удалить |

### Желания
| Метод | Путь | Описание |
|:---|:---|:---|
| GET | `/api/wishes` | Список |
| POST | `/api/wishes` | Создать |
| PUT | `/api/wishes/:id` | Обновить |
| DELETE | `/api/wishes/:id` | Удалить |
| POST | `/api/wishes/:id/fund` | Пополнить |

### Подушка безопасности
| Метод | Путь | Описание |
|:---|:---|:---|
| GET | `/api/safety-pillow/current` | Текущая подушка |
| GET | `/api/safety-pillow/settings` | Настройки |
| PUT | `/api/safety-pillow/settings` | Обновить |
| GET | `/api/safety-pillow/history` | История |

### Дашборд
| Метод | Путь | Описание |
|:---|:---|:---|
| GET | `/api/dashboard` | Сводка |

### Аналитика
| Метод | Путь | Описание |
|:---|:---|:---|
| GET | `/api/reports/dynamics` | Динамика |
| GET | `/api/reports/expenses-by-category` | Расходы по категориям |
| GET | `/api/reports/export/excel` | Экспорт Excel |

---

## 📝 Лицензия

ISC