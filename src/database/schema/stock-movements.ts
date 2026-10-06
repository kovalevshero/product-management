import { pgTable, pgEnum, serial, integer, varchar, timestamp, uuid, check, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { productVariants } from './product-variants.js';
import { users } from './users.js';
import { reservations } from './reservations.js';
export const movementKind = pgEnum('movement_kind', ['IN', 'OUT', 'ADJUSTMENT']);
export const stockMovements = pgTable('stock_movements', {
  id: serial('id').primaryKey(),
  variantId: integer('variant_id').notNull().references(() => productVariants.id),
  kind: movementKind('kind').notNull(),
  delta: integer('delta').notNull(),
  reason: varchar('reason', { length: 255 }).notNull(),
  actorId: integer('actor_id').notNull().references(() => users.id),
  reservationId: uuid('reservation_id').references(() => reservations.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, t => [check('movement_delta_check', sql`${t.delta} BETWEEN -1000000 AND 1000000 AND ${t.delta} <> 0 AND (${t.kind} <> 'IN' OR ${t.delta} > 0) AND (${t.kind} <> 'OUT' OR ${t.delta} < 0)`),
  index('movement_variant_created_idx').on(t.variantId, t.createdAt, t.id),
  uniqueIndex('movement_reservation_out_unique').on(t.reservationId).where(sql`${t.reservationId} IS NOT NULL AND ${t.kind} = 'OUT'`),
  check('movement_reservation_kind_check', sql`${t.reservationId} IS NULL OR ${t.kind} = 'OUT'`)]);
