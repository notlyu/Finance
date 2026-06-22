# Структура приложения "Финансы"

## Страницы и функциональные блоки

---

### 1. Login (Вход/Регистрация)
**Путь:** `/login`

**Навигация:**
- Toggle "Войти" ↔ "Зарегистрироваться"

**Форма входа:**
- Поле "Email" (type: email)
- Поле "Пароль" (type: password, toggle "показать/скрыть")
- Кнопка "Войти"
- Ссылка "Забыли пароль?" → `/forgot-password`

**Форма регистрации:**
- Поле "Имя" (только при регистрации)
- Поле "Email"
- Поле "Пароль"
- Кнопка "Зарегистрироваться"

**Элементы:**
- Toggle темы (dark/light)
- Ошибка валидации (красный блок с иконкой error)

---

### 2. ForgotPassword (Восстановление пароля)
**Путь:** `/forgot-password`

**Форма:**
- Поле "Email"
- Кнопка "Отправить ссылку"
- Ссылка "← Назад к входу"

---

### 3. Dashboard (Главная страница)
**Путь:** `/personal/dashboard` или `/family/dashboard`

**Навигация (через Layout):**
- Sidebar с иконками → соответствующие страницы

**Блоки:**

**A. Header**
- Заголовок: "Личные финансы" / "Семейные финансы"
- Подпись: текущий месяц и год (например, "Апрель 2026")
- Переключатель mode: "Личное" ↔ "Семья" (в header) — только если есть семья

**B. Hero Card — Сводка (gradient card)**
- Большой остаток (available)
- Доход за месяц (+зеленый)
- Расход за месяц (−красный)
- Процент накопления (%)

**C. Баланс ликвидных счетов**
- Баланс (сумма)
- Прогресс-бар: сколько % свободно
- Бейдж с процентом

**D. Система виджетов (настраиваемая сетка)**
- Настраиваемые карточки-виджеты с возможностью добавления/удаления
- Настройки сохраняются в localStorage
- Сетка: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Кнопка "Добавить виджет" → dropdown с доступными виджетами

**Доступные виджеты:**
| Виджет | Icon | Описание | Family Only |
|--------|------|----------|-------------|
| Распределение | donut_large | Куда уходят деньги | Нет |
| Последние операции | receipt_long | Последние 3-5 транзакций | Нет |
| Цели и желания | flag | Прогресс главной цели | Нет |
| Участники | groups | Вклад участников семьи | Да |
| Бюджеты | account_balance_wallet | Ближайший к превышению | Нет |
| Регулярные платежи | repeat | Следующий платёж | Нет |
| Кредиты и долги | credit_card | Общая сумма долгов | Нет |
| Подушка безопасности | bed | Текущий запас (месяцев) | Нет |
| Аналитика | bar_chart | Краткий график доходов/расходов | Нет |
| Семья | family_restroom | Количество участников | Да |

---

### 4. Transactions (Операции)
**Путь:** `/personal/transactions` или `/family/transactions`

**Фильтры:**
- Период: "Сегодня" / "Вчера" / "Эта неделя" / "Этот месяц" / "Произвольный"
- Тип: "Все типы" / "Доходы" / "Расходы"
- Категория: dropdown
- Фильтр: "Все операции" / "Только мои" / "Семейные"
- Поиск (input с debounce)
- Кнопка "Сбросить все фильтры"
- Date picker (для "Произвольный")

**Основные элементы:**
- Кнопка "+ Добавить операцию" (открывает модальное)
- Выбор счёта в форме операции

**Список операций:**
- Карточки:
  - Дата
  - Иконка категории
  - Название категории
  - Комментарий
  - Сумма (+зеленый/−красный)
  - Приватность (lock icon)
  - Кнопки действий (карандаш редактировать, корзина удалить)
  - Кнопка "Загрузить ещё" (пагинация)

**A. Модальное окно "Новая операция":**
- Заголовок: "Новая операция"
- Поле "Тип": "Расход" / "Доход" (toggle)
- Поле "Категория": dropdown
- Поле "Счёт": dropdown (выбор счёта)
- Поле "Сумма": FormattedInput
- Поле "Дата": date picker
- Переключатель "Личное": вкл/выкл (eye icon) — скрыт в личном пространстве
- Поле "Комментарий": textarea
- Кнопки: "Отмена", "Сохранить"

**B. Модальное окно "Редактировать":**
- Аналогично "Новая операция"
- Дополнительно: удаление

**C. ConfirmModal "Удалить":**
- Заголовок: "Удалить операцию?"
- Сообщение: "Это действие нельзя отменить"
- Кнопки: "Отмена", "Удалить"

---

### 5. GoalsWishes (Цели и Желания - ОБЪЕДИНЕНО)
**Путь:** `/personal/goals` или `/family/goals`

**Tabs внутри страницы:**
- "Цели" / "Желания"

**Навигация в Sidebar:**
- Только "Цели" → открывает GoalsWishes с возможностью переключения между вкладками

**Элементы (общие для обеих вкладок):**
- Кнопка "Архив" (если есть archive)
- Кнопка "+ Добавить цель" / "+ Добавить желание"

**Вкладка "Цели":**
- Сетка карточек целей:
  - Иконка категории
  - Название
  - Срок (дата)
  - Прогресс-бар (%)
  - Накоплено / Цель
  - Кнопка "Пополнить"
  - Кнопка "Прогноз" (опционально)

**Вкладка "Желания":**
- Сетка карточек желаний:
  - Приоритет: ★★★ / ★★ / ★ (high/medium/low)
  - Название
  - Прогресс-бар
  - Накоплено / Стоимость
  - Lock icon (если приватное)
  - Кнопка "Выделить средства"

**A. Модальное окно "Создать/Редактировать цель":**
- Поле "Название"
- Поле "Целевая сумма"
- Поле "Текущая сумма"
- Поле "Срок" (date)
- Toggle "Автопополнение": при включении создаёт RecurringTransaction (авто-пополнение)
  - Тип: "% от дохода" / "Фиксированная"
  - Значение
- Toggle "Семейная цель"
- Категория: dropdown
- Поле "Счёт": dropdown (выбор счёта)
- Кнопки: "Отмена", "Сохранить"

**B. Модальное окно "Пополнить цель":**
- Текущая сумма / Цель
- Прогресс-бар
- Кнопки быстрого пополнения: 10%, 25%, 50%, 75%, 90%, 100%
- Поле "Сумма"
- Toggle "Создать транзакцию"
- Preview: сколько останется
- Кнопки: "Отмена", "Пополнить"

**C. Модальное окно "Создать/Редактировать желание":**
- Поле "Название"
- Поле "Стоимость"
- Поле "Текущая сумма"
- Поле "Приоритет": 1 / 2 / 3 (high/medium/low)
- Поле "Категория": dropdown (опционально)
- Статус: active/completed/cancelled
- Toggle "Скрыть от семьи"
- Поле "Счёт": dropdown (выбор счёта)
- Кнопки: "Отмена", "Сохранить"

**D. Модальное окно "Выделить средства" (для желаний):**
- Текущая сумма / Стоимость
- Прогресс-бар
- Кнопки быстрого выделения: Полностью, 1/2, 1/3, 2/3, 1/4, 3/4
- Поле "Сумма"
- Preview: сколько останется
- Кнопки: "Отмена", "Выделить"

**E. ConfirmModal "Удалить цель/желание":**
- Заголовок: "Удалить цель?" / "Удалить желание?"
- Сообщение: "Все накопления будут потеряны"

**Celebration overlay:**
- При достижении 100%: анимация "🎉 Цель достигнута!" / "Желание выполнено!"

---

### 6. Budgets (Бюджеты)
**Путь:** `/personal/budgets` или `/family/budgets`

**Управление:**
- Выбор месяца: стрелки < > + month picker
- Выбор участника: dropdown (если в семье)
- Toggle "Месяц" / "Год" в заголовке

**Годовой вид:**
- Показывает агрегированные данные за 12 месяцев
- Создание годового бюджета автоматически создаёт 12 месячных бюджетов
- API поддерживает параметр `period=year`

**Создание:**
- Кнопка "+ Новый бюджет"

**Таблица бюджетов:**
- Колонки: Категория | Лимит | Потрачено | Остаток | Прогресс
- Строка категории:
  - Иконка
  - Название
  - Тип (доход/расход) - бейдж
  - Progress bar (цвет = % лимита)
  - Inline edit: карандаш → редактирование лимита

**A. Модальное окно "Новый бюджет":**
- Поле "Месяц": month picker
- **Выбор типа бюджета**: "Расход" / "Доход" (toggle) ← НОВОЕ
- Поле "Категория": dropdown (фильтруется по типу)
- Период: "Месяц" / "Год"
- Поле "Лимит (₽/мес)"
- Тип бюджета: "Семейный" / "Личный"
- Кнопки: "Отмена", "Сохранить"

**B. Модальное окно "Редактировать":**
- Аналогично созданию
- Inline: клик на лимит → редактирование

**C. ConfirmModal "Удалить бюджет"**

---

### 7. Recurring (Регулярные платежи)
**Путь:** `/personal/recurring` или `/family/recurring`

**Статистика:**
- Активных операций
- В месяц (сумма)
- Следующая операция

**Создание:**
- Кнопка "+ Добавить"

**Таблица:**
- Колонки: Активно | Тип | Категория | Сумма | День | Комментарий | Видимость | Действия
- Toggle активности (inline)
- Кнопка "Удалить"

**Интеграция:**
- Связь с Целями (авто-пополнение → RecurringTransaction)
- Связь с Долгами (регулярные платежи по долгу)

**A. Модальное окно "Создать/Редактировать":**
- Поле "Тип": Расход / Доход
- Поле "Категория": dropdown
- Поле "Сумма"
- Поле "День месяца" (1-31, days 29-31 авто-корректируются до последнего дня месяца)
- Поле "Комментарий"
- Toggle "Скрыть от семьи" (в личном пространстве скрыт) / автоматически "Семейный" (в семейном)
- Кнопки: "Отмена", "Сохранить"

**B. ConfirmModal "Удалить":**

---

### 8. Debts (Кредиты и долги)
**Путь:** `/personal/debts` или `/family/debts`

**Управление:**
- Общая сумма долгов
- Кнопка "+ Добавить" (toggle формы)

**Форма добавления:**
- Поле "Название"
- Поле "Сумма"
- Поле "Остаток"
- Поле "Процент"
- Поле "Ежемесячный платёж"
- Тип: "Кредит" / "Долг"
- Дата начала
- Заметки
- Чекбокс "Создать регулярный платёж" — при включении автоматически создаёт ежемесячный RecurringTransaction для погашения
- Кнопки: "Отмена", "Сохранить"

**Список:**
- Карточки долгов:
  - Название + тип бейдж
  - Остаток / Сумма
  - Ежмесячный платёж + процент
  - Кнопка "Закрыть часть" (иконка платежей)
  - Кнопка "Удалить"

**A. Модальное окно "Закрыть часть":**
- Заголовок: "Частичное погашение"
- Отображается остаток
- Поле ввода суммы для погашения
- Кнопки: "Отмена", "Погасить"

**ConfirmModal "Удалить":** (заголовок: "Закрыть полностью?")

---

### 9. Import (Импорт)
**Путь:** `/import`

**Примечание:** Страница Import.jsx существует в клиенте, но роут не добавлен в App.js.
Доступ возможен только через прямой URL.

**Элементы:**
- Заголовок: "Импорт из CSV"
- Загрузка файла (drag-n-drop, поддержка перетаскивания)
- Предпросмотр маппинга колонок
- Кнопка "Импортировать"
- Ссылка на пример формата
- Инструкция

**Процесс:**
- Loading state при импорте
- Success/error сообщение

---

### 10. Analytics (Аналитика)
**Путь:** `/personal/analytics` или `/family/analytics`

**Выбор периода:**
- Presets: 3m, 6m, 12m, Произвольный

**Графики:**
- **Line Chart "Динамика доходов и расходов"**
  - По месяцам
  - Легенда: Доход / Расход

- **Doughnut Chart "Расходы по категориям"**

- **Doughnut Chart "Доходы по категориям"**

- **Line Chart "История подушки безопасности"**

**Элементы:**
- Member filter (если в семье)
- Кнопка "Экспорт" (dropdown: Excel / CSV)
- Toggle theme графиков (для печати)

---

### 11. Export (Экспорт данных)
**Путь:** `/personal/export` или `/family/export`

**Примечание:** Страница Export.jsx существует в клиенте, но роут не добавлен в App.js.
Ссылка в sidebar ведет на несуществующий маршрут.

**Элементы:**
- Выбор типа данных: Транзакции / Цели / Желания / Бюджеты
- Выбор формата: Excel / CSV
- Выбор периода: startDate, endDate
- Кнопка "Скачать"

**API параметры:**
- `format`: excel / csv
- `startDate`: YYYY-MM-DD
- `endDate`: YYYY-MM-DD
- `type`: transactions / goals / wishes / budgets
- `period`: month / year (для бюджетов)

**Backend файлы:**
- `routes/exportRoutes.js` — Export endpoints
- `controllers/exportController.js` — Excel/CSV export с использованием exceljs

---

### 13. SafetyPillow (Подушка безопасности)
**Путь:** `/personal/safety-pillow` или `/family/safety-pillow`

**Блоки:**

**A. Main Card: Ликвидные средства**
- Доступно сейчас
- Зарезервировано всего
- Среднемесячный расход
- Месяцев покрытия

**B. Настройки**
- Presets: 3 / 6 / 9 / 12 / 18 / 24 месяца
- Кастомный ввод
- Кнопка "Сохранить"

**C. Progress**
- Уровни: Минимальная → Комфортная → Оптимальная
- Прогресс к цели

**D. Топ расходов по категориям**

**E. История (graph)**

**F. Ежемесячные снимки (Snapshots)**
- Ежемесячный cron-запуск создаёт записи в SafetyPillowSnapshot
- Данные: ликвидные средства, среднемесячный расход, месяцы покрытия

---

### 14. Settings (Настройки)
**Путь:** `/personal/settings` или `/family/settings`

**Tabs:**

**A. Tab: Профиль**
- Avatar (первая буква имени)
- Имя и Email
- Смена пароля:
  - Старый пароль
  - Новый пароль (валидация: minLength 8, цифра + буква)
  - Кнопка "Изменить пароль"
  - Сообщение об успехе/ошибке

**B. Tab: Уведомления**
- Toggle: Достижение цели
- Toggle: Выполнение желания
- Toggle: Превышение бюджета
- Toggle: Регулярные платежи
- Кнопка "Сохранить"

**C. Tab: Категории**
- Форма добавления:
  - Название
  - Тип: Расход / Доход
  - При создании в семейном режиме: бейдж "Семейная"
  - Кнопка "Добавить"
- Таблица категорий:
  - Системные категории (только просмотр)
  - Бейджи: "Семейная" (family_id != NULL) / "Личная" (family_id = NULL)
  - Личные категории видны только создателю

**D. Tab: Оформление**
- Toggle темы (dark/light)

---

### 15. Family (Управление семьёй)
**Путь:** `/family/manage`

**Состояния:**

**A. Нет семьи:**
- Кнопка "Создать семью"
- Кнопка "Присоединиться"

**PromptModal "Создать":**
- Input "Название семьи"
- Кнопка "Создать"

**PromptModal "Присоединиться":**
- Input "Код приглашения"
- Кнопка "Присоединиться"

**B. Есть семья:**

**B1. Участники:**
- Список участников
- Имя + роль
- Кнопка "Удалить" (ConfirmModal)
- Инвайт-код (с кнопкой "Копировать")
- Кнопка "Передать владение" (ConfirmModal)

**B2. Приглашения:**
- Список активных инвайтов
- Кнопка "Отозвать" (ConfirmModal)

**B3. Действия:**
- Кнопка "Покинуть семью" (ConfirmModal)

**ConfirmModal общие:**
- Заголовок
- Сообщение
- Кнопки: "Отмена", "Подтвердить"

---

### 16. Navigation (Layout/Sidebar)
**Путь:** все (через Outlet)

**Навигация (Sidebar):**
- Главная (`/personal/dashboard` или `/family/dashboard`)
- Операции (`/personal/transactions` или `/family/transactions`)
- Цели (`/personal/goals` или `/family/goals`) ← **ВКЛЮАЕТ ЖЕЛАНИЯ**
- Подушка (`/personal/safety-pillow` или `/family/safety-pillow`)
- Аналитика (`/personal/analytics` или `/family/analytics`)
- Бюджеты (`/personal/budgets` или `/family/budgets`)
- Кредиты (`/personal/debts` или `/family/debts`)
- Регулярные (`/personal/recurring` или `/family/recurring`)
- Экспорт (`/personal/export` или `/family/export`)
- Семья (`/family/manage`) - только для семейного пространства
- Настройки (`/personal/settings` или `/family/settings`)

**Элементы (Header):**
- Заголовок текущей страницы
- Space Switcher: "Личное" ↔ "Семья" (только если есть семья)
- Календарь (текущий месяц и год)
- NotificationBell (колокольчик)
- Toggle темы (dark_mode)
- Avatar пользователя

**Элементы (Sidebar Bottom):**
- Профиль → `/settings`
- Выйти → logout
- Кнопка "Добавить операцию" → `/transactions`

**Мобильная навигация:**
- Bottom navigation bar (md:hidden)
- Mobile Menu (полный экран)
- Меню "Меню" → дополнительные пункты

---

## Модальные окна общего назначения

### 1. Modal (стандартное)
- Overlay (darkened background)
- Card с rounded corners
- Header с title и close button
- Body (контент)
- Footer (actions)

### 2. ConfirmModal
- Варианты: default / danger / warning
- Title
- Message
- Кнопки: Cancel / Confirm

### 3. PromptModal
- Title
- Input field
- Кнопки

### 4. ForecastModal (прогнозы Goals)
- График
- Параметры

### 5. OnboardingModal (НОВОЕ)
- Показывается новым пользователям
- Настраивается через localStorage

### Toast
- Success (зелёный)
- Error (красный)
- Info (синий)

---

## UI Компоненты

### Base UI Components:
- `components/ui/Button.jsx`
- `components/ui/Card.jsx`
- `components/ui/Input.jsx`
- `components/ui/Select.jsx`
- `components/ui/EmptyState.jsx`
- `components/ui/Skeleton.jsx`
- `components/ui/SectionHeader.jsx`
- `components/ui/FormattedInput.jsx`

### Widget System (НОВОЕ):
- `widgets/widgetRegistry.js` — Реестр определений виджетов
- `widgets/WidgetCard.jsx` — Карточка виджета
- `widgets/Widget.jsx` — Базовый компонент виджета
- `widgets/WidgetEditorModal.jsx` — Редактор виджетов
- `services/widgetStorage.js` — Хранение конфигурации виджетов (localStorage)

### Стили:
- Tailwind CSS
- Material Symbols иконки
- Glass-card эффекты
- Gradient backgrounds
- Dark/Light theme через class="dark" на html элементе

---

## Переключатели и фильтры

### Toggle компоненты:
- Dark/Light theme
- Family/Personal mode
- Private/Public (eye icon)
- Active/Inactive
- Автопополнение

### Filter компоненты:
- Date presets (today/week/month/custom)
- Type filters (income/expense)
- Category filters
- Member filters
- Search with debounce

### Pagination:
- "Загрузить ещё" button
- Infinite scroll

---

## Типы данных и связи

### User:
- id, email, password_hash, name, family_id, created_at

### Family:
- id, name, invite_code, owner_user_id, created_at

### FamilyMember (НОВОЕ):
- id, user_id, family_id, role (OWNER/ADMIN/MEMBER/VIEWER), joined_at

### FamilyInvite (НОВОЕ):
- id, family_id, code, created_by, expires_at?, created_at

### Transaction:
- id, user_id, family_id, account_id?, category_id, amount, type, date, comment, is_private, is_personal, created_at, updated_at

### Goal:
- id, user_id, family_id, name, target_amount, current_amount, deadline?, category_id?, is_archived, created_at, updated_at
- auto_contribute_enabled, auto_contribute_type?, auto_contribute_value?

### GoalContribution (НОВОЕ):
- id, goal_id, user_id, amount, created_at, transaction_id?

### Wish:
- id, user_id, family_id, name, cost, saved_amount, priority, status (active/completed/cancelled), category_id?, is_private, archived, archived_at?, created_at, updated_at

### WishContribution (НОВОЕ):
- id, wish_id, user_id, amount, created_at, transaction_id?

### Budget:
- id, user_id, family_id?, category_id, month, limit_amount, created_at, updated_at

### RecurringTransaction:
- id, user_id, family_id?, category_id, amount, type, day_of_month, start_month, comment?, is_private, active, last_run_month?, goal_id?, debt_id?, created_at, updated_at

### Account:
- id, user_id, family_id?, name, type (bank), balance, currency (RUB), is_active, is_shared, is_liquid, created_at, updated_at

### Category:
- id, name, type, icon?, color?, user_id?, is_system, family_id?

### SafetyPillowSetting:
- id, user_id?, family_id?, months (default: 3), updated_at

### SafetyPillowSnapshot:
- id, user_id?, family_id?, total_income, total_expenses, safety_pillow, monthly_limit, calculated_at

### SafetyPillowHistory:
- id, user_id?, family_id?, total_income, total_expenses, safety_pillow, calculated_at

### Notification (НОВОЕ):
- id, user_id, type, title, message, read, data?, created_at, related_id?, related_type?

### NotificationSetting (НОВОЕ):
- id, user_id (unique), remind_upcoming, notify_goal_reached, notify_budget_exceeded, notify_wish_completed, created_at, updated_at

### PasswordResetToken (НОВОЕ):
- id, user_id, token, expires_at, created_at

### RefreshToken (НОВОЕ):
- id, user_id, token (unique), expires_at, created_at, revoked

### AuditLog (НОВОЕ):
- id, user_id?, action, entity_type, entity_id?, changes?, metadata?, ip_address?, user_agent?, created_at

### Debt:
- id, user_id, family_id?, name, total_amount, remaining, interest_rate?, monthly_payment, type (credit), start_date, end_date?, notes?, is_active, created_at, updated_at

### FailedJob (НОВОЕ):
- id, job_type, payload, error, attempts, max_attempts, scheduled_at, last_attempt_at?, next_retry_at?, completed, created_at

---

## Backend Files

### Routes (16 файлов):
- `routes/authRoutes.js` — Authentication endpoints
- `routes/transactionRoutes.js` — Transaction CRUD
- `routes/goalRoutes.js` — Goal management
- `routes/wishRoutes.js` — Wish management
- `routes/budgetRoutes.js` — Budget CRUD + yearly budgets
- `routes/recurringRoutes.js` — Recurring transactions
- `routes/debtRoutes.js` — Debt management, partial close
- `routes/categoryRoutes.js` — Category CRUD
- `routes/safetyPillowRoutes.js` — Safety pillow settings & snapshots
- `routes/dashboardRoutes.js` — Dashboard data endpoints
- `routes/importRoutes.js` — CSV import
- `routes/exportRoutes.js` — Export endpoints (transactions, goals, wishes, budgets)
- `routes/accountRoutes.js` — Account management
- `routes/notificationRoutes.js` — Notification management
- `routes/auditRoutes.js` — Audit log endpoints
- `routes/reportRoutes.js` — Report generation

### Controllers (13 файлов):
- `controllers/authController.js`
- `controllers/transactionController.js`
- `controllers/goalController.js` — Creates recurring when auto_contribute enabled
- `controllers/wishController.js` — handle account_id in fundWish, updated calcAvailableFunds
- `controllers/budgetController.js`
- `controllers/recurringController.js` — Handles days 29-31, links to goals/debts
- `controllers/debtController.js` — Creates recurring payment for debts, partial close endpoint
- `controllers/categoryController.js`
- `controllers/safetyPillowController.js`
- `controllers/dashboardController.js` — Uses liquid accounts for balance
- `controllers/importController.js`
- `controllers/exportController.js` — Excel/CSV export using exceljs
- `controllers/accountController.js`
- `controllers/notificationController.js`
- `controllers/reportController.js`

### Jobs (3 файла):
- `jobs/recurringJob.js` — Daily recurring transaction creation (03:05)
- `jobs/interestJob.js` — Monthly interest accrual for goals (00:00 on 1st)
- `jobs/snapshotJob.js` — Monthly safety pillow snapshot (00:00 on 1st)

### Services:
- `services/failedJobService.js` — Retry failed jobs every 5 minutes

### Middleware:
- `middleware/errorHandler.js` — Global error handler
- `middleware/requestLogger.js` — Request logging

### Lib:
- `lib/prisma-client.js` — Prisma client instance
- `lib/socket.js` — WebSocket initialization (initSocket)
- `lib/swagger.js` — Swagger/OpenAPI documentation
- `lib/validation.js` — Joi validation schemas

### Endpoints:
- `GET /` — Server status
- `GET /health` — Health check with DB connection
- `GET /health/detailed` — Detailed health (DB, memory)
- `GET /health/jobs` — Job status information
- `GET /metrics` — Prometheus metrics
- `GET /api-docs` — Swagger UI documentation

---

## Visibility модель:

| Сущность | family_id | privacy flags | Описание |
|----------|----------|---------------|----------|
| Transaction | NOT NULL | is_private | Приватная — скрыта от других участников |
| Transaction | NULL | is_personal=true | Только владельцу |
| Goal | NOT NULL | - | Видна всем участникам семьи |
| Goal | NULL | - | Только владельцу |
| Wish | NOT NULL | is_private=true | Скрыта от семьи |
| Wish | NULL | - | Только владельцу |
| RecurringTransaction | NOT NULL | is_private | Приватная — скрыта от других |
| RecurringTransaction | NULL | - | Только владельцу |
| Budget | NOT NULL | - | Семейный |
| Budget | NULL | - | Личный |
| Account | NOT NULL | is_shared | Семейный счёт |
| Account | NULL | - | Личный счёт |
| Category | NOT NULL | - | Семейная категория |
| Category | user_id set | - | Личная категория (видна только создателю) |

**FamilyMember роли:**
- OWNER: полный контроль, может передать владение
- ADMIN: управление участниками, бюджетами
- MEMBER: стандартные операции
- VIEWER: только просмотр

---

## Space Model (Пространства)

### Personal Space (`/personal/*`):
- Показывает только личные данные (user_id = current user, family_id = NULL)
- Транзакции с `is_personal = true`
- Цели и желания с `family_id = NULL`
- Бюджеты личные
- Счета личные (family_id = NULL)

### Family Space (`/family/*`):
- Показывает семейные данные (family_id = current family) + личные всех участников
- Транзакции семейные И личные участников
- Цели и желания семейные И личные участников
- Бюджеты семейные
- Счета семейные (is_shared = true)

### Роутинг (App.js):
- Dashboard использует DashboardWithWidgets для обоих пространств
- Settings общий компонент (без space prop)
- Family доступен только в /family/manage
- Legacy роуты `/` и `/*` редиректят на `/personal/dashboard`

---

## Version
- Дата создания: 2026-01
- Версия frontend: React + Material Symbols + Tailwind CSS
- Версия backend: Node.js + Express + Prisma + PostgreSQL
- Последнее обновление: 2026-04-29
  - Dashboard заменен на DashboardWithWidgets с системой настраиваемых виджетов
  - Добавлены 10 виджетов: Распределение, Последние операции, Цели и желания, Участники, Бюджеты, Регулярные платежи, Кредиты и долги, Подушка безопасности, Аналитика, Семья
  - Виджеты сохраняются в localStorage (widgetStorage.js)
  - Реестр виджетов: widgetRegistry.js (WIDGET_DEFINITIONS)
  - Компоненты виджетов: WidgetCard.jsx, Widget.jsx, WidgetEditorModal.jsx
  - Обновлена навигация: добавлен "Экспорт" в sidebar
  - OnboardingModal добавлен для новых пользователей
  - Добавлены новые модели: FamilyMember, FamilyInvite, GoalContribution, WishContribution, Notification, NotificationSetting, PasswordResetToken, RefreshToken, AuditLog, FailedJob, SafetyPillowSetting, SafetyPillowHistory
  - FamilyRole enum: OWNER, ADMIN, MEMBER, VIEWER
  - Добавлен interestJob (начисление процентов по целям ежемесячно)
  - Добавлен failedJobService с retry mechanism (каждые 5 минут)
  - Добавлены новые контроллеры: notificationController, reportController
  - Добавлены новые роуты: notificationRoutes, auditRoutes, reportRoutes
  - Добавлены Prometheus метрики (/metrics)
  - Добавлены detailed health checks (/health/detailed, /health/jobs)
  - WebSocket инициализация через initSocket
  - Swagger/OpenAPI документация (/api-docs)
  - Обновлены модели: Account (type, is_liquid, updated_at), RecurringTransaction (start_month, last_run_month, без account_id), Goal (auto_contribute_* поля), Wish (status, archived, is_private)
  - Budget: добавлен updated_at
  - Category: добавлены icon, color, user_id
  - Tailwind CSS используется для стилизации
  - Дизайн: Material Symbols иконки, glass-card эффекты, gradient backgrounds
