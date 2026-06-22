// Единый источник презентации маскированных (чужих личных) операций.
// Раньше эти строки были захардкожены в 4 местах TransactionList (карточка + строка
// таблицы). Здесь — одна точка правды (ТЗ «Логика семьи» §5, этап F5: унификация маски).
// Бэкенд отдаёт замаскированную операцию с is_hidden=true (см. lib/scope.maskTransaction);
// здесь — как её показывать.
export const MASK_ICON = 'lock';
export const MASK_LABEL = '🔒 Сюрприз';
export const MASK_DOTS = '••••';
export const MASK_ACTION = 'Скрыто';
