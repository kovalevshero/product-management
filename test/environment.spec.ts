import { describe, expect, it } from '@jest/globals';
import { loadEnvironment } from '../src/config/environment.js';

const valid = { NODE_ENV: 'test', DATABASE_URL: 'postgresql://postgres:test@localhost/product_management_test',
  JWT_SECRET: 'a'.repeat(32), JWT_REFRESH_SECRET: 'b'.repeat(32), CORS_ORIGINS: '*' };

describe('Environment validation', () => {
  it('requires independent secrets and a valid database URL', () => {
    expect(() => loadEnvironment({})).toThrow();
    expect(() => loadEnvironment({ ...valid, JWT_SECRET: 'short' })).toThrow();
    expect(() => loadEnvironment({ ...valid, JWT_SECRET: valid.JWT_REFRESH_SECRET })).toThrow();
    expect(() => loadEnvironment({ ...valid, DATABASE_URL: 'https://localhost' })).toThrow();
    expect(() => loadEnvironment(valid)).not.toThrow();
  });
  it('requires an explicit production origin allowlist', () => {
    expect(() => loadEnvironment({ ...valid, NODE_ENV: 'production' })).toThrow();
    expect(loadEnvironment({ ...valid, NODE_ENV: 'production', CORS_ORIGINS: 'https://demo.example.com' }).corsOrigins)
      .toEqual(['https://demo.example.com']);
  });
});
