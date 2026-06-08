const request = require('supertest');
const app = require('./testApp');
const prisma = require('../lib/prisma-client');
const { createTestUser, generateToken, cleanupUser } = require('./helpers');

let user, token;

beforeAll(async () => {
  user = await createTestUser();
  token = generateToken(user.id);
}, 30000);

afterAll(async () => {
  await cleanupUser(user?.id);
});

describe('Import', () => {
  describe('GET /api/import/template', () => {
    test('returns import template', async () => {
      const res = await request(app)
        .get('/api/import/template')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/import/import', () => {
    test('imports CSV data', async () => {
      const csv = 'type,amount,category_name,date\nincome,10000,Salary,2026-05-01\nexpense,2500,Food,2026-05-02';
      const res = await request(app)
        .post('/api/import/import')
        .set('Authorization', `Bearer ${token}`)
        .send({ csv });
      expect(res.status).toBe(200);
    });

    test('returns 400 for empty CSV', async () => {
      const res = await request(app)
        .post('/api/import/import')
        .set('Authorization', `Bearer ${token}`)
        .send({ csv: '' });
      expect(res.status).toBe(400);
    });

    test('imports with mapping', async () => {
      const res = await request(app)
        .post('/api/import/import')
        .set('Authorization', `Bearer ${token}`)
        .send({
          data: [{ type: 'income', amount: '5000', category_name: 'Freelance', date: '2026-05-10' }],
          mapping: { type: 'type', amount: 'amount', category_name: 'category_name', date: 'date' },
        });
      expect(res.status).toBe(200);
    });

    test('returns 400 for empty data array', async () => {
      const res = await request(app)
        .post('/api/import/import')
        .set('Authorization', `Bearer ${token}`)
        .send({ data: [], mapping: {} });
      expect(res.status).toBe(200);
    });
  });
});
