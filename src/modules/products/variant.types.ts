import type { productVariants } from '../../database/schema/product-variants.js';
type Variant = typeof productVariants.$inferSelect;
export interface VariantView { id: number; product_id: number; sku: string; label: string; price: string; created_at: Date; updated_at: Date }
export function variantView(r: Variant): VariantView {
  return { id: r.id, product_id: r.productId, sku: r.sku, label: r.label, price: r.price, created_at: r.createdAt, updated_at: r.updatedAt };
}
