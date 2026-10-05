import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { createTestContext, type TestContext } from './helpers/test-context.js';
import { seedActor, bearer, demoProduct } from './helpers/domain-fixtures.js';
import { users } from '../src/database/schema/index.js';

describe('Role management and first admin', () => {
  let ctx: TestContext;
  beforeAll(async () => { ctx = await createTestContext(); });
  beforeEach(async () => { await ctx.reset(); });
  afterAll(async () => { await ctx?.close(); });
  const setRole = (actor: { token: string }, id: number, role: string) => ctx.api.inject({ method: 'PATCH', url: `/api/users/${id}/role`, headers: bearer(actor), payload: { role } });
  it('reads role changes on an existing access token and protects the last admin', async () => {
    const admin = await seedActor(ctx, 'admin');
    const viewer = await seedActor(ctx, 'viewer');
    expect((await setRole(admin, viewer.id, 'staff')).statusCode).toBe(200);
    expect((await ctx.api.inject({ method: 'POST', url: '/api/products', headers: bearer(viewer), payload: demoProduct })).statusCode).toBe(201);
    expect((await setRole(admin, admin.id, 'viewer')).statusCode).toBe(409);
  });
  it('serializes simultaneous admin demotions', async () => {
    const a = await seedActor(ctx, 'admin'), b = await seedActor(ctx, 'admin');
    const responses = await Promise.all([setRole(a, b.id, 'viewer'), setRole(b, a.id, 'viewer')]);
    expect(responses.map(r => r.statusCode).sort()).toEqual([200, 409]);
    expect((await ctx.db.select().from(users)).filter(u => (u as any).role === 'admin')).toHaveLength(1);
  });
  it('bootstraps once without replacing an existing credential', async () => {
    const run = () => promisify(execFile)(process.execPath, ['dist/database/bootstrap-admin.js'], { env: { ...process.env,
      DATABASE_URL: process.env.TEST_DATABASE_URL || 'postgresql://postgres:test@localhost:5433/product_management_test',
      BOOTSTRAP_ADMIN_USERNAME: 'demo_first_admin', BOOTSTRAP_ADMIN_PASSWORD: 'demo-secret123' } });
    await run();
    const before = await ctx.db.select().from(users);
    expect(before[0]).toHaveProperty('role', 'admin');
    await expect(run()).rejects.toThrow();
    expect(await ctx.db.select().from(users)).toEqual(before);
  });
});
