import { describe, expect, it } from '@jest/globals';
import { runMigrations, assertSchemaReady } from '../src/database/migrations.js';
import postgres from 'postgres';
import { assertTestDatabaseUrl } from './helpers/test-context.js';

describe('Database lifecycle', () => {
  const url = process.env.TEST_DATABASE_URL || 'postgresql://postgres:test@localhost:5433/product_management_test';
  assertTestDatabaseUrl(url);
  it('can migrate repeatedly and verify the bundled migration hashes', async () => {
    await runMigrations(url);
    await runMigrations(url);
    await expect(assertSchemaReady(url)).resolves.toBeUndefined();
  });
  it('rejects unavailable databases instead of continuing startup', async () => {
    await expect(assertSchemaReady('postgresql://postgres:test@127.0.0.1:1/product_management_test')).rejects.toThrow();
  });
  it('requires migrations on a fresh database and rejects changed migration hashes', async () => {
    const admin = postgres(url, { onnotice: () => {} });
    const name = `migration_fixture_${process.pid}_test`;
    const fixture = new URL(url);
    fixture.pathname = `/${name}`;
    await admin.unsafe(`CREATE DATABASE "${name}"`);
    try {
      await expect(assertSchemaReady(fixture.href)).rejects.toThrow();
      await runMigrations(fixture.href);
      await expect(assertSchemaReady(fixture.href)).resolves.toBeUndefined();
      const client = postgres(fixture.href);
      try { await client`UPDATE drizzle.__drizzle_migrations SET hash = 'changed'`; }
      finally { await client.end(); }
      await expect(assertSchemaReady(fixture.href)).rejects.toThrow();
    } finally {
      await admin.unsafe(`DROP DATABASE "${name}"`);
      await admin.end();
    }
  });
});
