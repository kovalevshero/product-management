import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { createTestContext, type TestContext } from './helpers/test-context.js';
import { seedActor, seedProduct, bearer } from './helpers/domain-fixtures.js';
import { sql } from 'drizzle-orm';
describe('Variant integrity', () => {
  let ctx: TestContext;
  beforeAll(async () => { ctx = await createTestContext(); });
  beforeEach(async () => { await ctx.reset(); });
  afterAll(async () => { await ctx?.close(); });
  it('resolves simultaneous duplicate SKUs as a conflict and enforces database constraints', async () => {
    const admin = await seedActor(ctx, 'admin'), p = await seedProduct(ctx, admin.id);
    const results = await Promise.all(['demo-a', ' DEMO-A '].map(sku => ctx.api.inject({ method: 'POST', url: `/api/products/${p.id}/variants`, headers: bearer(admin), payload: { sku, label: 'Demo', price: '99.99' } })));
    expect(results.map(r => r.statusCode).sort()).toEqual([201, 409]);
    const id = results.find(r => r.statusCode === 201)!.json().id;
    for (const invalid of [sql`UPDATE product_variants SET on_hand = -1 WHERE id = ${id}`, sql`UPDATE product_variants SET reserved = 1 WHERE id = ${id}`,
      sql`UPDATE product_variants SET price = 0 WHERE id = ${id}`, sql`UPDATE product_variants SET product_id = 999 WHERE id = ${id}`]) {
      await expect(ctx.db.execute(invalid)).rejects.toThrow();
    }
    expect((await ctx.api.inject({ method: 'DELETE', url: `/api/products/${p.id}`, headers: bearer(admin) })).statusCode).toBe(200);
    expect((await ctx.api.inject({ url: `/api/products/${p.id}/variants`, headers: bearer(admin) })).statusCode).toBe(404);
  });
});
