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

describe('Widget Config', () => {
  describe('GET /api/widget-config', () => {
    test('returns widget config with defaults', async () => {
      const res = await request(app)
        .get('/api/widget-config')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('personal_widgets');
      expect(res.body.personal_widgets).toHaveProperty('widgets');
      expect(Array.isArray(res.body.personal_widgets.widgets)).toBe(true);
      expect(res.body).toHaveProperty('family_widgets');
      expect(res.body.family_widgets).toHaveProperty('widgets');
      expect(Array.isArray(res.body.family_widgets.widgets)).toBe(true);
    });
  });

  describe('PATCH /api/widget-config', () => {
    test('updates widget config', async () => {
      const res = await request(app)
        .patch('/api/widget-config')
        .set('Authorization', `Bearer ${token}`)
        .send({
          personal_widgets: { widgets: ['balance', 'income-expense'] },
          family_widgets: { widgets: ['family-balance'] }
        });
      expect(res.status === 200 || res.status === 204).toBe(true);
    });

    test('returns 400 for invalid widget type', async () => {
      const res = await request(app)
        .patch('/api/widget-config')
        .set('Authorization', `Bearer ${token}`)
        .send({ personal_widgets: { widgets: ['nonexistent'] } });
      expect(res.status).toBe(400);
    });

    test('returns 400 for non-array widgets', async () => {
      const res = await request(app)
        .patch('/api/widget-config')
        .set('Authorization', `Bearer ${token}`)
        .send({ personal_widgets: { widgets: 'not_an_array' } });
      expect(res.status).toBe(400);
    });
  });
});
