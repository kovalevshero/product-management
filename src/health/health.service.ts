import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class HealthService {
  constructor(private readonly database: DatabaseService) {}
  async isDatabaseReady(): Promise<boolean> {
    try { await this.database.db.execute(sql`SELECT 1`); return true; }
    catch { return false; }
  }
}
