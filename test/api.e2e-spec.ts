import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { createTestContext, type TestContext } from './helpers/test-context.js';

describe('Technical test API', () => {
  let ctx: TestContext;
  beforeAll(async () => { ctx = await createTestContext(); });
  beforeEach(async () => { await ctx.reset(); });
  afterAll(async () => { await ctx?.close(); });

  it('keeps public catalog reads and protects mutations', async () => {
    expect((await ctx.api.inject('/api/products')).statusCode).toBe(200);
    expect((await ctx.api.inject('/api/products/999')).statusCode).toBe(404);
    expect((await ctx.api.inject({ method: 'POST', url: '/api/products', payload: {} })).statusCode).toBe(401);
  });

  it('registers, rejects duplicates and rejects bad credentials', async () => {
    const payload = { username: 'test_user', password: 'secret123', password_confirmation: 'secret123' };
    expect((await ctx.api.inject({ method: 'POST', url: '/api/auth/register', payload })).statusCode).toBe(201);
    expect((await ctx.api.inject({ method: 'POST', url: '/api/auth/register', payload })).statusCode).toBe(409);
    expect((await ctx.api.inject({ method: 'POST', url: '/api/auth/login', payload: { username: 'test_user', password: 'incorrect' } })).statusCode).toBe(401);
  });
  it('returns a conflict for simultaneous registration of the same username', async () => {
    const payload = { username: 'same_user', password: 'secret123', password_confirmation: 'secret123' };
    const results = await Promise.all([1, 2].map(() => ctx.api.inject({ method: 'POST', url: '/api/auth/register', payload })));
    expect(results.map(r => r.statusCode).sort()).toEqual([201, 409]);
  });
});
