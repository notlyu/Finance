export const WIDGET_DEFINITIONS = {
  allocation: {
    id: 'allocation',
    name: 'Распределение',
    icon: 'donut_large',
    description: 'Куда уходят деньги',
    familyOnly: false,
    defaultCols: 4,
  },
  transactions: {
    id: 'transactions',
    name: 'Последние операции',
    icon: 'receipt_long',
    description: 'Последние 3-5 транзакций',
    familyOnly: false,
    defaultCols: 8,
  },
  goals: {
    id: 'goals',
    name: 'Цели и желания',
    icon: 'flag',
    description: 'Прогресс главной цели',
    familyOnly: false,
    defaultCols: 7,
  },
  memberStats: {
    id: 'memberStats',
    name: 'Участники',
    icon: 'groups',
    description: 'Вклад участников семьи',
    familyOnly: true,
    defaultCols: 5,
  },
  budgets: {
    id: 'budgets',
    name: 'Бюджеты',
    icon: 'account_balance_wallet',
    description: 'Ближайший к превышению',
    familyOnly: false,
    defaultCols: 6,
  },
  recurring: {
    id: 'recurring',
    name: 'Регулярные платежи',
    icon: 'repeat',
    description: 'Следующий платёж',
    familyOnly: false,
    defaultCols: 6,
  },
  debts: {
    id: 'debts',
    name: 'Кредиты и долги',
    icon: 'credit_card',
    description: 'Общая сумма долгов',
    familyOnly: false,
    defaultCols: 4,
  },
  safetyPillow: {
    id: 'safetyPillow',
    name: 'Подушка безопасности',
    icon: 'bed',
    description: 'Текущий запас (месяцев)',
    familyOnly: false,
    defaultCols: 4,
  },
  analytics: {
    id: 'analytics',
    name: 'Аналитика',
    icon: 'bar_chart',
    description: 'Краткий график доходов/расходов',
    familyOnly: false,
    defaultCols: 12,
  },
  family: {
    id: 'family',
    name: 'Семья',
    icon: 'family_restroom',
    description: 'Количество участников',
    familyOnly: true,
    defaultCols: 12,
  },
};

export function getVisibleWidgets(widgetConfig, isFamily) {
  return widgetConfig
    .filter(w => !WIDGET_DEFINITIONS[w.type]?.familyOnly || isFamily)
    .sort((a, b) => a.order - b.order);
}
