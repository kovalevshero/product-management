import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { createTestContext, type TestContext } from './helpers/test-context.js';
import { seedActor, bearer, demoProduct } from './helpers/domain-fixtures.js';
import { users } from '../src/database/schema/index.js';

describe('Store authorization', () => {
  let ctx: TestContext;
  beforeAll(async () => { ctx = await createTestContext(); });
  beforeEach(async () => { await ctx.reset(); });
  afterAll(async () => { await ctx?.close(); });
  it('makes public signups read-only instead of granting catalog mutation access', async () => {
    const user = { username: 'viewer_user', password: 'secret123' };
    await ctx.api.inject({ method: 'POST', url: '/api/auth/register', payload: { ...user, password_confirmation: user.password } });
    const tokens = (await ctx.api.inject({ method: 'POST', url: '/api/auth/login', payload: user })).json();
    const r = await ctx.api.inject({ method: 'POST', url: '/api/products', headers: { authorization: `Bearer ${tokens.authentication_token}` },
      payload: { title: 'Demo shirt', price: 99.99, category: 'Clothes', images: ['https://example.com/shirt.jpg'] } });
    expect(r.statusCode).toBe(403);
    expect((await ctx.db.select().from(users))[0]).toHaveProperty('role', 'viewer');
  });
  it('rejects signup role injection and permits only staff/admin catalog writes', async () => {
    const signup = await ctx.api.inject({ method: 'POST', url: '/api/auth/register', payload: {
      username: 'demo_signup', password: 'secret123', password_confirmation: 'secret123', role: 'admin' } });
    expect(signup.statusCode).toBe(400);
    const staff = await seedActor(ctx, 'staff');
    const created = await ctx.api.inject({ method: 'POST', url: '/api/products', headers: bearer(staff), payload: demoProduct });
    expect(created.statusCode).toBe(201);
    const id = created.json().id;
    expect((await ctx.api.inject({ method: 'PUT', url: `/api/products/${id}`, headers: bearer(staff), payload: { title: 'Updated demo' } })).statusCode).toBe(200);
    expect((await ctx.api.inject({ method: 'DELETE', url: `/api/products/${id}`, headers: bearer(staff) })).statusCode).toBe(403);
    expect((await ctx.api.inject(`/api/products/${id}`)).statusCode).toBe(200);
    expect((await ctx.api.inject({ method: 'PATCH', url: `/api/users/${staff.id}/role`, headers: bearer(staff), payload: { role: 'admin' } })).statusCode).toBe(403);
  });
});
