// lib/scope.js — единая точка scope-логики (ТЗ «Логика семьи» §4, этап F1).
// Раньше эти правила дублировались в transactionService (создание + маскировка)
// и расходились между модулями. Здесь — канонические хелперы.

// Поддерживаемые уровни. `shared` удалён (мёртвый: 0 строк, никогда не создавался).
const SCOPES = ['personal', 'family'];

// resolveScope — итоговый scope операции при создании/редактировании.
// Правила (§4 инварианта + §4.2 «общий котёл»):
//   • Соло-пользователь (нет family_id) → всегда 'personal' (семейного слоя не существует;
//     явный 'family' от соло — мусор, коэрсим в personal).
//   • Семейный счёт → всегда 'family' (деньги «общего котла», скрыть нельзя — §4.2,
//     заменяет В4: с общего счёта личную/скрытую операцию сделать нельзя).
//   • Личный счёт (или без счёта) → явный выбор пользователя побеждает; иначе personal.
function resolveScope({ familyId, requestedScope, accountScope }) {
  if (!familyId) return 'personal';
  if (accountScope === 'family') return 'family';
  if (requestedScope === 'family' || requestedScope === 'personal') return requestedScope;
  if (accountScope === 'personal') return accountScope;
  return 'personal';
}

// personalOrFamilyWhere — where для выборки «мои личные + всё семейное».
// Соло: только свои личные. Участник: семейные ИЛИ свои личные (чужое личное
// попадает в выборку для маскировки — см. maskTransaction).
function personalOrFamilyWhere(userId, familyId) {
  return familyId
    ? { OR: [{ family_id: familyId }, { family_id: null, user_id: userId }] }
    : { family_id: null, user_id: userId };
}

// maskTransaction — применяет приватность к транзакции при выдаче наружу.
// Чужое личное (scope=personal, другой автор) маскируется до «факта» (сумма/коммент/категория
// скрыты, автор виден), если семья НЕ в режиме прозрачности (R1 / F3).
function maskTransaction(t, viewerId, transparent) {
  const isOtherUsersPrivate = !transparent && t.scope === 'personal' && t.user_id !== viewerId;
  if (isOtherUsersPrivate) {
    return {
      id: t.id,
      date: t.date,
      type: t.type,
      amount: null,
      comment: null,
      scope: 'personal',
      is_hidden: true,
      category_id: t.category_id,
      category_name: 'Скрыто',
      user_id: t.user_id,
      user_name: t.user?.name || 'Участник',
    };
  }
  return {
    id: t.id,
    date: t.date,
    type: t.type,
    amount: t.amount,
    comment: t.comment,
    scope: t.scope,
    is_hidden: false,
    category_id: t.category_id,
    category_name: t.category?.name || 'Без категории',
    account_id: t.account_id ?? null,
    account_name: t.account?.name || null,
    user_id: t.user_id,
    user_name: t.user?.name || '',
  };
}

module.exports = { SCOPES, resolveScope, personalOrFamilyWhere, maskTransaction };
