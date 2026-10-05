import { pgTable, serial, integer, varchar, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  actorId: integer('actor_id').notNull().references(() => users.id),
  action: varchar('action', { length: 80 }).notNull(),
  entityType: varchar('entity_type', { length: 40 }).notNull(),
  entityId: varchar('entity_id', { length: 80 }).notNull(),
  before: jsonb('before').$type<Record<string, unknown> | null>(),
  after: jsonb('after').$type<Record<string, unknown> | null>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, t => [index('audit_entity_idx').on(t.entityType, t.entityId, t.id)]);
export type AuditLog = typeof auditLogs.$inferSelect;
