import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { createTestContext, type TestContext } from './helpers/test-context.js';
import { seedActor, bearer } from './helpers/domain-fixtures.js';
import { reservationStock } from './helpers/reservation-fixtures.js';
describe('Reservation creation and idempotency', () => {
  let ctx: TestContext;
  beforeAll(async () => { ctx = await createTestContext(); });
  beforeEach(async () => { await ctx.reset(); });
  afterAll(async () => { await ctx?.close(); });
  const create = (actor: { token: string }, id: number, key: string | undefined, quantity = 1) => ctx.api.inject({ method: 'POST', url: '/api/reservations', headers: { ...bearer(actor), ...(key ? { 'idempotency-key': key } : {}) }, payload: { variant_id: id, quantity } });
  it('requires UUID keys, valid quantities, staff authority and available active stock', async () => {
    const { actor, product, variant } = await reservationStock(ctx);
    for (const key of [undefined, 'invalid']) expect((await create(actor, variant.id, key)).statusCode).toBe(400);
    for (const qty of [0, -1, 1.5, 1000001]) expect((await create(actor, variant.id, randomUUID(), qty)).statusCode).toBe(400);
    const viewer = await seedActor(ctx, 'viewer');
    expect((await create(viewer, variant.id, randomUUID())).statusCode).toBe(403);
    expect((await create(actor, variant.id, randomUUID(), 2)).statusCode).toBe(409);
    expect((await create(actor, 999, randomUUID())).statusCode).toBe(404);
    await ctx.api.inject({ method: 'POST', url: '/api/inventory/movements', headers: bearer(actor), payload: { variant_id: variant.id, kind: 'OUT', delta: -1, reason: 'Synthetic clear' } });
    await ctx.api.inject({ method: 'DELETE', url: `/api/products/${product.id}`, headers: bearer(actor) });
    expect((await create(actor, variant.id, randomUUID())).statusCode).toBe(404);
    expect(await ctx.db.execute(sql`SELECT * FROM idempotency_records`)).toHaveLength(0);
  });
  it('returns one resource for simultaneous identical retries and rejects different payloads', async () => {
    const { actor, variant } = await reservationStock(ctx, 2), key = randomUUID();
    const results = await Promise.all([create(actor, variant.id, key), create(actor, variant.id, key.toUpperCase())]);
    expect(results.map(r => r.statusCode)).toEqual([201, 201]);
    expect(results[0].json().id).toBe(results[1].json().id);
    expect((await create(actor, variant.id, key, 2)).statusCode).toBe(409);
    expect((await ctx.db.execute(sql`SELECT on_hand, reserved FROM product_variants`))[0]).toEqual({ on_hand: 2, reserved: 1 });
    expect(await ctx.db.execute(sql`SELECT * FROM reservations`)).toHaveLength(1);
    expect(await ctx.db.execute(sql`SELECT * FROM idempotency_records`)).toHaveLength(1);
    expect(await ctx.db.execute(sql`SELECT * FROM audit_logs WHERE entity_type = 'reservation'`)).toHaveLength(1);
  });
  it('scopes keys to actors and prevents two actors from reserving the last unit', async () => {
    const { actor, variant } = await reservationStock(ctx), staff = await seedActor(ctx, 'staff'), key = randomUUID();
    const r = await Promise.all([create(actor, variant.id, key), create(staff, variant.id, key)]);
    expect(r.map(r => r.statusCode).sort()).toEqual([201, 409]);
    const loser = r[0].statusCode === 409 ? actor : staff;
    await ctx.api.inject({ method: 'POST', url: '/api/inventory/movements', headers: bearer(actor), payload: { variant_id: variant.id, kind: 'IN', delta: 1, reason: 'Synthetic restock' } });
    const second = await create(loser, variant.id, key);
    expect(second.statusCode).toBe(201);
    expect(second.json().id).not.toBe(r.find(x => x.statusCode === 201)!.json().id);
    expect((await ctx.db.execute(sql`SELECT on_hand, reserved FROM product_variants`))[0]).toEqual({ on_hand: 2, reserved: 2 });
  });
  it('rolls back reserved, resource and idempotency when audit fails', async () => {
    const { actor, variant } = await reservationStock(ctx), key = randomUUID();
    await ctx.db.execute(sql`CREATE OR REPLACE FUNCTION fail_reservation_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic audit failure'; END $$`);
    await ctx.db.execute(sql`CREATE TRIGGER fail_reservation_audit BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION fail_reservation_audit()`);
    try {
      expect((await create(actor, variant.id, key)).statusCode).toBe(500);
      expect((await ctx.db.execute(sql`SELECT reserved FROM product_variants`))[0].reserved).toBe(0);
      expect(await ctx.db.execute(sql`SELECT * FROM reservations`)).toHaveLength(0);
      expect(await ctx.db.execute(sql`SELECT * FROM idempotency_records`)).toHaveLength(0);
    } finally { await ctx.db.execute(sql`DROP TRIGGER fail_reservation_audit ON audit_logs`); await ctx.db.execute(sql`DROP FUNCTION fail_reservation_audit()`); }
    expect((await create(actor, variant.id, key)).statusCode).toBe(201);
  });
});
