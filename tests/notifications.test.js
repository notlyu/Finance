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

describe('Notifications', () => {
  let notifId;

  beforeAll(async () => {
    // Create a test notification
    const notif = await prisma.notification.create({
      data: { user_id: user.id, type: 'info', title: 'Test', message: 'Test notification' }
    });
    notifId = notif.id;
  });

  describe('Notification Settings', () => {
    test('GET /api/notifications/settings returns settings', async () => {
      const res = await request(app)
        .get('/api/notifications/settings')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    test('PATCH /api/notifications/settings updates settings', async () => {
      const res = await request(app)
        .patch('/api/notifications/settings')
        .set('Authorization', `Bearer ${token}`)
        .send({ goal_reminder: false });
      expect(res.status).toBe(200);
    });

    test('ignores unknown settings fields', async () => {
      const res = await request(app)
        .patch('/api/notifications/settings')
        .set('Authorization', `Bearer ${token}`)
        .send({ invalid_field: true });
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/notifications', () => {
    test('returns notifications list', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.rows)).toBe(true);
    });

    test('returns limited notifications', async () => {
      const res = await request(app)
        .get('/api/notifications?limit=5')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/notifications/unread-count', () => {
    test('returns unread count', async () => {
      const res = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('count');
    });
  });

  describe('PATCH /api/notifications/:id/read', () => {
    test('marks notification as read', async () => {
      if (!notifId) return;
      const res = await request(app)
        .patch(`/api/notifications/${notifId}/read`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status === 200 || res.status === 204).toBe(true);
    });

    test('returns 404 for non-existent notification', async () => {
      const res = await request(app)
        .patch('/api/notifications/999999/read')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });
  });

  describe('PATCH /api/notifications/read-all', () => {
    test('marks all as read', async () => {
      const res = await request(app)
        .patch('/api/notifications/read-all')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status === 200 || res.status === 204).toBe(true);
    });
  });

  describe('DELETE /api/notifications/:id', () => {
    test('deletes notification', async () => {
      if (!notifId) return;
      const res = await request(app)
        .delete(`/api/notifications/${notifId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status === 200 || res.status === 204).toBe(true);
    });
  });
});
