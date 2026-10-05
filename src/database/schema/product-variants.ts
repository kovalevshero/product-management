import { pgTable, serial, integer, varchar, numeric, timestamp, check, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { products } from './products.js';
export const productVariants = pgTable('product_variants', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id),
  sku: varchar('sku', { length: 80 }).notNull().unique(),
  label: varchar('label', { length: 100 }).notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  onHand: integer('on_hand').notNull().default(0),
  reserved: integer('reserved').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, t => [check('variant_balance_check', sql`${t.onHand} >= 0 AND ${t.reserved} >= 0 AND ${t.reserved} <= ${t.onHand}`),
  check('variant_price_check', sql`${t.price} > 0`), check('variant_sku_check', sql`${t.sku} ~ '^[A-Z0-9][A-Z0-9_-]{0,79}$'`), index('variant_product_idx').on(t.productId)]);
