const rubFormatter = new Intl.NumberFormat('ru-RU', {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

export function formatMoney(value) {
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return '0';
  return rubFormatter.format(Math.trunc(n));
}

