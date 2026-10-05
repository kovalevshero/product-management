import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { createTestContext, type TestContext } from './helpers/test-context.js';
import { seedActor, seedProduct, seedVariant, bearer } from './helpers/domain-fixtures.js';
describe('Inventory API', () => {
  let ctx: TestContext;
  beforeAll(async () => { ctx = await createTestContext(); });
  beforeEach(async () => { await ctx.reset(); });
  afterAll(async () => { await ctx?.close(); });
  it('maintains balances equal to the ledger and allows viewer reads only', async () => {
    const staff = await seedActor(ctx, 'staff'), viewer = await seedActor(ctx, 'viewer');
    const p = await seedProduct(ctx, staff.id), v = await seedVariant(ctx, p.id);
    let balance: any;
    for (const [kind, delta] of [['IN', 10], ['OUT', -3], ['ADJUSTMENT', -2]]) {
      const r = await ctx.api.inject({ method: 'POST', url: '/api/inventory/movements', headers: bearer(staff), payload: { variant_id: v.id, kind, delta, reason: 'Synthetic demo' } });
      expect(r.statusCode).toBe(201); balance = r.json().balance;
    }
    expect(balance).toMatchObject({ on_hand: 5, reserved: 0, available: 5 });
    const ledger = (await ctx.api.inject({ url: `/api/inventory/variants/${v.id}/movements`, headers: bearer(viewer) })).json().data;
    expect(ledger.reduce((sum: number, m: any) => sum + m.delta, 0)).toBe(balance.on_hand);
    expect((await ctx.api.inject({ url: '/api/inventory?sku=BLACK', headers: bearer(viewer) })).json().data[0]).toMatchObject(balance);
    expect((await ctx.api.inject({ method: 'POST', url: '/api/inventory/movements', headers: bearer(viewer), payload: { variant_id: v.id, kind: 'IN', delta: 1, reason: 'Demo' } })).statusCode).toBe(403);
  });
  it('rejects invalid delta directions and overdraws', async () => {
    const staff = await seedActor(ctx, 'staff'), p = await seedProduct(ctx, staff.id), v = await seedVariant(ctx, p.id);
    const post = (body: unknown) => ctx.api.inject({ method: 'POST', url: '/api/inventory/movements', headers: bearer(staff), payload: body });
    const valid = { variant_id: v.id, kind: 'IN', delta: 1, reason: 'Demo' };
    for (const invalid of [{ delta: 0 }, { delta: 1.1 }, { delta: -1 }, { delta: 1000001 }, { kind: 'OUT', delta: 1 }, { reason: '' }, { reason: ' ' }, { reason: 'x'.repeat(256) }]) {
      expect((await post({ ...valid, ...invalid })).statusCode).toBe(400);
    }
    expect((await post({ ...valid, kind: 'OUT', delta: -1 })).statusCode).toBe(409);
    expect((await post({ ...valid, variant_id: 999 })).statusCode).toBe(404);
    expect((await ctx.api.inject({ url: '/api/inventory?limit=101', headers: bearer(staff) })).statusCode).toBe(400);
  });
});
