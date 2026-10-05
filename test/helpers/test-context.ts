import { fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import type { DatabaseService } from '../../src/database/database.service.js';
import * as schema from '../../src/database/schema/index.js';
import { assertAllowedDatabaseUrl } from '../../src/database/protected-database.js';

export function assertTestDatabaseUrl(url: string): void {
  assertAllowedDatabaseUrl(url, name => name.endsWith('_test'));
}

type Request = { method?: string; url: string; payload?: unknown; headers?: Record<string, string> };
export interface TestContext {
  api: { inject(request: string | Request): Promise<{ statusCode: number; json(): any }> };
  db: DatabaseService['db'];
  reset(): Promise<void>;
  close(): Promise<void>;
}

export async function createTestContext(options: { throttle?: boolean } = {}): Promise<TestContext> {
  const url = process.env.TEST_DATABASE_URL || 'postgresql://postgres:test@localhost:5433/product_management_test';
  assertTestDatabaseUrl(url);
  const client = postgres(url, { max: 10 });
  const db = drizzle(client, { schema });
  const child = fork(fileURLToPath(new URL('./server.mjs', import.meta.url)), [], {
    execArgv: [], stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
    env: { ...process.env, NODE_ENV: 'test', DATABASE_URL: url, JWT_SECRET: 'a'.repeat(32),
      JWT_REFRESH_SECRET: 'b'.repeat(32), CORS_ORIGINS: '*', TEST_THROTTLE: String(Boolean(options.throttle)) },
  });
  child.stderr?.on('data', chunk => process.stderr.write(chunk));
  const port = await new Promise<number>((resolve, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(new Error('Test server startup timed out')); }, 20000);
    child.once('message', (m: any) => { clearTimeout(timer); m.ready ? resolve(m.port) : reject(new Error('Test server startup failed')); });
    child.once('exit', () => { clearTimeout(timer); reject(new Error('Test server exited before ready')); });
  }).catch(async error => { await client.end(); throw error; });
  let sequence = 0;
  async function rpc(action: string) {
    const id = ++sequence;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => { child.off('message', handler); reject(new Error('Test server IPC timeout')); }, 10000);
      function handler(m: any) {
        if (m.id !== id) return;
        clearTimeout(timer); child.off('message', handler);
        m.ok ? resolve() : reject(new Error('Test server IPC failed'));
      }
      child.on('message', handler); child.send({ id, action });
    });
  }
  return { db, api: {
    async inject(request) {
      const input = typeof request === 'string' ? { url: request } : request;
      const r = await fetch(`http://127.0.0.1:${port}${input.url}`, {
        method: input.method || 'GET', headers: { ...(input.payload === undefined ? {} : { 'content-type': 'application/json' }), ...input.headers },
        body: input.payload === undefined ? undefined : JSON.stringify(input.payload),
      });
      const body = await r.text();
      return { statusCode: r.status, json: () => JSON.parse(body) };
    },
  }, async reset() {
    assertTestDatabaseUrl(url);
    const target = await db.execute(sql`SELECT current_database() AS name`);
    if (target[0].name !== decodeURIComponent(new URL(url).pathname.slice(1))) throw new Error('Unsafe connected test database');
    const tables = await db.execute(sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`);
    if (tables.length) {
      const names = tables.map(t => '"' + String(t.tablename).replace(/"/g, '""') + '"').join(', ');
      await db.execute(sql.raw(`TRUNCATE ${names} RESTART IDENTITY CASCADE`));
    }
    await rpc('reset');
  }, async close() { try { await rpc('close'); } finally { child.kill(); await client.end(); } } };
}
