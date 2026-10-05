import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { createTestContext, type TestContext } from './helpers/test-context.js';

describe('Single-session token lifecycle', () => {
  let ctx: TestContext;
  const credentials = { username: 'session_user', password: 'secret123' };
  beforeAll(async () => { ctx = await createTestContext(); });
  beforeEach(async () => {
    await ctx.reset();
    await ctx.api.inject({ method: 'POST', url: '/api/auth/register', payload: { ...credentials, password_confirmation: credentials.password } });
  });
  afterAll(async () => { await ctx?.close(); });
  async function login() { return (await ctx.api.inject({ method: 'POST', url: '/api/auth/login', payload: credentials })).json(); }
  it('rotates tokens uniquely even in the same second and rejects old refresh tokens', async () => {
    const tokens = await login();
    const rotate = () => ctx.api.inject({ method: 'POST', url: '/api/auth/refresh', payload: { refresh_token: tokens.refresh_token } });
    const first = await rotate();
    expect(first.statusCode).toBe(200);
    expect(first.json().refresh_token).not.toBe(tokens.refresh_token);
    expect((await rotate()).statusCode).toBe(401);
  });
  it('allows only one of two simultaneous refresh attempts', async () => {
    const tokens = await login();
    const responses = await Promise.all([1, 2].map(() => ctx.api.inject({ method: 'POST', url: '/api/auth/refresh', payload: { refresh_token: tokens.refresh_token } })));
    expect(responses.map(r => r.statusCode).sort()).toEqual([200, 401]);
  });
  it('logs out without allowing the active refresh token to be reused', async () => {
    const tokens = await login();
    expect((await ctx.api.inject({ method: 'POST', url: '/api/auth/logout', headers: { authorization: `Bearer ${tokens.authentication_token}` } })).statusCode).toBe(204);
    expect((await ctx.api.inject({ method: 'POST', url: '/api/auth/refresh', payload: { refresh_token: tokens.refresh_token } })).statusCode).toBe(401);
  });
});
