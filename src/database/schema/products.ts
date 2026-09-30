import { pgTable, serial, varchar, numeric, text, timestamp } from 'drizzle-orm/pg-core';

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }).notNull(),
  images: text('images').array().notNull(),
  createdBy: varchar('created_by', { length: 100 }).notNull(),
  createdById: varchar('created_by_id', { length: 50 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedBy: varchar('updated_by', { length: 100 }).notNull(),
  updatedById: varchar('updated_by_id', { length: 50 }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
