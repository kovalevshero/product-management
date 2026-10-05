import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { eq, sql } from 'drizzle-orm';
import { createTestContext, type TestContext } from './helpers/test-context.js';
import { seedActor, bearer, demoProduct } from './helpers/domain-fixtures.js';
import { products } from '../src/database/schema/index.js';

describe('Atomic audit and product archive', () => {
  let ctx: TestContext;
  beforeAll(async () => { ctx = await createTestContext(); });
  beforeEach(async () => { await ctx.reset(); });
  afterAll(async () => { await ctx?.close(); });
  it('restricts audit reads and records successful catalog and role changes once', async () => {
    const admin = await seedActor(ctx, 'admin'), staff = await seedActor(ctx, 'staff');
    expect((await ctx.api.inject({ url: '/api/audit-logs', headers: bearer(staff) })).statusCode).toBe(403);
    const create = await ctx.api.inject({ method: 'POST', url: '/api/products', headers: bearer(admin), payload: demoProduct });
    expect(create.statusCode).toBe(201);
    const id = create.json().id;
    expect((await ctx.api.inject({ method: 'PUT', url: `/api/products/${id}`, headers: bearer(admin), payload: { title: 'Changed demo' } })).statusCode).toBe(200);
    expect((await ctx.api.inject({ method: 'DELETE', url: `/api/products/${id}`, headers: bearer(admin) })).statusCode).toBe(200);
    expect((await ctx.api.inject({ method: 'DELETE', url: `/api/products/${id}`, headers: bearer(admin) })).statusCode).toBe(404);
    expect((await ctx.api.inject(`/api/products/${id}`)).statusCode).toBe(404);
    expect((await ctx.api.inject('/api/products')).json().meta.total).toBe(0);
    expect((await ctx.api.inject({ method: 'PATCH', url: `/api/users/${staff.id}/role`, headers: bearer(admin), payload: { role: 'viewer' } })).statusCode).toBe(200);
    const logs = (await ctx.api.inject({ url: '/api/audit-logs', headers: bearer(admin) })).json().data;
    expect(logs).toHaveLength(4);
    expect(logs.map((l: any) => l.action).sort()).toEqual(['product.archive', 'product.create', 'product.update', 'user.role_change']);
    const roleLog = logs.find((l: any) => l.entity_type === 'user');
    expect(roleLog.before).toEqual({ id: staff.id, role: 'staff' });
    expect(roleLog.after).toEqual({ id: staff.id, role: 'viewer' });
    expect(JSON.stringify(logs)).not.toMatch(/password|refreshToken|authentication_token/);
  });
  it('rolls back catalog state and does not invalidate cached reads when audit insert fails', async () => {
    const admin = await seedActor(ctx, 'admin');
    const product = (await ctx.api.inject({ method: 'POST', url: '/api/products', headers: bearer(admin), payload: demoProduct })).json();
    await ctx.api.inject(`/api/products/${product.id}`);
    await ctx.db.execute(sql`DROP FUNCTION IF EXISTS fail_demo_audit()`);
    await ctx.db.execute(sql`CREATE FUNCTION fail_demo_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'demo audit failure'; END $$`);
    await ctx.db.execute(sql`CREATE TRIGGER fail_demo_audit BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION fail_demo_audit()`);
    try {
      const r = await ctx.api.inject({ method: 'PUT', url: `/api/products/${product.id}`, headers: bearer(admin), payload: { title: 'Should roll back' } });
      expect(r.statusCode).toBe(500);
      expect((await ctx.db.select().from(products).where(eq(products.id, product.id)))[0].title).toBe(demoProduct.title);
      expect((await ctx.api.inject(`/api/products/${product.id}`)).json().title).toBe(demoProduct.title);
      expect((await ctx.api.inject({ url: '/api/audit-logs', headers: bearer(admin) })).json().data).toHaveLength(1);
    } finally {
      await ctx.db.execute(sql`DROP TRIGGER fail_demo_audit ON audit_logs`);
      await ctx.db.execute(sql`DROP FUNCTION fail_demo_audit()`);
    }
  });
});
