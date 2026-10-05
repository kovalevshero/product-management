export interface AuditEntry {
  actorId: number; action: string;
  entityType: 'product' | 'variant' | 'stock_movement' | 'reservation' | 'user';
  entityId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}
