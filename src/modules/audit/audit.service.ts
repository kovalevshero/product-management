import { Injectable } from '@nestjs/common';
import { and, desc, eq, count } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service.js';
import type { DbTransaction } from '../../database/database.types.js';
import { auditLogs } from '../../database/schema/audit-logs.js';
import { pagination } from '../../common/types/pagination.js';
import type { AuditEntry } from './audit.types.js';
import { QueryAuditDto } from './dto/query-audit.dto.js';
@Injectable()
export class AuditService {
  constructor(private readonly database: DatabaseService) {}
  async record(tx: DbTransaction, entry: AuditEntry): Promise<void> { await tx.insert(auditLogs).values(entry); }
  async findAll(query: QueryAuditDto) {
    const where = and(query.entity_type ? eq(auditLogs.entityType, query.entity_type) : undefined,
      query.entity_id ? eq(auditLogs.entityId, query.entity_id) : undefined);
    const [{ total }] = await this.database.db.select({ total: count() }).from(auditLogs).where(where);
    const rows = await this.database.db.select().from(auditLogs).where(where).orderBy(desc(auditLogs.id))
      .limit(query.limit).offset((query.page - 1) * query.limit);
    return { data: rows.map(r => ({ id: r.id, actor_id: r.actorId, action: r.action, entity_type: r.entityType,
      entity_id: r.entityId, before: r.before, after: r.after, created_at: r.createdAt })), meta: pagination(query.page, query.limit, total) };
  }
}
