import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { eq, sql } from 'drizzle-orm';
import { createTestContext, type TestContext } from './helpers/test-context.js';
import { seedActor, seedProduct, seedVariant, bearer } from './helpers/domain-fixtures.js';
import { productVariants, products } from '../src/database/schema/index.js';
describe('Inventory transactions', () => {
  let ctx: TestContext;
  beforeAll(async () => { ctx = await createTestContext(); });
  beforeEach(async () => { await ctx.reset(); });
  afterAll(async () => { await ctx?.close(); });
  const move = (actor: { token: string }, id: number, delta: number, kind = delta > 0 ? 'IN' : 'OUT') => ctx.api.inject({ method: 'POST', url: '/api/inventory/movements', headers: bearer(actor), payload: { variant_id: id, delta, kind, reason: 'Synthetic demo' } });
  it('allows only one simultaneous OUT of the last unit', async () => {
    const staff = await seedActor(ctx, 'staff'), p = await seedProduct(ctx, staff.id), v = await seedVariant(ctx, p.id);
    expect((await move(staff, v.id, 1)).statusCode).toBe(201);
    const results = await Promise.all([move(staff, v.id, -1), move(staff, v.id, -1)]);
    expect(results.map(r => r.statusCode).sort()).toEqual([201, 409]);
    expect((await ctx.db.select().from(productVariants))[0].onHand).toBe(0);
    expect((await ctx.db.execute(sql`SELECT * FROM stock_movements WHERE kind = 'OUT'`))).toHaveLength(1);
  });
  it('rolls back counters when ledger or audit insertion fails', async () => {
    const staff = await seedActor(ctx, 'staff'), p = await seedProduct(ctx, staff.id), v = await seedVariant(ctx, p.id);
    for (const table of ['stock_movements', 'audit_logs']) {
      await ctx.db.execute(sql`CREATE OR REPLACE FUNCTION fail_demo_stock() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'demo insert failure'; END $$`);
      await ctx.db.execute(sql.raw(`CREATE TRIGGER fail_demo_stock BEFORE INSERT ON ${table} FOR EACH ROW EXECUTE FUNCTION fail_demo_stock()`));
      try {
        expect((await move(staff, v.id, 10)).statusCode).toBe(500);
        expect((await ctx.db.select().from(productVariants))[0].onHand).toBe(0);
        expect(await ctx.db.execute(sql`SELECT * FROM stock_movements`)).toHaveLength(0);
        expect(await ctx.db.execute(sql`SELECT * FROM audit_logs`)).toHaveLength(0);
      } finally { await ctx.db.execute(sql.raw(`DROP TRIGGER fail_demo_stock ON ${table}`)); await ctx.db.execute(sql`DROP FUNCTION fail_demo_stock()`); }
    }
  });
  it('rejects overflow and serializes archive against stock mutation', async () => {
    const admin = await seedActor(ctx, 'admin'), p = await seedProduct(ctx, admin.id), v = await seedVariant(ctx, p.id);
    await ctx.db.update(productVariants).set({ onHand: 2147483647 }).where(eq(productVariants.id, v.id));
    expect((await move(admin, v.id, 1)).statusCode).toBe(409);
    expect((await ctx.api.inject({ method: 'DELETE', url: `/api/products/${p.id}`, headers: bearer(admin) })).statusCode).toBe(409);
    await ctx.db.update(productVariants).set({ onHand: 0 }).where(eq(productVariants.id, v.id));
    const results = await Promise.all([move(admin, v.id, 1), ctx.api.inject({ method: 'DELETE', url: `/api/products/${p.id}`, headers: bearer(admin) })]);
    expect([[201, 409], [404, 200]]).toContainEqual(results.map(r => r.statusCode));
    const [product] = await ctx.db.select().from(products), [variant] = await ctx.db.select().from(productVariants);
    expect(product.archivedAt ? variant.onHand === 0 : variant.onHand === 1).toBe(true);
    if (product.archivedAt) expect((await move(admin, v.id, 1)).statusCode).toBe(404);
  });
});
