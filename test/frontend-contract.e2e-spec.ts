import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { createTestContext, type TestContext } from './helpers/test-context.js';
import { seedActor, bearer } from './helpers/domain-fixtures.js';
import { users } from '../src/database/schema/index.js';

describe('Frontend identity and members contract', () => {
  let ctx: TestContext;
  beforeAll(async () => { ctx = await createTestContext(); });
  beforeEach(async () => { await ctx.reset(); });
  afterAll(async () => { await ctx?.close(); });
  it('returns safe current database identity for every role and requires authentication', async () => {
    expect((await ctx.api.inject('/api/auth/me')).statusCode).toBe(401);
    for (const role of ['viewer', 'staff', 'admin'] as const) {
      const actor = await seedActor(ctx, role);
      const r = await ctx.api.inject({ url: '/api/auth/me', headers: bearer(actor) });
      expect(r.statusCode).toBe(200);
      expect(r.json()).toMatchObject({ id: actor.id, role });
      expect(Object.keys(r.json()).sort()).toEqual(['full_name', 'id', 'role', 'username']);
      expect(typeof r.json().full_name).toBe('string');
    }
  });
  it('shows changed roles on the same access token', async () => {
    const admin = await seedActor(ctx, 'admin'), viewer = await seedActor(ctx, 'viewer');
    expect((await ctx.api.inject({ method: 'PATCH', url: `/api/users/${viewer.id}/role`, headers: bearer(admin), payload: { role: 'staff' } })).statusCode).toBe(200);
    expect((await ctx.api.inject({ url: '/api/auth/me', headers: bearer(viewer) })).json().role).toBe('staff');
  });
  it('lists only safe member fields for admins with consistent filters and pagination', async () => {
    const admin = await seedActor(ctx, 'admin');
    await ctx.db.insert(users).values([{ username: 'demo_a_b', password: 'unused synthetic hash', role: 'viewer' },
      { username: 'demo_axb', password: 'unused synthetic hash', role: 'viewer' }]);
    expect((await ctx.api.inject('/api/users')).statusCode).toBe(401);
    const viewer = await seedActor(ctx, 'viewer'), staff = await seedActor(ctx, 'staff');
    for (const actor of [viewer, staff]) expect((await ctx.api.inject({ url: '/api/users', headers: bearer(actor) })).statusCode).toBe(403);
    const r = await ctx.api.inject({ url: '/api/users?role=viewer&search=demo_a&limit=1&page=2', headers: bearer(admin) });
    expect(r.statusCode).toBe(200);
    expect(r.json().meta).toMatchObject({ page: 2, limit: 1, total: 2, total_pages: 2 });
    expect(r.json().data).toHaveLength(1);
    const row = r.json().data[0];
    expect(row.username).toBe('demo_a_b');
    expect(Object.keys(row).sort()).toEqual(['created_at', 'full_name', 'id', 'role', 'username']);
    expect(row.created_at).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    expect(row.full_name).toBeNull();
  });
  it('treats search metacharacters literally and rejects invalid query inputs', async () => {
    const admin = await seedActor(ctx, 'admin');
    await ctx.db.insert(users).values([{ username: 'demo_a_b', password: 'unused synthetic hash' }, { username: 'demo_axb', password: 'unused synthetic hash' }]);
    const literal = await ctx.api.inject({ url: '/api/users?search=a_b', headers: bearer(admin) });
    expect(literal.statusCode).toBe(200);
    expect(literal.json().data.map((r: any) => r.username)).toEqual(['demo_a_b']);
    for (const search of ['%', '\\', 'not-found']) {
      expect((await ctx.api.inject({ url: `/api/users?search=${encodeURIComponent(search)}`, headers: bearer(admin) })).json().meta.total).toBe(0);
    }
    for (const query of ['role=root', 'limit=101', 'page=0', 'page=2147483648', `search=${'x'.repeat(51)}`]) {
      expect((await ctx.api.inject({ url: `/api/users?${query}`, headers: bearer(admin) })).statusCode).toBe(400);
    }
  });
});
