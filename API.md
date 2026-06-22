# Finance API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication
Токены передаются в cookies (httpOnly) или в заголовке Authorization.
```bash
Authorization: Bearer <token>
```

---

## Auth Endpoints

### POST /auth/register
Регистрация нового пользователя.

**Request:**
```json
{
  "email": "user@example.ru",
  "password": "SecurePass123!",
  "name": "Иван"
}
```

**Response (201):**
```json
{
  "id": 1,
  "email": "user@example.ru",
  "name": "Иван",
  "token": "eyJ...",
  "refreshToken": "...",
  "refreshTokenExpiresAt": "2026-05-20T..."
}
```

---

### POST /auth/login
Вход в систему.

**Request:**
```json
{
  "email": "user@example.ru",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "id": 1,
  "email": "user@example.ru",
  "name": "Иван",
  "family_id": null,
  "token": "eyJ...",
  "refreshToken": "...",
  "refreshTokenExpiresAt": "2026-05-20T..."
}
```

---

### POST /auth/change-password
Смена пароля.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "oldPassword": "OldPass123!",
  "newPassword": "NewPass123!"
}
```

**Response (200):** `"Пароль изменён"`

---

### POST /auth/forgot-password
Запрос сброса пароля.

**Request:**
```json
{
  "email": "user@example.ru"
}
```

**Response (200):** `"Если email существует, код для сброса отправлен"`

---

### POST /auth/reset-password
Сброс пароля с кодом.

**Request:**
```json
{
  "code": "123456",
  "newPassword": "NewPass123!"
}
```

**Response (200):** `"Пароль успешно изменён"`

---

### POST /auth/refresh-token
Обновление токена.

**Request:** `{}` (токен берётся из cookies)

**Response (200):** `"Token refreshed"`

---

### POST /auth/logout
Выход из системы.

**Request:** `{}`

**Response (200):** `"Logged out successfully"`

---

### GET /auth/me
Получение информации о текущем пользователе.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "id": 1,
  "email": "user@example.ru",
  "name": "Иван",
  "family_id": 10,
  "family": {
    "id": 10,
    "name": "Семья Ивановых",
    "invite_code": "ABC123",
    "owner_user_id": 1,
    "members": [...]
  }
}
```

---

## Family Endpoints

### POST /auth/family/create
Создание семьи.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "name": "Семья Ивановых"
}
```

**Response (201):**
```json
{
  "id": 10,
  "name": "Семья Ивановых",
  "invite_code": "ABC123DEF"
}
```

---

### POST /auth/family/join
Вступление в семью по коду.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "inviteCode": "ABC123DEF"
}
```

**Response (200):** `"Вы присоединились к семье"`

---

### POST /auth/family/leave
Выход из семьи.

**Headers:** `Authorization: Bearer <token>`

**Response (200):** `"Вы покинули семью"`

---

### DELETE /auth/family/members/:memberId
Удаление участника (только owner).

**Headers:** `Authorization: Bearer <token>`

**Response (200):** `"Участник name удалён из семьи"`

---

## Transactions Endpoints

### GET /transactions
Получение списка транзакций.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `type` - income | expense
- `categoryId` - ID категории
- `minAmount`, `maxAmount` - диапазон сумм
- `startDate`, `endDate` - диапазон дат
- `q` - поиск по комментарию
- `memberId` - ID участника (семья)
- `paginate=true` - пагинация
- `limit=50`, `offset=0`

**Response (200):**
```json
[{
  "id": 1,
  "date": "2026-04-20",
  "type": "expense",
  "amount": "5000",
  "comment": "Продукты",
  "category_id": 2,
  "category_name": "Продукты",
  "is_private": false
}]
```

**С пагинацией:**
```json
{
  "items": [...],
  "meta": { "total": 100, "limit": 50, "offset": 0, "hasMore": true }
}
```

---

### POST /transactions
Создание транзакции.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "type": "expense",
  "amount": 5000,
  "category_id": 2,
  "date": "2026-04-20",
  "comment": "Покупка",
  "is_private": false
}
```

**Response (201):**
```json
{
  "transaction": { "id": 1, ... },
  "budgetWarning": { "exceeded": true, "spent": 8000, "limit": 10000 }
}
```

---

### PUT /transactions/:id
Редактирование транзакции.

**Headers:** `Authorization: Bearer <token>`

**Request:** Любые поля транзакции.

**Response (200):** Обновлённая транзакция.

---

### DELETE /transactions/:id
Удаление транзакции.

**Headers:** `Authorization: Bearer <token>`

**Response (204):** Пустой ответ.

---

## Goals Endpoints (Накопления)

### GET /goals
Список целей.

**Query Parameters:**
- `status` - active | achieved | all

**Response (200):**
```json
[{
  "id": 1,
  "name": "Отпуск",
  "target_amount": "100000",
  "current_amount": "50000",
  "target_date": "2026-12-31",
  "progress": 50,
  "auto_contribute_enabled": true,
  "auto_contribute_type": "percentage",
  "auto_contribute_value": 10
}]
```

---

### POST /goals
Создание цели.

**Request:**
```json
{
  "name": "Отпуск",
  "target_amount": 100000,
  "target_date": "2026-12-31",
  "auto_contribute_enabled": true,
  "auto_contribute_type": "percentage",
  "auto_contribute_value": 10
}
```

---

### POST /goals/:id/contribute
Ручное пополнение.

**Request:** `{"amount": 5000}`

---

### GET /goals/:id/forecast
Прогноз достижения цели.

**Response (200):**
```json
{
  "estimated_completion": "2026-08-15",
  "monthly_needed": 10000,
  "on_track": true
}
```

---

## Wishes Endpoints (Желания)

### GET /wishes
Список желаний.

**Response (200):**
```json
[{
  "id": 1,
  "name": "Телефон",
  "cost": "80000",
  "saved_amount": "20000",
  "priority": 1,
  "status": "active"
}]
```

---

### POST /wishes
Создание желания.

**Request:**
```json
{
  "name": "Телефон",
  "cost": 80000,
  "priority": 1
}
```

---

### POST /wishes/:id/fund
Финансирование желания.

**Request:** `{"amount": 5000}`

---

## Safety Pillow (Подушка безопасности)

### GET /safety-pillow/settings
Получить настройки.

**Response (200):**
```json
{ "months": 3 }
```

---

### PUT /safety-pillow/settings
Сохранить настройки.

**Request:** `{"months": 6}`

---

### GET /safety-pillow/current
Текущие данные подушки.

**Response (200):**
```json
{
  "liquidFunds": 150000,
  "monthlyAverage": 50000,
  "target": 150000,
  "progress": 100,
  "levels": {
    "minimal": { "months": 3, "target": 150000, "reached": true },
    "comfortable": { "months": 6, "target": 300000, "progress": 50 },
    "optimal": { "months": 12, "target": 600000, "progress": 25 }
  },
  "recommendation": {
    "monthlyAmount": 0,
    "message": "Подушка безопасности уже сформирована!"
  }
}
```

---

## Budgets Endpoints

### GET /budgets
Список бюджетов.

**Query:**
- `month` - 2026-04

---

### POST /budgets
Создание бюджета.

**Request:**
```json
{
  "category_id": 2,
  "limit_amount": 10000,
  "month": "2026-04"
}
```

---

## Recurring Endpoints

### GET /recurring
Список шаблонов.

---

### POST /recurring
Создание шаблона.

**Request:**
```json
{
  "type": "expense",
  "amount": 500,
  "category_id": 2,
  "day_of_month": 15,
  "start_month": "2026-04",
  "comment": "Аренда"
}
```

---

## Reports Endpoints

### GET /reports/dynamics
Динамика за 12 месяцев.

**Query:**
- `type` - income | expense

---

### GET /reports/expenses-by-category
Расходы по категориям.

**Query:**
- `startDate`, `endDate`

---

### GET /reports/export/csv
Экспорт в CSV.

---

### GET /reports/export/excel
Экспорт в Excel.

---

## Debts Endpoints (Кредиты)

### GET /debts
Список кредитов/долгов.

---

### POST /debts
Создание кредита.

**Request:**
```json
{
  "name": "Ипотека",
  "total_amount": 3000000,
  "remaining": 2500000,
  "interest_rate": 12.5,
  "monthly_payment": 35000,
  "start_date": "2025-01-01"
}
```

---

### PUT /debts/:id
Обновление (например, остатка).

---

### DELETE /debts/:id
Удаление (помечается как неактивный).

---

## Import Endpoints

### POST /import/import
Импорт из CSV.

**Request:**
```json
{
  "csv": "date,amount,category,comment\n2026-04-15,50000,Зарплата,Зарплата\n2026-04-16,2500,Продукты,Пятёрочка"
}
```

**Response (200):**
```json
{
  "imported": 2,
  "skipped": 0,
  "errors": []
}
```

---

### GET /import/template
Получить шаблон CSV.

---

## Notes

- Все суммы хранятся как строки в БД, но API принимает числа.
- Личные транзакции создаются с `is_personal: true` и `family_id: null`.
- Семейные транзакции имеют `family_id` семьи.
- Goals автопополняются при создании дохода если `auto_contribute_enabled: true`.
- Пагинация включается параметром `paginate=true`.