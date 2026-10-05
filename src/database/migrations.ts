import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { resolve } from 'node:path';

const migrationsFolder = resolve(process.cwd(), 'drizzle');

export async function runMigrations(databaseUrl: string): Promise<void> {
  const client = postgres(databaseUrl, { max: 1, connect_timeout: 3, onnotice: () => {} });
  try { await migrate(drizzle(client), { migrationsFolder }); }
  finally { await client.end({ timeout: 3 }); }
}

export async function assertSchemaReady(databaseUrl: string): Promise<void> {
  const expected = readMigrationFiles({ migrationsFolder });
  const client = postgres(databaseUrl, { max: 1, connect_timeout: 3 });
  try {
    const actual = await client<{ hash: string; created_at: string }[]>`SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at`;
    if (actual.length !== expected.length || expected.some((entry, index) => actual[index].hash !== entry.hash || Number(actual[index].created_at) !== entry.folderMillis)) {
      throw new Error('Database migrations do not match this application');
    }
  } finally { await client.end({ timeout: 3 }); }
}
