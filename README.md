# 💰 Семейный финансовый трекер

Полнофункциональное веб-приложение для управления семейными финансами с поддержкой нескольких пользователей, целей накоплений, желаний, бюджетов и аналитики.

![License](https://img.shields.io/badge/license-ISC-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-green.svg)
![MySQL](https://img.shields.io/badge/mysql-8.0-orange.svg)

---

## 📋 Оглавление

- [Возможности](#-возможности)
- [Технологический стек](#-технологический-стек)
- [Установка](#-установка)
- [Настройка БД](#-настройка-бд)
- [Запуск](#-запуск)
- [Тесты](#-тесты)
- [Структура проекта](#-структура-проекта)
- [API](#-api)
- [Миграции](#-миграции)
- [Лицензия](#-лицензия)

---

## ✨ Возможности

### 👨‍👩‍👧 Семья
- Создание семьи и приглашение участников по коду
- Роли: Владелец / Участник
- Переключение контекста между членами семьи
- Управление составом (удаление участников, передача владения)

### 💳 Операции
- Доходы и расходы с категориями
- Приватные операции («Сюрприз») — скрыты от других членов семьи
- Фильтрация по дате, типу, категории, поиску
- Пагинация

### 🎯 Цели накоплений
- Создание целей с целевой суммой и сроком
- **Автозачисление** — автоматическое пополнение из доходов (% или фикс. сумма)
- **Процентная ставка** — ежемесячное начисление сложных процентов
- **Прогнозный калькулятор** — «сколько откладывать» и «через сколько накоплю»
- Архивирование выполненных целей

### ⭐ Желания
- Приоритет (звёзды) и статус (активно / выполнено / отложено)
- Категория желания при создании
- Пополнение из свободных средств с выбором долей (1/2, 1/3, 2/3, 1/4, 3/4, полностью)
- Архив выполненных желаний

### 🛡️ Подушка безопасности
- Расчёт: среднемесячные расходы × N месяцев
- Три уровня: Минимальная (3 мес), Комфортная (6 мес), Оптимальная (12 мес)
- Рекомендация по ежемесячному взносу
- История изменений

### 📊 Аналитика
- Линейный график доходов/расходов по месяцам
- Круговые диаграммы по категориям
- Фильтр периода (3, 6, 12 мес, произвольный)
- Экспорт в **CSV** и **Excel (.xlsx)**

### 💰 Бюджеты
- Лимиты расходов по категориям на месяц
- Предупреждение при превышении бюджета

### 🔄 Регулярные операции
- Ежедневные, еженедельные, ежемесячные
- Автоматическое создание через cron-задачу

### 🔔 Уведомления
- Достижение целей
- Превышение бюджета
- Регулярные платежи
- Настройка в разделе «Настройки»

### 🌙 Тёмная тема
- Автоматическое переключение + ручной выбор

---

## 🛠 Технологический стек

| Слой | Технологии |
|:---|:---|
| **Бэкенд** | Node.js, Express 5, Sequelize ORM |
| **База данных** | MySQL 8.0 |
| **Фронтенд** | React 18, React Router, Tailwind CSS, Chart.js |
| **Аутентификация** | JWT (jsonwebtoken) |
| **Тесты** | Jest, Supertest |
| **Экспорт** | exceljs |
| **Cron** | node-cron |
| **Безопасность** | Helmet, bcrypt, rate limiting |

---

## 📦 Установка

### Требования
- Node.js >= 18
- MySQL >= 8.0
- npm

### 1. Клонирование
```bash
git clone <repository-url>
cd Finance
```

### 2. Установка зависимостей
```bash
# Бэкенд
npm install

# Фронтенд
cd client
npm install
cd ..
```

### 3. Настройка окружения
Создайте файл `.env` в корне проекта:
```env
PORT=5000
JWT_SECRET=your_super_secret_key_here
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=finance_db
DB_DIALECT=mysql
```

---

## 🗄 Настройка БД

### 1. Создайте базу данных
```sql
CREATE DATABASE finance_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Примените миграции
```bash
mysql -u root -p finance_db < sql/migrations/20260401_auto_contrib.sql
mysql -u root -p finance_db < sql/migrations/20260412_create_notifications.sql
mysql -u root -p finance_db < sql/migrations/20260413_index_transactions.sql
mysql -u root -p finance_db < sql/migrations/20260414_archive_goals_and_wishes.sql
mysql -u root -p finance_db < sql/migrations/20260415_alter_wishes_add_categoryid.sql
mysql -u root -p finance_db < sql/migrations/20260416_cleanup_and_constraints.sql
mysql -u root -p finance_db < sql/migrations/20260417_goals_category.sql
mysql -u root -p finance_db < sql/migrations/20260418_notifications.sql
```

Или единым файлом (если есть):
```bash
mysql -u root -p finance_db < sql/setup_full_seed_finance_db.sql
```

---

## 🚀 Запуск

### Режим разработки
```bash
# Бэкенд (порт 5000)
npm run dev

# Фронтенд (порт 3000) — в отдельном терминале
cd client
npm start
```

### Продакшн
```bash
# Бэкенд
npm start

# Фронтенд (сборка)
cd client
npm run build
```

Откройте [http://localhost:3000](http://localhost:3000) в браузере.

---

## 🧪 Тесты

```bash
# Запуск всех тестов
npm test

# Режим наблюдения
npm run test:watch
```

Тесты покрывают: аутентификацию, транзакции, цели, желания, дашборд, категории, уведомления.

---

## 📁 Структура проекта

```
Finance/
├── client/                 # React фронтенд
│   ├── src/
│   │   ├── components/     # UI компоненты
│   │   ├── pages/          # Страницы
│   │   ├── services/       # API клиент
│   │   └── utils/          # Утилиты
│   └── package.json
├── controllers/            # Express контроллеры
├── models/                 # Sequelize модели
├── routes/                 # Маршруты API
├── services/               # Бизнес-логика
├── jobs/                   # Cron задачи
├── middleware/             # Express middleware
├── sql/
│   └── migrations/         # SQL миграции
├── tests/                  # Интеграционные тесты
├── server.js               # Точка входа
├── testApp.js              # App для тестов
└── package.json
```

---

## 🔌 API

### Аутентификация
| Метод | Путь | Описание |
|:---|:---|:---|
| POST | `/api/auth/register` | Регистрация |
| POST | `/api/auth/login` | Вход |
| GET | `/api/auth/me` | Текущий пользователь |
| POST | `/api/auth/change-password` | Смена пароля |

### Операции
| Метод | Путь | Описание |
|:---|:---|:---|
| GET | `/api/transactions` | Список операций |
| POST | `/api/transactions` | Создать операцию |
| PUT | `/api/transactions/:id` | Обновить |
| DELETE | `/api/transactions/:id` | Удалить |

### Цели
| Метод | Путь | Описание |
|:---|:---|:---|
| GET | `/api/goals` | Список целей |
| POST | `/api/goals` | Создать цель |
| POST | `/api/goals/:id/contribute` | Пополнить цель |
| GET | `/api/goals/:id/forecast` | Прогноз |
| GET | `/api/goals/export` | Экспорт CSV |

### Желания
| Метод | Путь | Описание |
|:---|:---|:---|
| GET | `/api/wishes` | Список желаний |
| POST | `/api/wishes` | Создать желание |
| POST | `/api/wishes/:id/fund` | Пополнить желание |
| GET | `/api/wishes/export` | Экспорт CSV |

### Аналитика
| Метод | Путь | Описание |
|:---|:---|:---|
| GET | `/api/reports/dynamics` | Динамика доходов/расходов |
| GET | `/api/reports/expenses-by-category` | Расходы по категориям |
| GET | `/api/reports/income-by-category` | Доходы по категориям |
| GET | `/api/reports/export` | Экспорт CSV |
| GET | `/api/reports/export/excel` | Экспорт Excel |

### Дашборд
| Метод | Путь | Описание |
|:---|:---|:---|
| GET | `/api/dashboard` | Сводка для главной страницы |

### Подушка безопасности
| Метод | Путь | Описание |
|:---|:---|:---|
| GET | `/api/safety-pillow/current` | Текущая подушка |
| GET | `/api/safety-pillow/settings` | Настройки |
| PUT | `/api/safety-pillow/settings` | Обновить настройки |
| GET | `/api/safety-pillow/history` | История |

### Уведомления
| Метод | Путь | Описание |
|:---|:---|:---|
| GET | `/api/notifications` | Список уведомлений |
| GET | `/api/notifications/unread-count` | Счётчик непрочитанных |
| PUT | `/api/notifications/:id/read` | Прочитать |
| PUT | `/api/notifications/read-all` | Прочитать все |
| GET | `/api/notifications/settings` | Настройки |
| PUT | `/api/notifications/settings` | Обновить настройки |

---

## 🔄 Миграции

Все SQL-миграции находятся в `sql/migrations/`. Применяйте их в порядке номеров:

| Файл | Описание |
|:---|:---|
| `20260401_auto_contrib.sql` | Автопополнение целей |
| `20260412_create_notifications.sql` | Таблица уведомлений |
| `20260413_index_transactions.sql` | Индексы для транзакций |
| `20260414_archive_goals_and_wishes.sql` | Архивирование целей/желаний |
| `20260415_alter_wishes_add_categoryid.sql` | Категория желаний |
| `20260416_cleanup_and_constraints.sql` | Очистка дублей + уникальные ограничения |
| `20260417_goals_category.sql` | Категория целей |
| `20260418_notifications.sql` | Полная система уведомлений |

---

## 📊 Статус проекта

| Область | Готовность |
|:---|:---:|
| Бэкенд (API) | ✅ ~95% |
| Фронтенд (UI/UX) | ✅ ~92% |
| База данных | ✅ ~95% |
| Тесты | ✅ ~60% |
| **Общая** | **✅ ~95%** |

---

## 📝 Лицензия

ISC
