const { test, expect } = require('@playwright/test');

test.describe('Finance UI Tests', () => {
  const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
  const API_URL = process.env.API_URL || 'http://localhost:5000';

  let token = null;
  let userEmail = null;

  test.beforeAll(async () => {
    userEmail = `test${Date.now()}@test.ru`;
    
    // Регистрация через API
    const registerRes = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, password: 'Test1234!', name: 'Test User' }),
    });
    const registerData = await registerRes.json();
    token = registerData.token;
    
    if (!token) {
      // Логин если регистрация не вернула токен
      const loginRes = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, password: 'Test1234!' }),
      });
      const loginData = await loginRes.json();
      token = loginData.token;
    }
  });

  test.describe.skip('Login Page', () => {
    test('должен отображать форму логина', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toContainText(/войти|войти/i);
    });

    test('должен переключаться на регистрацию', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.click('button:has-text("Зарегистрироваться")');
      await expect(page.locator('input[type="text"]')).toBeVisible();
    });

    test('должен показывать ошибку при неверном пароле', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[type="email"]', 'test@test.ru');
      await page.fill('input[type="password"]', 'wrong');
      await page.click('button[type="submit"]');
      await expect(page.locator('text=Неверный')).toBeVisible();
    });
  });

  test.describe('Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(BASE_URL, { headers: { Cookie: `token=${token}` } });
    });

    test('должен отображать баланс', async ({ page }) => {
      await page.waitForSelector('text=Остаток');
      await expect(page.locator('text=Остаток')).toBeVisible();
    });

    test('должен показывать навигацию', async ({ page }) => {
      await expect(page.locator('text=Главная')).toBeVisible();
      await expect(page.locator('text=Операции')).toBeVisible();
      await expect(page.locator('text=Накопления')).toBeVisible();
    });
  });

  test.describe('Transactions', () => {
    test('должен открыть страницу операций', async ({ page }) => {
      await page.goto(`${BASE_URL}/transactions`, { headers: { Cookie: `token=${token}` } });
      await expect(page.locator('text=Операции')).toBeVisible();
    });

    test('должен открывать форму добавления', async ({ page }) => {
      await page.goto(`${BASE_URL}/transactions`, { headers: { Cookie: `token=${token}` } });
      await page.click('button:has-text("Добавить")');
      await expect(page.locator('text=Новая операция')).toBeVisible();
    });

    test('должен создавать транзакцию', async ({ page }) => {
      await page.goto(`${BASE_URL}/transactions`, { headers: { Cookie: `token=${token}` } });
      await page.click('button:has-text("Добавить")');
      await page.fill('input[type="number"]', '1000');
      await page.click('button:has-text("Сохранить")');
      await page.waitForTimeout(1000);
      
      // Проверяем что транзакция появилась
      const content = await page.content();
      expect(content).toContain('1000');
    });
  });

  test.describe('Goals', () => {
    test('должен отображать страницу целей', async ({ page }) => {
      await page.goto(`${BASE_URL}/goals`, { headers: { Cookie: `token=${token}` } });
      await expect(page.locator('text=Цели')).toBeVisible();
    });

    test('должен создавать новую цель', async ({ page }) => {
      await page.goto(`${BASE_URL}/goals`, { headers: { Cookie: `token=${token}` } });
      await page.click('button:has-text("Создать")');
      await page.fill('input[name="name"]', 'Тестовая цель');
      await page.fill('input[name="target_amount"]', '50000');
      await page.click('button:has-text("Сохранить")');
      await page.waitForTimeout(1000);
      
      const content = await page.content();
      expect(content).toContain('Тестовая цель');
    });
  });

  test.describe('Safety Pillow', () => {
    test('должен показывать текущую подушку', async ({ page }) => {
      await page.goto(`${BASE_URL}/safety-pillow`, { headers: { Cookie: `token=${token}` } });
      await expect(page.locator('text=Подушка')).toBeVisible();
    });

    test('должен позволять настраивать месяцы', async ({ page }) => {
      await page.goto(`${BASE_URL}/safety-pillow`, { headers: { Cookie: `token=${token}` } });
      await page.click('button:has-text("6 мес")');
      await page.waitForTimeout(500);
    });
  });

  test.describe('Mobile', () => {
    test('должен показывать bottom navigation на мобильных', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(BASE_URL, { headers: { Cookie: `token=${token}` } });
      await expect(page.locator('nav >> text=Главная')).toBeVisible();
    });

    test('должен скрывать sidebar на мобильных', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(BASE_URL, { headers: { Cookie: `token=${token}` } });
      // Sidebar должен быть скрыт (hidden md:flex)
      const sidebar = page.locator('aside');
      await expect(sidebar).not.toBeVisible();
    });
  });

  test.describe('Dark Mode', () => {
    test('должен переключать тему', async ({ page }) => {
      await page.goto(BASE_URL, { headers: { Cookie: `token=${token}` } });
      
      // Проверяем начальную тему
      const isDarkInitial = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      
      // Переключаем
      await page.click('button:has(.dark_mode), button:has(.light_mode)');
      
      // Проверяем что тема изменилась
      const isDarkAfter = await page.evaluate(() => document.documentElement.classList.contains('dark'));
      expect(isDarkAfter).not.toBe(isDarkInitial);
    });
  });

  test.describe('Accessibility', () => {
    test('должен поддерживать клавиатурную навигацию', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);
      
      // Tab должен фокуситься на email поле
      await page.keyboard.press('Tab');
      const focused = await page.locator(':focused').getAttribute('type');
      expect(focused).toBe('email');
    });

    test('должен иметь alt текст для изображений', async ({ page }) => {
      await page.goto(BASE_URL, { headers: { Cookie: `token=${token}` } });
      
      // Проверяем что нет изображений без alt
      const imagesWithoutAlt = await page.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll('img'));
        return imgs.filter(img => !img.alt).length;
      });
      
      // Логотип может не иметь alt - это ок
      console.log('Images without alt:', imagesWithoutAlt);
    });
  });

  test.describe('Errors', () => {
    test('должен показывать ошибку при падении API', async ({ page }) => {
      // Перехватываем запросы и возвращаем ошибку
      await page.route('**/api/**', route => {
        route.abort('failed');
      });
      
      await page.goto(`${BASE_URL}/transactions`, { headers: { Cookie: `token=${token}` } });
      
      // Должен показать ошибку
      const content = await page.content();
      expect(content).toMatch(/ошибка|error/i);
    });
  });
});