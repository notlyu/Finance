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
};

export default flags;
