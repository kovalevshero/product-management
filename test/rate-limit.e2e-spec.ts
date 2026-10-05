import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { createTestContext, type TestContext } from './helpers/test-context.js';

describe('Actual authentication rate limit', () => {
  let ctx: TestContext;
  beforeAll(async () => { ctx = await createTestContext({ throttle: true }); await ctx.reset(); });
  afterAll(async () => { await ctx?.close(); });
  it('rejects the fourth register attempt within one minute', async () => {
    const codes = [];
    for (let i = 0; i < 4; i++) {
      codes.push((await ctx.api.inject({ method: 'POST', url: '/api/auth/register', payload: {
        username: `limited_${i}`, password: 'secret123', password_confirmation: 'secret123',
      } })).statusCode);
    }
    expect(codes).toEqual([201, 201, 201, 429]);
  });
});
