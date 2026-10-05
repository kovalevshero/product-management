import { describe, expect, it } from '@jest/globals';
import { runMigrations, assertSchemaReady } from '../src/database/migrations.js';
import postgres from 'postgres';
import { assertTestDatabaseUrl } from './helpers/test-context.js';
import { mkdtemp, mkdir, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

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
  it('upgrades the M1 schema while retaining the catalog and backfilling viewers', async () => {
    const admin = postgres(url, { onnotice: () => {} });
    const name = `upgrade_fixture_${process.pid}_test`;
    const fixture = new URL(url); fixture.pathname = `/${name}`;
    assertTestDatabaseUrl(fixture.href);
    const folder = await mkdtemp(join(tmpdir(), 'inventory-m1-migrations-'));
    const client = postgres(fixture.href, { onnotice: () => {} });
    await admin.unsafe(`CREATE DATABASE "${name}"`);
    try {
      await mkdir(join(folder, 'meta'));
      const journal = JSON.parse(await readFile('drizzle/meta/_journal.json', 'utf8'));
      journal.entries = journal.entries.slice(0, 1);
      await writeFile(join(folder, 'meta', '_journal.json'), JSON.stringify(journal));
      await copyFile(`drizzle/${journal.entries[0].tag}.sql`, join(folder, `${journal.entries[0].tag}.sql`));
      await migrate(drizzle(client), { migrationsFolder: folder });
      await client`INSERT INTO users (username, password) VALUES ('demo_legacy', 'synthetic unused hash')`;
      await client`INSERT INTO products (title, price, category, images, created_by, created_by_id, updated_by, updated_by_id)
        VALUES ('Synthetic legacy product', 99.99, 'Demo', ARRAY[]::text[], 'Demo', '1', 'Demo', '1')`;
      await runMigrations(fixture.href);
      await expect(assertSchemaReady(fixture.href)).resolves.toBeUndefined();
      expect((await client`SELECT title, price, archived_at FROM products`)[0]).toEqual({ title: 'Synthetic legacy product', price: '99.99', archived_at: null });
      expect((await client`SELECT role FROM users`)[0].role).toBe('viewer');
      expect(await client`SELECT * FROM product_variants`).toHaveLength(0);
    } finally {
      await client.end(); await admin.unsafe(`DROP DATABASE "${name}"`); await admin.end();
      if (!resolve(folder).startsWith(resolve(tmpdir()) + sep)) throw new Error('Unsafe temporary path');
      await rm(folder, { recursive: true });
    }
  });
});
