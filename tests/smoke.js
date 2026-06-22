// tests/smoke.js — быстрый smoke-тест против ЗАПУЩЕННОГО сервера (CI job "smoke").
// Проверяет полный стек на живом инстансе: сервер поднялся (+ БД), CSRF-токен,
// регистрация и логин. Без внешних зависимостей (нативный fetch, Node 20+).
// Выходит 0 при успехе, 1 при любой ошибке.

const BASE = `http://localhost:${process.env.PORT || 3001}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function fail(msg, extra) {
  console.error(`[smoke] ❌ ${msg}${extra ? ' — ' + extra : ''}`);
  process.exit(1);
}

async function waitForServer(timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(`${BASE}/health`);
      if (r.ok) return true;
    } catch {
      /* сервер ещё поднимается */
    }
    await sleep(1000);
  }
  return false;
}

async function main() {
  console.log(`[smoke] target: ${BASE}`);

  // 1. Сервер + БД живы
  if (!(await waitForServer())) fail('сервер не ответил на /health за 30с');
  console.log('[smoke] ✅ /health (сервер + БД)');

  // 2. CSRF-токен (базовый GET-роут отдаёт токен)
  const csrf = await fetch(`${BASE}/api/auth/csrf-token`);
  const csrfBody = await csrf.json().catch(() => ({}));
  if (!csrf.ok || !csrfBody.csrfToken) fail('csrf-token', `HTTP ${csrf.status}`);
  console.log('[smoke] ✅ csrf-token');

  // 3. Регистрация (полный стек: валидация + запись в БД)
  const email = `smoke_${Date.now()}@test.com`;
  const password = 'Password123!';
  const reg = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name: 'Smoke User' }),
  });
  if (reg.status !== 200 && reg.status !== 201) {
    fail('register', `HTTP ${reg.status}: ${await reg.text().catch(() => '')}`);
  }
  console.log('[smoke] ✅ register');

  // 4. Логин
  const login = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!login.ok) fail('login', `HTTP ${login.status}: ${await login.text().catch(() => '')}`);
  console.log('[smoke] ✅ login');

  console.log('[smoke] 🎉 все smoke-проверки прошли');
  process.exit(0);
}

main().catch((e) => fail('неожиданная ошибка', e && e.message));
