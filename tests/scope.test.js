const { resolveScope, maskTransaction, personalOrFamilyWhere, SCOPES } = require('../lib/scope');

// Юнит-тесты канонических scope-хелперов (ТЗ «Логика семьи» §4, этап F1).

describe('resolveScope', () => {
  test('соло-пользователь всегда personal (нет family_id)', () => {
    expect(resolveScope({ familyId: null, requestedScope: undefined, accountScope: null })).toBe('personal');
  });

  test('соло-пользователь: явный scope=family коэрсится в personal (анти-мусор §4)', () => {
    expect(resolveScope({ familyId: null, requestedScope: 'family', accountScope: 'family' })).toBe('personal');
  });

  test('§4.2: семейный счёт форсирует family — личную/скрытую с общего счёта нельзя', () => {
    // Реверс В4: явный personal с семейного счёта игнорируется.
    expect(resolveScope({ familyId: 7, requestedScope: 'personal', accountScope: 'family' })).toBe('family');
    expect(resolveScope({ familyId: 7, requestedScope: undefined, accountScope: 'family' })).toBe('family');
  });

  test('участник: с личного счёта можно пометить family (внести в общий бюджет)', () => {
    expect(resolveScope({ familyId: 7, requestedScope: 'family', accountScope: 'personal' })).toBe('family');
    expect(resolveScope({ familyId: 7, requestedScope: 'personal', accountScope: 'personal' })).toBe('personal');
  });

  test('участник: без явного scope наследует scope счёта (F4)', () => {
    expect(resolveScope({ familyId: 7, requestedScope: undefined, accountScope: 'family' })).toBe('family');
    expect(resolveScope({ familyId: 7, requestedScope: undefined, accountScope: 'personal' })).toBe('personal');
  });

  test('участник: без scope и без счёта → personal по умолчанию', () => {
    expect(resolveScope({ familyId: 7, requestedScope: undefined, accountScope: null })).toBe('personal');
  });

  test('shared удалён из поддерживаемых уровней', () => {
    expect(SCOPES).toEqual(['personal', 'family']);
  });
});

describe('maskTransaction', () => {
  const foreignPrivate = {
    id: 1, date: '2026-07-01', type: 'expense', amount: 999, comment: 'секрет',
    scope: 'personal', category_id: 3, category: { name: 'Подарки' },
    account_id: 5, account: { name: 'Личная карта' },
    user_id: 2, user: { name: 'Партнёр' },
  };

  test('чужое личное маскируется, если семья не прозрачна', () => {
    const r = maskTransaction(foreignPrivate, /* viewer */ 1, /* transparent */ false);
    expect(r.is_hidden).toBe(true);
    expect(r.amount).toBeNull();
    expect(r.comment).toBeNull();
    expect(r.category_name).toBe('Скрыто');
    expect(r.account_name).toBeUndefined(); // счёт тоже скрыт (это деталь)
    expect(r.user_name).toBe('Партнёр'); // автор виден (это «факт»)
  });

  test('режим прозрачности раскрывает чужое личное', () => {
    const r = maskTransaction(foreignPrivate, 1, true);
    expect(r.is_hidden).toBe(false);
    expect(r.amount).toBe(999);
    expect(r.comment).toBe('секрет');
  });

  test('своё личное не маскируется', () => {
    const own = { ...foreignPrivate, user_id: 1 };
    const r = maskTransaction(own, 1, false);
    expect(r.is_hidden).toBe(false);
    expect(r.amount).toBe(999);
  });

  test('видимая операция отдаёт имя счёта (отображение информации)', () => {
    const own = { ...foreignPrivate, user_id: 1 };
    const r = maskTransaction(own, 1, false);
    expect(r.account_id).toBe(5);
    expect(r.account_name).toBe('Личная карта');
  });

  test('семейное не маскируется', () => {
    const fam = { ...foreignPrivate, scope: 'family' };
    const r = maskTransaction(fam, 1, false);
    expect(r.is_hidden).toBe(false);
    expect(r.amount).toBe(999);
  });
});

describe('personalOrFamilyWhere', () => {
  test('соло: только свои личные', () => {
    expect(personalOrFamilyWhere(1, null)).toEqual({ family_id: null, user_id: 1 });
  });

  test('участник: семейные ИЛИ свои личные', () => {
    expect(personalOrFamilyWhere(1, 7)).toEqual({
      OR: [{ family_id: 7 }, { family_id: null, user_id: 1 }],
    });
  });
});
