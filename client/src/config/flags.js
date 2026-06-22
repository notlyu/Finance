// Фиче-флаги фронта. Дефолты — включено; переопределяются через REACT_APP_*
// для быстрого отката без релиза кода (T4.2 ТЗ «Переключение пространств»).

function envFlag(name, def) {
  const v = process.env[name];
  if (v === undefined || v === '') return def;
  return v === 'true' || v === '1';
}

export const flags = {
  // Новая механика пространств: двойной баланс на главной + онбординг-слайд «Личное/Семья».
  // Откат к старому дашборду (только текущее пространство): REACT_APP_SPACE_UX_V2=false
  spaceUxV2: envFlag('REACT_APP_SPACE_UX_V2', true),
  // Семейный слой в интерфейсе. false → приложение «личный-только»: скрыты переключатель
  // пространств, дуал-баланс, scope-чипы, страница и настройки «Семья». Код/БД нетронуты.
  // Вернуть семью: REACT_APP_FAMILY_ENABLED=true
  familyEnabled: envFlag('REACT_APP_FAMILY_ENABLED', false),
};

export default flags;
