import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../server.js';
import { prisma } from '../lib/prisma.js';

describe('Machines REST API', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET /api/machines should return array or error if db not populated', async () => {
    const res = await request(app).get('/api/machines');
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) {
      expect(Array.isArray(res.body)).toBe(true);
    }
  });

  it('PATCH /api/machines/:id/status should reject invalid status string', async () => {
    const res = await request(app)
      .patch('/api/machines/fake-id/status')
      .send({ status: 'INVALID_STATUS' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid machine status');
  });
});
