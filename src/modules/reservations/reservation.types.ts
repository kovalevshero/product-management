import type { reservations } from '../../database/schema/reservations.js';
export interface ReservationView { id: string; variant_id: number; quantity: number; status: 'PENDING' | 'CONFIRMED' | 'CANCELLED'; created_by_id: number; created_at: Date; updated_at: Date }
export function reservationView(r: typeof reservations.$inferSelect): ReservationView {
  return { id: r.id, variant_id: r.variantId, quantity: r.quantity, status: r.status, created_by_id: r.createdById, created_at: r.createdAt, updated_at: r.updatedAt };
}
