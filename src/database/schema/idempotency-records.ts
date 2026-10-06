import { pgTable, integer, varchar, uuid, primaryKey } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { reservations } from './reservations.js';
export const idempotencyRecords = pgTable('idempotency_records', {
  actorId: integer('actor_id').notNull().references(() => users.id),
  operation: varchar('operation', { length: 40 }).notNull(),
  key: uuid('key').notNull(),
  requestHash: varchar('request_hash', { length: 64 }).notNull(),
  resourceId: uuid('resource_id').notNull().references(() => reservations.id),
}, t => [primaryKey({ columns: [t.actorId, t.operation, t.key] })]);
