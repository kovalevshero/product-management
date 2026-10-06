import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { and, count, desc, eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service.js';
import { reservations, idempotencyRecords, productVariants, products } from '../../database/schema/index.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { AuditService } from '../audit/audit.service.js';
import { lockVariant } from '../inventory/inventory-locks.js';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import { pagination } from '../../common/types/pagination.js';
import { IdempotencyService } from './idempotency.service.js';
import { CreateReservationDto } from './dto/create-reservation.dto.js';
import { QueryReservationDto } from './dto/query-reservation.dto.js';
import { reservationView } from './reservation.types.js';
@Injectable()
export class ReservationsService {
  constructor(private readonly database: DatabaseService, private readonly audit: AuditService, private readonly idempotency: IdempotencyService, private readonly inventory: InventoryService) {}
  async create(dto: CreateReservationDto, actor: AuthenticatedUser, inputKey: string) {
    const key = inputKey.toLowerCase(), operation = 'reservation.create' as const;
    const requestHash = createHash('sha256').update(JSON.stringify({ variant_id: dto.variant_id, quantity: dto.quantity })).digest('hex');
    return this.database.db.transaction(async tx => {
      await this.idempotency.lock(tx, actor.id, operation, key);
      const [record] = await tx.select().from(idempotencyRecords).where(and(eq(idempotencyRecords.actorId, actor.id), eq(idempotencyRecords.operation, operation), eq(idempotencyRecords.key, key)));
      if (record) {
        if (record.requestHash !== requestHash) throw new ConflictException('Idempotency key was used with a different payload');
        const [r] = await tx.select().from(reservations).where(eq(reservations.id, record.resourceId));
        if (!r) throw new NotFoundException('Reservation not found');
        return reservationView(r);
      }
      const variant = await lockVariant(tx, dto.variant_id);
      if (variant.onHand - variant.reserved < dto.quantity) throw new ConflictException('Insufficient available stock');
      await tx.update(productVariants).set({ reserved: variant.reserved + dto.quantity, updatedAt: new Date() }).where(eq(productVariants.id, variant.id));
      const [r] = await tx.insert(reservations).values({ variantId: variant.id, quantity: dto.quantity, createdById: actor.id }).returning();
      await this.audit.record(tx, { actorId: actor.id, action: 'reservation.create', entityType: 'reservation', entityId: r.id, before: null, after: { ...reservationView(r) } });
      await tx.insert(idempotencyRecords).values({ actorId: actor.id, operation, key, requestHash, resourceId: r.id });
      return reservationView(r);
    });
  }
  async findAll(query: QueryReservationDto) {
    const where = query.status ? eq(reservations.status, query.status) : undefined;
    const [{ total }] = await this.database.db.select({ total: count() }).from(reservations).where(where);
    const rows = await this.database.db.select().from(reservations).where(where).orderBy(desc(reservations.createdAt), desc(reservations.id))
      .limit(query.limit).offset((query.page - 1) * query.limit);
    return { data: rows.map(reservationView), meta: pagination(query.page, query.limit, total) };
  }
  confirm(id: string, actor: AuthenticatedUser) { return this.transition(id, actor, 'CONFIRMED'); }
  cancel(id: string, actor: AuthenticatedUser) { return this.transition(id, actor, 'CANCELLED'); }
  private async transition(id: string, actor: AuthenticatedUser, target: 'CONFIRMED' | 'CANCELLED') {
    return this.database.db.transaction(async tx => {
      const [initial] = await tx.select({ variantId: reservations.variantId }).from(reservations).where(eq(reservations.id, id));
      if (!initial) throw new NotFoundException('Reservation not found');
      const variant = await lockVariant(tx, initial.variantId, { allowArchived: true });
      const [before] = await tx.select().from(reservations).where(eq(reservations.id, id)).for('update');
      if (!before) throw new NotFoundException('Reservation not found');
      if (before.status === target) return reservationView(before);
      if (before.status !== 'PENDING') throw new ConflictException('Reservation already reached a different terminal status');
      const [parent] = await tx.select({ archivedAt: products.archivedAt }).from(products).where(eq(products.id, variant.productId));
      if (parent.archivedAt) throw new NotFoundException('Product not found');
      const [released] = await tx.update(productVariants).set({ reserved: variant.reserved - before.quantity, updatedAt: new Date() }).where(eq(productVariants.id, variant.id)).returning();
      if (target === 'CONFIRMED') await this.inventory.applyMovement(tx, released, { variant_id: variant.id, kind: 'OUT', delta: -before.quantity, reason: `Reservation ${before.id} confirmed` }, actor, before.id);
      const [after] = await tx.update(reservations).set({ status: target, updatedAt: new Date() }).where(eq(reservations.id, id)).returning();
      await this.audit.record(tx, { actorId: actor.id, action: target === 'CONFIRMED' ? 'reservation.confirm' : 'reservation.cancel', entityType: 'reservation', entityId: before.id,
        before: { ...reservationView(before) }, after: { ...reservationView(after) } });
      return reservationView(after);
    });
  }
}
