const request = require('supertest');
const app = require('./testApp');

describe('Health Endpoints', () => {
  test('GET / returns server works', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Server works');
  });

  test('GET /health returns health check', async () => {
    const res = await request(app).get('/health');
    expect(res.status === 200 || res.status === 503).toBe(true);
  });

  test('GET /health/detailed returns detailed health', async () => {
    const res = await request(app).get('/health/detailed');
    expect(res.status === 200 || res.status === 503).toBe(true);
  });

  test('GET /health/jobs returns job status', async () => {
    const res = await request(app).get('/health/jobs');
    expect(res.status).toBe(200);
  });

  test('GET /metrics returns prometheus metrics', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
  });
});
