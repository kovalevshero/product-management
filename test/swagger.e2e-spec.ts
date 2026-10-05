import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { createTestContext, type TestContext } from './helpers/test-context.js';

describe('Swagger compatibility', () => {
  let ctx: TestContext;
  beforeAll(async () => { ctx = await createTestContext(); });
  afterAll(async () => { await ctx?.close(); });
  it('serves the UI, its assets and the actual API schema', async () => {
    for (const path of ['/api/docs', '/api/docs/swagger-ui.css', '/api/docs/swagger-ui-bundle.js']) {
      expect((await ctx.api.inject(path)).statusCode).toBe(200);
    }
    const schema = await ctx.api.inject('/api/docs-json');
    expect(schema.statusCode).toBe(200);
    expect(schema.json().paths).toHaveProperty('/api/products');
    expect(schema.json().components.securitySchemes).toHaveProperty('access-token');
  });
});
