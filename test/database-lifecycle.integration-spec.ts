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
  it.each([1, 5])('upgrades after %i migrations while retaining the existing catalog and ledger', async (migrationCount) => {
    const admin = postgres(url, { onnotice: () => {} });
    const name = `upgrade_fixture_${process.pid}_${migrationCount}_test`;
    const fixture = new URL(url); fixture.pathname = `/${name}`;
    assertTestDatabaseUrl(fixture.href);
    const folder = await mkdtemp(join(tmpdir(), 'inventory-m1-migrations-'));
    const client = postgres(fixture.href, { onnotice: () => {} });
    await admin.unsafe(`CREATE DATABASE "${name}"`);
    try {
      await mkdir(join(folder, 'meta'));
      const journal = JSON.parse(await readFile('drizzle/meta/_journal.json', 'utf8'));
      journal.entries = journal.entries.slice(0, migrationCount);
      await writeFile(join(folder, 'meta', '_journal.json'), JSON.stringify(journal));
      for (const entry of journal.entries) await copyFile(`drizzle/${entry.tag}.sql`, join(folder, `${entry.tag}.sql`));
      await migrate(drizzle(client), { migrationsFolder: folder });
      await client`INSERT INTO users (username, password) VALUES ('demo_legacy', 'synthetic unused hash')`;
      await client`INSERT INTO products (title, price, category, images, created_by, created_by_id, updated_by, updated_by_id)
        VALUES ('Synthetic legacy product', 99.99, 'Demo', ARRAY[]::text[], 'Demo', '1', 'Demo', '1')`;
      if (migrationCount === 5) {
        await client`INSERT INTO product_variants (product_id, sku, label, price, on_hand) VALUES (1, 'DEMO-LEGACY-SKU', 'Demo legacy', 99.99, 3)`;
        await client`INSERT INTO stock_movements (variant_id, kind, delta, reason, actor_id) VALUES (1, 'IN', 3, 'Synthetic legacy stock', 1)`;
      }
      await runMigrations(fixture.href);
      await expect(assertSchemaReady(fixture.href)).resolves.toBeUndefined();
      expect((await client`SELECT title, price, archived_at FROM products`)[0]).toEqual({ title: 'Synthetic legacy product', price: '99.99', archived_at: null });
      expect((await client`SELECT role FROM users`)[0].role).toBe('viewer');
      expect(await client`SELECT * FROM product_variants`).toHaveLength(migrationCount === 5 ? 1 : 0);
      if (migrationCount === 5) {
        expect((await client`SELECT on_hand, reserved FROM product_variants`)[0]).toEqual({ on_hand: 3, reserved: 0 });
        expect((await client`SELECT delta, reservation_id FROM stock_movements`)[0]).toEqual({ delta: 3, reservation_id: null });
      }
    } finally {
      await client.end(); await admin.unsafe(`DROP DATABASE "${name}"`); await admin.end();
      if (!resolve(folder).startsWith(resolve(tmpdir()) + sep)) throw new Error('Unsafe temporary path');
      await rm(folder, { recursive: true });
    }
  });
});
