import type { LockedVariant } from './inventory-locks.js';
import type { stockMovements } from '../../database/schema/stock-movements.js';
export interface InventoryBalance { variant_id: number; sku: string; on_hand: number; reserved: number; available: number }
export function inventoryBalance(v: LockedVariant): InventoryBalance {
  return { variant_id: v.id, sku: v.sku, on_hand: v.onHand, reserved: v.reserved, available: v.onHand - v.reserved };
}
export function movementView(m: typeof stockMovements.$inferSelect) {
  return { id: m.id, variant_id: m.variantId, kind: m.kind, delta: m.delta, reason: m.reason, actor_id: m.actorId, created_at: m.createdAt };
}
export type MovementView = ReturnType<typeof movementView>;
