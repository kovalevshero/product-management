import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { sql } from 'drizzle-orm';
import { createTestContext, type TestContext } from './helpers/test-context.js';

describe('Input and error boundaries', () => {
  let ctx: TestContext;
  beforeAll(async () => { ctx = await createTestContext(); });
  beforeEach(async () => { await ctx.reset(); });
  afterAll(async () => { await ctx?.close(); });
  it('rejects pagination outside its database-safe limits', async () => {
    for (const query of ['limit=101', 'page=0', 'limit=-1', 'page=1.5', 'page=1e100', 'page=2147483648']) {
      expect((await ctx.api.inject(`/api/products?${query}`)).statusCode).toBe(400);
    }
    for (const id of ['2147483648', '0', '-1']) expect((await ctx.api.inject(`/api/products/${id}`)).statusCode).toBe(400);
  });
  it('does not expose internal database failures', async () => {
    await ctx.db.execute(sql`CREATE OR REPLACE FUNCTION reject_test_insert() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'internal_sensitive_marker'; END $$`);
    await ctx.db.execute(sql`CREATE TRIGGER reject_test_insert BEFORE INSERT ON users FOR EACH ROW EXECUTE FUNCTION reject_test_insert()`);
    try {
      const r = await ctx.api.inject({ method: 'POST', url: '/api/auth/register', payload: { username: 'error_user', password: 'secret123', password_confirmation: 'secret123' } });
      expect(r.statusCode).toBe(500);
      expect(r.json()).toEqual({ statusCode: 500, message: 'Internal server error', error: 'InternalServerError' });
    } finally {
      await ctx.db.execute(sql`DROP TRIGGER reject_test_insert ON users`);
      await ctx.db.execute(sql`DROP FUNCTION reject_test_insert()`);
    }
  });
});
