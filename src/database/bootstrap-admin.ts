import 'dotenv/config';
import { pathToFileURL } from 'node:url';
import { hash } from 'argon2';
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users } from './schema/users.js';
import { assertSchemaReady } from './migrations.js';

export async function bootstrapAdmin(username: string, password: string): Promise<void> {
  if (!username || username.length > 50 || !/^[a-zA-Z0-9_]+$/.test(username) || !password || password.length < 8 || password.length > 128) {
    throw new Error('Explicit valid bootstrap credentials are required');
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');
  await assertSchemaReady(url);
  const passwordHash = await hash(password);
  const client = postgres(url, { max: 1, connect_timeout: 3 });
  try {
    await drizzle(client).transaction(async tx => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(730105)`);
      if ((await tx.select({ id: users.id }).from(users).where(eq(users.role, 'admin'))).length) throw new Error('An admin already exists');
      await tx.insert(users).values({ username, password: passwordHash, fullName: username, role: 'admin' });
    });
  } finally { await client.end(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  bootstrapAdmin(process.env.BOOTSTRAP_ADMIN_USERNAME!, process.env.BOOTSTRAP_ADMIN_PASSWORD!)
    .then(() => console.log('First admin created'))
    .catch(() => { console.error('Admin bootstrap failed; verify credentials, schema and existing admins'); process.exitCode = 1; });
}
