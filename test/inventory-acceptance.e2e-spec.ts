import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { sql } from 'drizzle-orm';
import { createTestContext, type TestContext } from './helpers/test-context.js';
import { seedActor, bearer, demoProduct } from './helpers/domain-fixtures.js';
describe('Inventory MVP acceptance and demo seed', () => {
  let ctx: TestContext;
  beforeAll(async () => { ctx = await createTestContext(); });
  beforeEach(async () => { await ctx.reset(); });
  afterAll(async () => { await ctx?.close(); });
  it('runs the admin/staff/viewer catalog-to-stock-to-archive flow', async () => {
    const admin = await seedActor(ctx, 'admin'), staff = await seedActor(ctx, 'staff'), viewer = await seedActor(ctx, 'viewer');
    const p = (await ctx.api.inject({ method: 'POST', url: '/api/products', headers: bearer(admin), payload: demoProduct })).json();
    const variants = [];
    for (const sku of ['DEMO-BLACK-M', 'DEMO-WHITE-L']) {
      const r = await ctx.api.inject({ method: 'POST', url: `/api/products/${p.id}/variants`, headers: bearer(admin), payload: { sku, label: sku, price: '99.99' } });
      expect(r.statusCode).toBe(201); variants.push(r.json());
    }
    const move = (actor: { token: string }, delta: number) => ctx.api.inject({ method: 'POST', url: '/api/inventory/movements', headers: bearer(actor), payload: { variant_id: variants[0].id, kind: delta > 0 ? 'IN' : 'OUT', delta, reason: 'Synthetic acceptance' } });
    expect((await move(staff, 10)).statusCode).toBe(201);
    expect((await move(staff, -3)).statusCode).toBe(201);
    const balance = (await ctx.api.inject({ url: '/api/inventory?sku=BLACK', headers: bearer(viewer) })).json().data[0];
    expect(balance.available).toBe(7);
    expect((await move(viewer, 1)).statusCode).toBe(403);
    const publicProduct = (await ctx.api.inject(`/api/products/${p.id}`)).json();
    for (const key of ['on_hand', 'reserved', 'role', 'audit']) expect(publicProduct).not.toHaveProperty(key);
    expect((await ctx.api.inject({ url: '/api/audit-logs', headers: bearer(admin) })).json().data).toHaveLength(5);
    expect((await move(staff, -7)).statusCode).toBe(201);
    expect((await ctx.api.inject({ method: 'DELETE', url: `/api/products/${p.id}`, headers: bearer(admin) })).statusCode).toBe(200);
    expect((await ctx.api.inject(`/api/products/${p.id}`)).statusCode).toBe(404);
  });
  it('seeds synthetic demo data once and refuses other database names or production', async () => {
    const url = process.env.TEST_DATABASE_URL || 'postgresql://postgres:test@localhost:5433/product_management_test';
    const run = (databaseUrl = url, environment = 'test') => promisify(execFile)(process.execPath, ['dist/database/seed-demo.js'], { env: { ...process.env, NODE_ENV: environment, DATABASE_URL: databaseUrl } });
    await run(); await run();
    expect(await ctx.db.execute(sql`SELECT * FROM users`)).toHaveLength(3);
    expect(await ctx.db.execute(sql`SELECT * FROM product_variants`)).toHaveLength(2);
    expect(await ctx.db.execute(sql`SELECT * FROM stock_movements`)).toHaveLength(2);
    expect((await ctx.db.execute(sql`SELECT sum(delta)::int AS total FROM stock_movements`))[0].total).toBe(20);
    await expect(run(url.replace('product_management_test', 'product_management'))).rejects.toThrow();
    await expect(run(url, 'production')).rejects.toThrow();
    await expect(run(`${url}?database=product_management_demo`)).rejects.toThrow();
    expect(await ctx.db.execute(sql`SELECT * FROM stock_movements`)).toHaveLength(2);
  });
});
