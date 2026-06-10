---
name: transaction-audit
description: >
  Аудит атомарности операций записи в Finance-проекте — проверка, что все
  многошаговые операции (несколько create/update/delete) обёрнуты в
  prisma.$transaction. Использовать при фразах "проверь транзакции",
  "transaction audit", "атомарность", "проверь $transaction",
  "консистентность записи". Находит небезопасные многошаговые записи.
---

# transaction-audit — аудит атомарности записи

## Триггеры
- `"проверь транзакции"` / `"transaction audit"`
- `"атомарность"` / `"проверь $transaction"`
- `"консистентность записи"`
- При добавлении новой операции с несколькими записями в БД

## Зачем
Если операция делает 2+ записи в БД (например: создать транзакцию + обновить цель,
создать долг + recurring, перевод между счетами) и НЕ обёрнута в `$transaction` —
при сбое на середине данные останутся в неконсистентном состоянии (частичная запись).

## Уже обёрнуто (эталон, сессия 2026-06-10, Этап 5)
- `transactionService.createTransaction` — tx + авто-контрибьюшны целей
- `transactionService.updateTransaction` — tx + helpers (revert/apply contribs)
- `transactionService.batchDeleteTransactions` — revert contribs → delete (порядок важен!)
- `transactionService.deleteTransaction` — revert → delete
- `debtService.createDebt` — долг + recurring
- `wishController.fundWish` — transaction + account + contribution + wish
- `authController.leaveFamily` — оба пути (удаление семьи / выход участника)

## Порядок аудита

### Шаг 1 — найти все операции записи
```bash
grep -rnE "prisma\.\w+\.(create|update|delete|updateMany|deleteMany|createMany|upsert)" services/ controllers/ routes/
```

### Шаг 2 — найти существующие $transaction
```bash
grep -rln "\$transaction" services/ controllers/ routes/
```

### Шаг 3 — для каждой функции с 2+ записями проверить
Вопросы для каждой:
1. Делает ли функция **больше одной** записи в БД, логически связанных?
2. Обёрнуты ли они в `prisma.$transaction(async (tx) => { ... })`?
3. Используют ли внутренние вызовы **переданный `tx`-клиент**, а не глобальный `prisma`?
   (частая ошибка: внутри транзакции вызывается helper, который пишет через `prisma`,
   а не через `tx` — тогда эта запись НЕ в транзакции и не откатится)
4. Правильный ли **порядок** операций? (напр. revert авто-контрибьюшнов ДО удаления
   транзакции, иначе SetNull обнулит связь и revert не найдёт данные)
5. Пробрасываются ли ошибки наружу из callback (для корректного ROLLBACK)?

### Шаг 4 — отчёт
```
🔍 transaction-audit — YYYY-MM-DD
━━━━━━━━━━━━━━━━━━━━━━━━━
✅ createTransaction — $transaction, tx-клиент, порядок ОК
⚠️  someService.transfer — 2 записи (account A, account B) БЕЗ $transaction!
   → Риск: при сбое деньги спишутся с A, но не зачислятся на B
✅ createDebt — $transaction ОК

Итого: 1 проблема атомарности
```

### Шаг 5 — фикс (по подтверждению)
Обернуть в транзакцию, helper'ы должны принимать `tx`:
```js
return await prisma.$transaction(async (tx) => {
  await tx.account.update({ where: { id: a }, data: { balance: { decrement: amt } } });
  await tx.account.update({ where: { id: b }, data: { balance: { increment: amt } } });
  // ошибки пробрасываются автоматически → ROLLBACK
});
```

## Кандидаты для проверки (на момент создания скилла)
- `services/failedJobService.js` (6 операций записи)
- `services/notificationService.js` (4)
- `services/csvImportService.js` (2 — массовый импорт!)
- `services/debtService.js` (2)

## Важно
- Read-only проверки бюджета/баланса можно делать ВНЕ транзакции (не требуют атомарности)
- Некритичные побочные эффекты (пересчёт подушки, отправка email) — лучше ВНЕ транзакции,
  чтобы их сбой не откатывал основную операцию
- После добавления $transaction — `npm test` (особенно тесты атомарности 7.1)
