import 'dotenv/config';
import { runMigrations } from './migrations.js';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
runMigrations(process.env.DATABASE_URL).catch(() => {
  console.error('Database migration failed'); process.exitCode = 1;
});
