import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';
import { assertSchemaReady } from './migrations.js';

export const DRIZZLE_TOKEN = 'DRIZZLE_DATABASE';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  public client: postgres.Sql;
  public db: PostgresJsDatabase<typeof schema>;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL is required');
    this.client = postgres(connectionString, { max: 10, connect_timeout: 3 });
    this.db = drizzle(this.client, { schema });
  }

  async onModuleInit() {
    await assertSchemaReady(process.env.DATABASE_URL!);
    this.logger.log('Database schema is ready');
  }

  async onModuleDestroy() {
    await this.client.end();
  }
}
