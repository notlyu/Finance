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

describe('Categories', () => {
  let catId;

  describe('POST /api/categories', () => {
    test('creates expense category', async () => {
      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Food', type: 'expense' });
      expect(res.status).toBe(201);
      catId = res.body.id;
    });

    test('creates income category', async () => {
      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Salary', type: 'income' });
      expect(res.status).toBe(201);
    });

    test('returns 400 for missing name', async () => {
      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'expense' });
      expect(res.status).toBe(400);
    });

    test('returns 400 for invalid type', async () => {
      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Bad', type: 'invalid' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/categories', () => {
    test('returns categories list', async () => {
      const res = await request(app)
        .get('/api/categories')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('PATCH /api/categories/:id', () => {
    test('updates category name', async () => {
      if (!catId) return;
      const res = await request(app)
        .patch(`/api/categories/${catId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated' });
      expect(res.status === 200 || res.status === 204).toBe(true);
    });
  });

  describe('DELETE /api/categories/:id', () => {
    test('deletes category', async () => {
      if (!catId) return;
      const res = await request(app)
        .delete(`/api/categories/${catId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status === 200 || res.status === 204).toBe(true);
    });

    test('returns 404 for non-existent category', async () => {
      const res = await request(app)
        .delete('/api/categories/999999')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });
});
