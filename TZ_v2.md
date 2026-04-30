# Техническое задание на доработку приложения «Финансы» (версия 2.0)

---

## 1. Общая концепция разделения на пространства

Приложение имеет **два независимых режима** (пространства), доступных из навигации:
- **Личное** (`/personal/…`) — все данные только пользователя, без информации о семье.
- **Семейное** (`/family/…`) — все данные, принадлежащие семье, всех участников.

Переключение происходит через **основное меню** (боковое на десктопе, нижняя панель на мобильных) пунктами «👤 Личное» и «👨‍👩‍👧 Семья».

Глобального переключателя в шапке нет.

Если пользователь не состоит в семье, раздел «Семья» недоступен (скрыт или неактивен с пояснением).

---

## 2. Обновлённая структура страниц

### 2.1. Аутентификация (общая, не зависит от пространства)
- **Login / Регистрация** (`/login`)
- **Восстановление пароля** (`/forgot-password`)

### 2.2. Личное пространство (`/personal`)
| Страница | Путь | Описание |
|----------|-----|----------|
| Главная | `/personal/dashboard` | Финансовая сводка пользователя |
| Операции | `/personal/transactions` | Список личных транзакций |
| Цели | `/personalGoals/goals` | Единая страница с вкладками «Накопления» и «Желания» |
| Бюджеты | `/personal/budgets` | Личные бюджеты |
| Регулярные | `/personal/recurring` | Личные регулярные операции |
| Кредиты/долги | `/personal/debts` | Без изменений |
| Аналитика | `/personal/analytics` | Графики по личным данным |
| Подушка безопасности | `/personal/safety-pillow` | Настройка и отслеживание |

### 2.3. Семейное пространство (`/family`)
| Страница | Путь | Описание |
|----------|-----|----------|
| Главная | `/family/dashboard` | Финансовая сводка семьи |
| Операции | `/family/transactions` | Операции всех участников |
| Цели | `/family/goals` | Семейные цели и желания |
| Бюджеты | `/family/budgets` | Семейные бюджеты |
| Регулярные | `/family/recurring` | Семейные регулярные |
| Кредиты/долги | `/family/debts` | Семейные долги |
| Аналитика | `/family/analytics` | Графики по семье |
| Подушка безопасности | `/family/safety-pillow` | Семейная подушка |
| Управление семьёй | `/family/manage` | Участники, приглашения, роли |

### 2.4. Общие страницы
- **Настройки профиля** (`/settings`) — данные, уведомления, пароль, категории, оформление
- **Уведомления** — из шапки

**Фильтры по участникам** в семейных разделах: на страницах операций, целей, бюджетов, аналитики добавлен фильтр «Все / Конкретны�� участник».

---

## 3. Модель данных (сущности, поля, связи)

### 3.1. User
```
- id
- name
- email
- password_hash
- refresh_token_hash
- family_id (FK Family, nullable)
- two_factor_enabled (boolean)
- notification_settings (json)
- theme_preference (dark/light)
- created_at
```

### 3.2. Family
```
- id
- name
- owner_user_id (FK User)
- invite_code
```

### 3.3. Account (НОВОЕ)
```
- id
- user_id (FK User)
- family_id (FK Family, nullable)
- name
- initial_balance
- current_balance
- currency
- is_liquid (boolean)
- is_active
```

### 3.4. Transaction
```
- id
- user_id (создатель)
- family_id (FK Family, nullable — если личная)
- type (income/expense)
- amount
- date
- comment
- is_private (boolean)
- category_id (FK Category)
- account_id (FK Account)
- linked_goal_id (FK Goal, nullable)
```

### 3.5. Category
```
- id
- name
- type (income/expense)
- icon
- family_id (nullable)
- is_system (boolean)
```

### 3.6. Goal (объединяет цели и желания)
```
- id
- user_id (владелец)
- family_id (nullable)
- type (goal/wish/safety_pillow)
- name
- target_amount
- current_amount
- target_date
- priority (high/medium/low, только для wish)
- auto_fill_enabled
- auto_fill_percent / auto_fill_fixed
- is_safety_pillow
- created_at
```

### 3.7. Budget
```
- id
- family_id (nullable)
- user_id (создатель)
- category_id (FK Category)
- month (YYYY-MM)
- limit_amount
- type (income/expense)
```

### 3.8. Recurring
```
- id
- user_id
- family_id (nullable)
- type (income/expense)
- category_id
- amount
- day_of_month (1-31)
- active (boolean)
- comment
- account_id
```

### 3.9. Debt
```
- id
- user_id
- family_id (nullable)
- name
- total_amount
- remaining_amount
- interest_rate
- monthly_payment
- start_date
- notes
```

### 3.10. SafetyPillowSnapshot (НОВОЕ)
```
- id
- user_id / family_id
- date (1-е число месяца)
- liquid_balance
- target_amount
- monthly_expenses
```

### 3.11. Notification
```
- id
- user_id
- type (goal_reached, budget_exceeded, etc)
- message
- read
- created_at
```

---

## 4. Бизнес-логика

### 4.1. Расчёт баланса счёта
`current_balance = initial_balance + SUM(income) - SUM(expense)`

### 4.2. Подушка безопасности
- Отдельная цель с `type='safety_pillow'`, создаваемая автоматически.
- Цель подушки = месяцы × среднемесячный расход.
- Среднемесячный расход — по категориям expense за последние 3/6 месяцев.
- «Доступно сейчас» = сумма ликвидных счетов (`is_liquid=true`).
- «Зарезервировано» = `current_amount` цели подушки.
- Прогресс-бар = `current_amount / target_amount`.
- Пополнение = расходная транзакция → увеличивает `current_amount`.
- Автопополнение: при доходе → автосоздание расхода на % в цель подушки.
- История — по ежемесячным снапшотам.

### 4.3. Пополнение целей
**Ручное:**
- Модальное окно «Пополнить»: выбор счёта, сумма, toggle «Создать транзакцию»
- Если включено: расходная транзакция + `linked_goal_id`
- Если выключено: только увеличение `current_amount`

**Автопри пополнении (%):**
- При доходной транзакции: проверка целей с `auto_fill_enabled`
- Автосозд��ние расходной транзакции на % от дохода

### 4.4. Бюджеты: расчёт «Потрачено»
- SUM(expense) по категории за период
- Прогресс-бар: `потрачено / лимит`

### 4.5. Регулярные платежи
- Выбор 1–31 день
- При `day_of_month > дней в месяце` → последний день

### 4.6. Фильтры дат
- Предустановки: Сегодня, Вчера, Эта неделя, Этот месяц, Прошлый месяц, Произвольный
- Произвольный: date range picker (два календаря)

### 4.7. Безопасность
- Подтверждение email при регистрации
- Rate limiting: 5 попыток входа за 15 минут
- Пароли: bcrypt
- Refresh-токены: httpOnly cookie
- 2FA: модель готова (`two_factor_enabled`)

### 4.8. Уведомления (in-app)
- Типы: goal_reached, wish_completed, budget_exceeded (≥100%), recurring_reminder
- Настройки в `/settings`

### 4.9. Семейные переходы
При покидании семьи:
- Объекты `family_id != NULL` остаются в семье
- Счета передаются другому участнику или закрываются
- Участник теряет доступ к семейным разделам

---

## 5. API

REST JSON API с префиксами:
- `/api/auth/*` — аутентификация
- `/api/personal/*` — личное пространство
- `/api/family/*` — семейное пространство
- `/api/settings/*` — настройки

Документация: OpenAPI (Swagger)

---

## 6. Дизайн и адаптивность

**Десктоп:** боковое меню с переключением «Личное / Семья»

**Мобильные:** нижняя панель (Главная, Операции, Цели, Аналитика, Ещё)

Карточки операций: Swipeable для редактирования/удаления

Toast вместо Celebration overlay

---

## 7. Тестирование

- Unit-тесты: расчёт балансов, автопополнение
- Интеграционные: API-эндпоинты
- E2E: основные сценарии

---

## Version: 2.0
## Date: 2026-01