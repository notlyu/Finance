const http = require('http');

function req(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: 'localhost', port: 5000, path, method, headers: { 'Content-Type': 'application/json' } };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    const req = http.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data || '{}') }); }
        catch { resolve({ status: res.statusCode, data: { raw: data } }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

const tests = { passed: 0, failed: 0, warnings: 0 };

async function test(name, expectedStatus, fn) {
  try {
    const r = await fn();
    const pass = r.status === expectedStatus;
    console.log(`${pass ? '✅' : '❌'} ${name}: статус ${r.status} (ожидал ${expectedStatus})`);
    if (r.status === expectedStatus) tests.passed++;
    else { tests.failed++; console.log('   Данные:', JSON.stringify(r.data).substring(0, 200)); }
  } catch(e) {
    console.log('❌', name, '- ошибка:', e.message);
    tests.failed++;
  }
}

async function run() {
  const email = 'test' + Date.now() + '@test.ru';
  let token = null;
  let userId = null;
  
  console.log('=== ТЕСТИРОВАНИЕ FINANCE APP ===\\n');
  
  // 1. AUTH
  await test('1.1 Регистрация', 201, () => req('POST', '/api/auth/register', { email, password: 'Test1234!', name: 'Тест' }));
  await test('1.2 Логин правильный', 200, () => req('POST', '/api/auth/login', { email, password: 'Test1234!' }));
  const loginR = await req('POST', '/api/auth/login', { email, password: 'Test1234!' });
  token = loginR.data?.token;
  userId = loginR.data?.id;
  await test('1.3 Логин неверный пароль', 401, () => req('POST', '/api/auth/login', { email, password: 'Wrong!' }));
  await test('1.4 Защита /dashboard без токена', 401, () => req('GET', '/api/dashboard'));
  
  if (!token) { console.log('❌ Нет токена, прекращаю'); return; }
  
  // 2. TRANSACTIONS
  await test('2.1 Создание дохода', 201, () => req('POST', '/api/transactions', { amount: 50000, type: 'income', category_id: 1 }, token));
  await test('2.2 Создание расхода', 201, () => req('POST', '/api/transactions', { amount: 5000, type: 'expense', category_id: 2 }, token));
  await test('2.3 Список транзакций', 200, () => req('GET', '/api/transactions', null, token));
  await test('2.4 Dashboard', 200, () => req('GET', '/api/dashboard', null, token));
  
  // 3. GOALS
  await test('3.1 Создание цели', 201, () => req('POST', '/api/goals', { name: 'Тест-цель', target_amount: 100000 }, token));
  await test('3.2 Список целей', 200, () => req('GET', '/api/goals', null, token));
  
  // 4. WISHES  
  await test('4.1 Создание желания', 201, () => req('POST', '/api/wishes', { name: 'Тест-желание', cost: 5000, priority: 1 }, token));
  await test('4.2 Список желаний', 200, () => req('GET', '/api/wishes', null, token));
  
  // 5. SAFETY PILLOW
  await test('5.1 Настройки подушки', 200, () => req('GET', '/api/safety-pillow/settings', null, token));
  await test('5.2 Данные подушки', 200, () => req('GET', '/api/safety-pillow/current', null, token));
  
  // 6. BUDGETS
  await test('6.1 Создание бюджета', 201, () => req('POST', '/api/budgets', { category_id: 2, limit_amount: 10000, month: '2026-04' }, token));
  await test('6.2 Список бюджетов', 200, () => req('GET', '/api/budgets', null, token));
  
  // 7. RECURRING
  await test('7.1 Список регулярных', 200, () => req('GET', '/api/recurring', null, token));
  
// 8. FAMILY
  try { await req('POST', '/api/auth/family/create', { name: 'Test Семья' }, token); } catch {}
  await test('8.1 Повторное создание (already in family)', 400, () => req('POST', '/api/auth/family/create', { name: 'Test Семья' }, token));
  await test('8.2 Инфо о семье', 200, () => req('GET', '/api/auth/me', null, token));
  
  // 9. ANALYTICS
  await test('9.1 Отчет динамика', 200, () => req('GET', '/api/reports/dynamics', null, token));
  await test('9.2 Расходы по категориям', 200, () => req('GET', '/api/reports/expenses-by-category', null, token));
  
  // 10. CATEGORIES
  await test('10.1 Список категорий', 200, () => req('GET', '/api/categories', null, token));
  
  // 11. HEALTH CHECKS
  const healthR = await req('GET', '/api/dashboard', null, token);
  const balance = healthR.data?.personal?.balance;
  const hasData = balance !== undefined && balance !== null;
  console.log(`${hasData ? '✅' : '❌'} Dashboard содержит баланс: ${balance}`);
  if (!hasData) tests.failed++;
  else tests.passed++;
  
  console.log('\\n=== РЕЗУЛЬТАТЫ ===');
  console.log('✅ Пройдено:', tests.passed);
  console.log('❌ Провалено:', tests.failed);
  console.log('⚠️ Предупреждений:', tests.warnings);
  console.log('Процент успеха:', Math.round(tests.passed / (tests.passed + tests.failed) * 100) + '%');
  
  process.exit(tests.failed > 0 ? 1 : 0);
}

run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });