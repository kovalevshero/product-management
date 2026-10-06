import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { DbTransaction } from '../../database/database.types.js';
@Injectable()
export class IdempotencyService {
  async lock(tx: DbTransaction, actorId: number, operation: 'reservation.create', key: string): Promise<void> {
    const scope = JSON.stringify([actorId, operation, key]);
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${scope}, 0))`);
  }
}
