import { describe, expect, it } from '@jest/globals';
import { assertTestDatabaseUrl } from './helpers/test-context.js';
describe('Protected database targets', () => {
  it('refuses connection query overrides before migration or reset can run', () => {
    for (const suffix of ['?database=product_management', '?user=another', '?database=product_management_test&database=production', '?sslmode=require']) {
      expect(() => assertTestDatabaseUrl(`postgresql://postgres:test@localhost:5433/product_management_test${suffix}`)).toThrow();
    }
  });
});
