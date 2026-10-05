import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { createTestContext, type TestContext } from './helpers/test-context.js';
import { seedActor, seedProduct, bearer } from './helpers/domain-fixtures.js';
import { sql } from 'drizzle-orm';
describe('Product variants', () => {
  let ctx: TestContext;
  beforeAll(async () => { ctx = await createTestContext(); });
  beforeEach(async () => { await ctx.reset(); });
  afterAll(async () => { await ctx?.close(); });
  it('normalizes SKU, keeps decimal strings and hides balance counters', async () => {
    const staff = await seedActor(ctx, 'staff'), viewer = await seedActor(ctx, 'viewer');
    const p = await seedProduct(ctx, staff.id);
    const r = await ctx.api.inject({ method: 'POST', url: `/api/products/${p.id}/variants`, headers: bearer(staff), payload: { sku: ' demo-black-m ', label: 'Black M', price: '99.99' } });
    expect(r.statusCode).toBe(201);
    expect(r.json()).toMatchObject({ sku: 'DEMO-BLACK-M', price: '99.99', product_id: p.id });
    expect(r.json()).not.toHaveProperty('on_hand');
    expect((await ctx.db.execute(sql`SELECT on_hand, reserved FROM product_variants`))[0]).toEqual({ on_hand: 0, reserved: 0 });
    expect((await ctx.api.inject({ url: `/api/products/${p.id}/variants`, headers: bearer(viewer) })).json().data).toHaveLength(1);
    expect((await ctx.api.inject({ method: 'PATCH', url: `/api/variants/${r.json().id}`, headers: bearer(staff), payload: { label: 'New label', price: '10.00' } })).json()).toMatchObject({ label: 'New label', price: '10.00' });
  });
  it('rejects invalid prices, labels, missing products and protected fields', async () => {
    const staff = await seedActor(ctx, 'staff'), viewer = await seedActor(ctx, 'viewer');
    const p = await seedProduct(ctx, staff.id);
    const create = (body: unknown, id = p.id, actor = staff) => ctx.api.inject({ method: 'POST', url: `/api/products/${id}/variants`, headers: bearer(actor), payload: body });
    const body = { sku: 'DEMO-1', label: 'Demo', price: '1.00' };
    for (const invalid of [{ price: '1.001' }, { price: '100000000.00' }, { price: '0.00' }, { price: 1 }, { label: '' }, { label: ' ' }, { label: 'x'.repeat(101) }, { sku: 'invalid space' }, { on_hand: 5 }]) {
      expect((await create({ ...body, ...invalid })).statusCode).toBe(400);
    }
    expect((await create(body, 999)).statusCode).toBe(404);
    expect((await create(body, p.id, viewer)).statusCode).toBe(403);
    const variant = (await create(body)).json();
    for (const invalid of [{ sku: 'CHANGED' }, { on_hand: 4 }, { reserved: 1 }, { price: null }, { label: null }]) {
      expect((await ctx.api.inject({ method: 'PATCH', url: `/api/variants/${variant.id}`, headers: bearer(staff), payload: invalid })).statusCode).toBe(400);
    }
  });
});
