import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { createTestContext, type TestContext } from './helpers/test-context.js';

describe('Health endpoints', () => {
  let ctx: TestContext;
  beforeAll(async () => { ctx = await createTestContext(); });
  afterAll(async () => { await ctx?.close(); });
  it('exposes live and database readiness without authentication', async () => {
    expect((await ctx.api.inject('/api/health/live')).statusCode).toBe(200);
    expect((await ctx.api.inject('/api/health/ready')).statusCode).toBe(200);
  });
});
