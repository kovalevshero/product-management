import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from './schema/index.js';
import * as path from 'path';

export const DRIZZLE_TOKEN = 'DRIZZLE_DATABASE';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  public client: postgres.Sql;
  public db: PostgresJsDatabase<typeof schema>;

  constructor() {
    const connectionString =
      process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/product_management';
    this.client = postgres(connectionString, { max: 10 });
    this.db = drizzle(this.client, { schema });
  }

  async onModuleInit() {
    this.logger.log('Connecting to PostgreSQL and checking migrations...');
    try {
      const migrationsFolder = path.resolve(process.cwd(), 'drizzle');
      await migrate(this.db, { migrationsFolder });
      this.logger.log('Database migrations completed successfully.');
    } catch (err: any) {
      this.logger.warn(`Migration check completed with notice: ${err?.message || err}`);
    }
  }

  async onModuleDestroy() {
    await this.client.end();
  }
}
