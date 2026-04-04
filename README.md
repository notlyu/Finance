# 💰 Семейный финансовый трекер — Equilibrium

Полнофункциональное веб-приложение для управления семейными финансами с премиальным дизайном, поддержкой нескольких пользователей, целей накоплений, желаний, бюджетов и аналитики.

![License](https://img.shields.io/badge/license-ISC-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-green.svg)
![MySQL](https://img.shields.io/badge/mysql-8.0-orange.svg)
![React](https://img.shields.io/badge/react-18-blue.svg)
![Tailwind](https://img.shields.io/badge/tailwind-3-06B6D4.svg)

---

## 📋 Оглавление

- [Возможности](#-возможности)
- [Дизайн-система](#-дизайн-система)
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
- Сегментированный переключатель Доход/Расход в модалке
- Крупный ввод суммы с символом ₽
- Приватные операции («Сюрприз») — скрыты от других членов семьи
- Toggle-переключатели вместо чекбоксов
- Фильтрация по дате, типу, категории, поиску
- Пагинация с «Загрузить ещё»
- Предупреждение о превышении бюджета

### 🎯 Цели накоплений
- Создание целей с целевой суммой, сроком, категорией и процентной ставкой
- **Автозачисление** — автоматическое пополнение из доходов (% или фикс. сумма)
- **Процентная ставка** — ежемесячное начисление сложных процентов через cron
- **Прогнозный калькулятор** — «сколько откладывать» и «через сколько накоплю»
- Архивирование выполненных целей с анимацией 🎉
- Bento-style карточки с иконками, прогресс-барами и статистикой

### ⭐ Желания
- Приоритет (звёзды) и статус (активно / выполнено / отложено)
- Категория желания при создании
- Пополнение из свободных средств с выбором долей (1/2, 1/3, 2/3, 1/4, полностью)
- Bento-статистика: общий бюджет желаний + доступно к распределению
- Архив выполненных желаний

### 🛡️ Подушка безопасности
- Расчёт: среднемесячные расходы × N месяцев
- Три уровня: Минимальная (3 мес), Комфортная (6 мес), Оптимальная (12 мес)
- Пресеты выбора периода (3, 6, 9, 12, 18, 24 мес) + произвольный ввод
- Рекомендация по ежемесячному взносу
- История изменений с графиками
- Expense breakdown по категориям

### 📊 Аналитика
- Линейный график доходов/расходов с gradient fill
- Donut-диаграммы расходов и доходов с суммой в центре
- Список категорий с процентами под диаграммами
- Сегментированный переключатель периода (3, 6, 12 мес, свой)
- Градиентная карточка динамики подушки безопасности
- Экспорт в **CSV** и **Excel (.xlsx)**

### 💰 Бюджеты
- Лимиты расходов по категориям на месяц
- Bento-метрики: Доходы, Расходы, Накопления, Свободно
- Предупреждение при превышении бюджета

### 🔄 Регулярные операции
- Ежемесячные регулярные платежи
- Статистика: прогноз/мес, ближайший платёж, кол-во активных
- Автоматическое создание через cron-задачу

### 🔔 Уведомления
- Достижение целей, превышение бюджета, регулярные платежи
- Колокольчик с бейджем непрочитанных в шапке
- Polling каждые 30 секунд
- Настройка в разделе «Настройки»

### 🌙 Тёмная тема
- Material 3 дизайн-система
- Автоматическое переключение + ручной выбор
- Все компоненты адаптированы под обе темы

---

## 🎨 Дизайн-система

### Философия: «Digital Curator»
Премиальный редакционный стиль финансов, а не банковский трекер.

### Цвета (Material 3)
| Роль | Светлая | Тёмная |
|:---|:---|:---|
| Primary | `#3525cd` | `#c3c0ff` |
| Secondary | `#006c49` | `#4edea3` |
| Tertiary | `#960014` | `#ffb3ad` |
| Surface | `#f8f9ff` | `#0b1c30` |
| On Surface | `#0b1c30` | `#eaf1ff` |

### Типографика
- **Заголовки**: Manrope (600, 700, 800)
- **Текст**: Inter (400, 500, 600, 700)

### Иконки
- Material Symbols Outlined (variable FILL)

### Принципы
- **No-Line Rule**: разделение через тон фона, без 1px borders
- **Скругления**: `2rem` для карточек, `1rem` для кнопок
- **Тени**: Ambient (`0 20px 40px`), Card (`0 4px 20px`), Button (`0 8px 24px`)
- **Glassmorphism**: backdrop-blur для навигации

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
├── client/                     # React фронтенд
│   ├── src/
│   │   ├── components/         # UI компоненты (Layout, Modal, NotificationBell...)
│   │   ├── components/ui/      # Базовые UI элементы (Button, Card, Input...)
│   │   ├── pages/              # Страницы (Dashboard, Goals, Wishes, Analytics...)
│   │   ├── services/           # API клиент + бизнес-логика
│   │   └── utils/              # Утилиты (format.js)
│   └── package.json
├── controllers/                # Express контроллеры
├── models/                     # Sequelize модели (12 моделей)
├── routes/                     # Маршруты API (11 роутов)
├── services/                   # Бизнес-логика
├── jobs/                       # Cron задачи (recurring, interest)
├── middleware/                 # Express middleware (auth)
├── sql/
│   └── migrations/             # SQL миграции (8 файлов)
├── tests/                      # Интеграционные тесты
├── new_design/                 # Дизайн-макеты (HTML)
├── server.js                   # Точка входа
├── testApp.js                  # App для тестов
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
| GET | `/api/transactions` | Список операций |
| POST | `/api/transactions` | Создать операцию |
| PUT | `/api/transactions/:id` | Обновить |
| DELETE | `/api/transactions/:id` | Удалить |

### Цели
| Метод | Путь | Описание |
|:---|:---|:---|
| GET | `/api/goals` | Список целей |
| POST | `/api/goals` | Создать цель |
| PUT | `/api/goals/:id` | Обновить цель |
| DELETE | `/api/goals/:id` | Удалить цель |
| POST | `/api/goals/:id/contribute` | Пополнить цель |
| GET | `/api/goals/:id/forecast` | Прогнозный калькулятор |
| GET | `/api/goals/export` | Экспорт CSV |

### Желания
| Метод | Путь | Описание |
|:---|:---|:---|
| GET | `/api/wishes` | Список желаний |
| POST | `/api/wishes` | Создать желание |
| PUT | `/api/wishes/:id` | Обновить желание |
| DELETE | `/api/wishes/:id` | Удалить желание |
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
| `20260401_auto_contrib.sql` | Автопополнение целей (automatic, source_transaction_id, type) |
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
| Бэкенд (API) | ✅ ~98% |
| Фронтенд (UI/UX) | ✅ ~95% |
| Дизайн-система | ✅ 100% |
| База данных | ✅ ~98% |
| Тесты | ✅ ~60% |
| **Общая** | **✅ ~96%** |

---

## 📝 Лицензия

ISC
