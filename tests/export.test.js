const request = require('supertest');
const ExcelJS = require('exceljs');
const app = require('./testApp');
const prisma = require('../lib/prisma-client');
const {
  createTestUser, generateToken, createTestFamily, createTestCategory,
  cleanupUser, cleanupFamily,
} = require('./helpers');

let user, token;

beforeAll(async () => {
  user = await createTestUser();
  token = generateToken(user.id);
}, 30000);

afterAll(async () => {
  await cleanupUser(user?.id);
});

describe('Export', () => {
  describe('GET /api/export/transactions', () => {
    test('exports transactions as csv', async () => {
      const res = await request(app)
        .get('/api/export/transactions?format=csv')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    test('exports transactions as xlsx', async () => {
      const res = await request(app)
        .get('/api/export/transactions?format=xlsx')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    test('exports with date filter', async () => {
      const res = await request(app)
        .get('/api/export/transactions?format=csv&startDate=2026-01-01&endDate=2026-12-31')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/export/goals', () => {
    test('exports goals as csv', async () => {
      const res = await request(app)
        .get('/api/export/goals?format=csv')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/export/wishes', () => {
    test('exports wishes as csv', async () => {
      const res = await request(app)
        .get('/api/export/wishes?format=csv')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/export/budgets', () => {
    test('exports budgets as csv', async () => {
      const res = await request(app)
        .get('/api/export/budgets?format=csv')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  // Регрессия: личные операции члена семьи имеют family_id (createTransaction
  // проставляет его всем), из-за чего where-clause с `family_id: null` их
  // исключал — собственные личные операции пропадали из экспорта.
  describe('family user own personal transaction', () => {
    let famOwner, famOwnerToken, family, famCat;
    const OWN_PERSONAL_AMOUNT = 54321;

    function binaryParser(res, callback) {
      res.setEncoding('binary');
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => callback(null, Buffer.from(data, 'binary')));
    }

    beforeAll(async () => {
      famOwner = await createTestUser({ name: 'Own Personal Owner' });
      famOwnerToken = generateToken(famOwner.id);
      family = await createTestFamily(famOwner.id);
      await prisma.user.update({ where: { id: famOwner.id }, data: { family_id: family.id } });
      famCat = await createTestCategory({ type: 'expense', name: 'OwnPersCat', family_id: family.id });

      // Собственная ЛИЧНАЯ операция с проставленным family_id (как делает createTransaction)
      await prisma.transaction.create({
        data: {
          user_id: famOwner.id, family_id: family.id, category_id: famCat.id,
          type: 'expense', amount: OWN_PERSONAL_AMOUNT, scope: 'personal', date: new Date(),
        },
      });
    }, 30000);

    afterAll(async () => {
      await prisma.transaction.deleteMany({ where: { family_id: family?.id } }).catch(() => {});
      await cleanupUser(famOwner?.id);
      await cleanupFamily(family?.id);
    });

    test('own personal transaction appears in xlsx export', async () => {
      const res = await request(app)
        .get('/api/export/transactions?format=xlsx')
        .set('Authorization', `Bearer ${famOwnerToken}`)
        .buffer()
        .parse(binaryParser);
      expect(res.status).toBe(200);

      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(res.body);
      const sheet = wb.getWorksheet('Транзакции');
      const amounts = [];
      sheet.eachRow((row, n) => {
        if (n === 1) return; // header
        amounts.push(Number(row.getCell(4).value));
      });

      expect(amounts).toContain(OWN_PERSONAL_AMOUNT);
    });
  });
});
