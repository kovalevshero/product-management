import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { createTestContext, type TestContext } from './helpers/test-context.js';
import { bearer, seedActor } from './helpers/domain-fixtures.js';
import { reservationStock } from './helpers/reservation-fixtures.js';
describe('Reservation terminal transitions', () => {
  let ctx: TestContext;
  beforeAll(async () => { ctx = await createTestContext(); });
  beforeEach(async () => { await ctx.reset(); });
  afterAll(async () => { await ctx?.close(); });
  async function pending() {
    const f = await reservationStock(ctx), key = randomUUID();
    const response = await ctx.api.inject({ method: 'POST', url: '/api/reservations', headers: { ...bearer(f.actor), 'idempotency-key': key }, payload: { variant_id: f.variant.id, quantity: 1 } });
    expect(response.statusCode).toBe(201);
    return { ...f, key, reservation: response.json() };
  }
  const transition = (actor: { token: string }, id: string, action: string, payload?: unknown) => ctx.api.inject({ method: 'POST', url: `/api/reservations/${id}/${action}`, headers: bearer(actor), payload });
  it('confirms once, replays current state, and prohibits the opposite terminal transition', async () => {
    const f = await pending();
    expect((await transition(f.actor, f.reservation.id.toUpperCase(), 'confirm')).json().status).toBe('CONFIRMED');
    expect((await transition(f.actor, f.reservation.id, 'confirm')).statusCode).toBe(200);
    expect((await transition(f.actor, f.reservation.id, 'cancel')).statusCode).toBe(409);
    expect((await ctx.db.execute(sql`SELECT on_hand, reserved FROM product_variants`))[0]).toEqual({ on_hand: 0, reserved: 0 });
    const outs = await ctx.db.execute(sql`SELECT * FROM stock_movements WHERE reservation_id = ${f.reservation.id}`);
    expect(outs).toHaveLength(1); expect(outs[0].delta).toBe(-1);
    expect(await ctx.db.execute(sql`SELECT * FROM audit_logs WHERE action = 'reservation.confirm' AND entity_id = ${f.reservation.id}`)).toHaveLength(1);
    const replay = await ctx.api.inject({ method: 'POST', url: '/api/reservations', headers: { ...bearer(f.actor), 'idempotency-key': f.key.toUpperCase() }, payload: { variant_id: f.variant.id, quantity: 1 } });
    expect(replay.statusCode).toBe(201); expect(replay.json()).toMatchObject({ id: f.reservation.id, status: 'CONFIRMED' });
    expect((await ctx.api.inject({ method: 'DELETE', url: `/api/products/${f.product.id}`, headers: bearer(f.actor) })).statusCode).toBe(200);
    expect((await transition(f.actor, f.reservation.id, 'confirm')).statusCode).toBe(200);
    expect((await transition(f.actor, f.reservation.id, 'cancel')).statusCode).toBe(409);
    await expect(ctx.db.execute(sql`INSERT INTO stock_movements (variant_id, kind, delta, reason, actor_id, reservation_id) VALUES (${f.variant.id}, 'OUT', -1, 'Duplicate synthetic OUT', ${f.actor.id}, ${f.reservation.id})`)).rejects.toThrow();
  });
  it('cancels once, releases reserved only and blocks unauthorized/invalid transition inputs', async () => {
    const f = await pending(), viewer = await seedActor(ctx, 'viewer');
    expect((await transition(viewer, f.reservation.id, 'cancel')).statusCode).toBe(403);
    expect((await transition(f.actor, 'invalid', 'cancel')).statusCode).toBe(400);
    expect((await transition(f.actor, randomUUID(), 'cancel')).statusCode).toBe(404);
    expect((await transition(f.actor, f.reservation.id, 'cancel', { quantity: 10 })).statusCode).toBe(400);
    expect((await transition(f.actor, f.reservation.id, 'cancel')).json().status).toBe('CANCELLED');
    expect((await transition(f.actor, f.reservation.id, 'cancel')).statusCode).toBe(200);
    expect((await transition(f.actor, f.reservation.id, 'confirm')).statusCode).toBe(409);
    expect((await ctx.db.execute(sql`SELECT on_hand, reserved FROM product_variants`))[0]).toEqual({ on_hand: 1, reserved: 0 });
    expect(await ctx.db.execute(sql`SELECT * FROM stock_movements WHERE kind = 'OUT'`)).toHaveLength(0);
    expect(await ctx.db.execute(sql`SELECT * FROM audit_logs WHERE action = 'reservation.cancel'`)).toHaveLength(1);
  });
  it('serializes confirm-confirm, cancel-cancel and confirm-cancel races', async () => {
    for (const actions of [['confirm', 'confirm'], ['cancel', 'cancel'], ['confirm', 'cancel']]) {
      await ctx.reset();
      const f = await pending();
      const results = await Promise.all(actions.map(action => transition(f.actor, f.reservation.id, action)));
      expect(results.map(r => r.statusCode).sort()).toEqual(actions[0] === actions[1] ? [200, 200] : [200, 409]);
      const [r] = await ctx.db.execute(sql`SELECT status FROM reservations`), [v] = await ctx.db.execute(sql`SELECT on_hand, reserved FROM product_variants`);
      expect(v.reserved).toBe(0); expect(v.on_hand).toBe(r.status === 'CONFIRMED' ? 0 : 1);
      expect(await ctx.db.execute(sql`SELECT * FROM stock_movements WHERE kind = 'OUT'`)).toHaveLength(r.status === 'CONFIRMED' ? 1 : 0);
    }
  });
  it('blocks manual OUT and archive while stock is reserved', async () => {
    const f = await pending();
    const out = await ctx.api.inject({ method: 'POST', url: '/api/inventory/movements', headers: bearer(f.actor), payload: { variant_id: f.variant.id, kind: 'OUT', delta: -1, reason: 'Synthetic blocked OUT' } });
    expect(out.statusCode).toBe(409);
    expect((await ctx.api.inject({ method: 'DELETE', url: `/api/products/${f.product.id}`, headers: bearer(f.actor) })).statusCode).toBe(409);
  });
  it('rolls back status and both counters when ledger or terminal audit insertion fails', async () => {
    for (const [table, condition, action] of [['stock_movements', 'true', 'confirm'], ['audit_logs', "NEW.action = 'reservation.confirm'", 'confirm'], ['audit_logs', "NEW.action = 'reservation.cancel'", 'cancel']]) {
      await ctx.reset(); const f = await pending();
      await ctx.db.execute(sql.raw(`CREATE OR REPLACE FUNCTION fail_reservation_terminal() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF ${condition} THEN RAISE EXCEPTION 'synthetic transition failure'; END IF; RETURN NEW; END $$`));
      await ctx.db.execute(sql.raw(`CREATE TRIGGER fail_reservation_terminal BEFORE INSERT ON ${table} FOR EACH ROW EXECUTE FUNCTION fail_reservation_terminal()`));
      try {
        expect((await transition(f.actor, f.reservation.id, action)).statusCode).toBe(500);
        expect((await ctx.db.execute(sql`SELECT status FROM reservations`))[0].status).toBe('PENDING');
        expect((await ctx.db.execute(sql`SELECT on_hand, reserved FROM product_variants`))[0]).toEqual({ on_hand: 1, reserved: 1 });
        expect(await ctx.db.execute(sql`SELECT * FROM stock_movements WHERE kind = 'OUT'`)).toHaveLength(0);
        expect(await ctx.db.execute(sql`SELECT * FROM audit_logs WHERE action IN ('reservation.confirm', 'reservation.cancel')`)).toHaveLength(0);
      } finally { await ctx.db.execute(sql.raw(`DROP TRIGGER fail_reservation_terminal ON ${table}`)); await ctx.db.execute(sql`DROP FUNCTION fail_reservation_terminal()`); }
      expect((await transition(f.actor, f.reservation.id, action)).statusCode).toBe(200);
    }
  });
});
