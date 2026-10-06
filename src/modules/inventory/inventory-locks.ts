import { NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { DbTransaction } from '../../database/database.types.js';
import { products, productVariants } from '../../database/schema/index.js';
export type LockedVariant = typeof productVariants.$inferSelect;
export async function lockActiveProduct(tx: DbTransaction, id: number, options: { allowArchived?: boolean } = {}) {
  const [p] = await tx.select().from(products).where(eq(products.id, id)).for('update');
  if (!p || (p.archivedAt && !options.allowArchived)) throw new NotFoundException('Product not found');
  return p;
}
export async function lockVariant(tx: DbTransaction, id: number, options: { allowArchived?: boolean } = {}): Promise<LockedVariant> {
  const [parent] = await tx.select({ productId: productVariants.productId }).from(productVariants).where(eq(productVariants.id, id));
  if (!parent) throw new NotFoundException('Variant not found');
  await lockActiveProduct(tx, parent.productId, options);
  const [variant] = await tx.select().from(productVariants).where(eq(productVariants.id, id)).for('update');
  if (!variant) throw new NotFoundException('Variant not found');
  return variant;
}
