import { describe, it, expect } from '@jest/globals';

describe('Test database isolation', () => {
  it('rejects development and deceptive URL names before destructive reset', async () => {
    const { assertTestDatabaseUrl } = await import('./helpers/test-context.js');
    for (const url of ['postgres://x:y@localhost/product_management', 'postgres://x:y@localhost/production?name=_test']) {
      expect(() => assertTestDatabaseUrl(url)).toThrow();
    }
    expect(() => assertTestDatabaseUrl('postgres://x:y@localhost/product_management_test')).not.toThrow();
  });
});
