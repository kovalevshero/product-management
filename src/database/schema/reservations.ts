import { pgTable, pgEnum, uuid, integer, timestamp, check, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { productVariants } from './product-variants.js';
import { users } from './users.js';
export const reservationStatus = pgEnum('reservation_status', ['PENDING', 'CONFIRMED', 'CANCELLED']);
export const reservations = pgTable('reservations', {
  id: uuid('id').primaryKey().defaultRandom(),
  variantId: integer('variant_id').notNull().references(() => productVariants.id),
  quantity: integer('quantity').notNull(),
  status: reservationStatus('status').notNull().default('PENDING'),
  createdById: integer('created_by_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, t => [check('reservation_quantity_check', sql`${t.quantity} BETWEEN 1 AND 1000000`), index('reservation_variant_idx').on(t.variantId), index('reservation_status_idx').on(t.status, t.createdAt)]);
