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

describe('Safety Pillow', () => {
  describe('GET /api/safety-pillow/settings', () => {
    test('returns settings with defaults', async () => {
      const res = await request(app)
        .get('/api/safety-pillow/settings')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  describe('PUT /api/safety-pillow/settings', () => {
    test('updates months setting', async () => {
      const res = await request(app)
        .put('/api/safety-pillow/settings')
        .set('Authorization', `Bearer ${token}`)
        .send({ months: 6 });
      expect(res.status === 200 || res.status === 204).toBe(true);
    });

    test('updates to 3 months preset', async () => {
      const res = await request(app)
        .put('/api/safety-pillow/settings')
        .set('Authorization', `Bearer ${token}`)
        .send({ months: 3 });
      expect(res.status === 200 || res.status === 204).toBe(true);
    });

    test('returns 400 for months < 1', async () => {
      const res = await request(app)
        .put('/api/safety-pillow/settings')
        .set('Authorization', `Bearer ${token}`)
        .send({ months: 0 });
      expect(res.status).toBe(400);
    });

    test('returns 400 for missing months', async () => {
      const res = await request(app)
        .put('/api/safety-pillow/settings')
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/safety-pillow/current', () => {
    test('returns current pillow state', async () => {
      const res = await request(app)
        .get('/api/safety-pillow/current')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/safety-pillow/history', () => {
    test('returns history', async () => {
      const res = await request(app)
        .get('/api/safety-pillow/history')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(typeof res.body.total).toBe('number');
    });
  });

  describe('POST /api/safety-pillow/snapshot', () => {
    test('creates a snapshot', async () => {
      const res = await request(app)
        .post('/api/safety-pillow/snapshot')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status === 200 || res.status === 201).toBe(true);
    });
  });
});
