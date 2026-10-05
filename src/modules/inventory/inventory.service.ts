import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { and, count, desc, eq, ilike, isNull } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service.js';
import { products, productVariants, stockMovements } from '../../database/schema/index.js';
import { AuditService } from '../audit/audit.service.js';
import { lockVariant } from './inventory-locks.js';
import { inventoryBalance, movementView } from './inventory.types.js';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import { pagination } from '../../common/types/pagination.js';
import { PageQueryDto } from '../../common/dto/page-query.dto.js';
import { CreateMovementDto } from './dto/create-movement.dto.js';
import { QueryInventoryDto } from './dto/query-inventory.dto.js';
@Injectable()
export class InventoryService {
  constructor(private readonly database: DatabaseService, private readonly audit: AuditService) {}
  async recordMovement(dto: CreateMovementDto, actor: AuthenticatedUser) {
    if ((dto.kind === 'IN' && dto.delta < 0) || (dto.kind === 'OUT' && dto.delta > 0)) throw new BadRequestException('Delta direction does not match movement kind');
    return this.database.db.transaction(async tx => {
      const before = await lockVariant(tx, dto.variant_id);
      const onHand = before.onHand + dto.delta;
      if (onHand < before.reserved) throw new ConflictException('Insufficient available stock');
      if (onHand > 2147483647) throw new ConflictException('Stock exceeds integer capacity');
      const [variant] = await tx.update(productVariants).set({ onHand, updatedAt: new Date() }).where(eq(productVariants.id, before.id)).returning();
      const [movement] = await tx.insert(stockMovements).values({ variantId: before.id, kind: dto.kind, delta: dto.delta, reason: dto.reason, actorId: actor.id }).returning();
      await this.audit.record(tx, { actorId: actor.id, action: 'stock_movement.create', entityType: 'stock_movement', entityId: String(movement.id),
        before: { ...inventoryBalance(before) }, after: { ...inventoryBalance(variant), movement: movementView(movement) } });
      return { movement: movementView(movement), balance: inventoryBalance(variant) };
    });
  }
  async findBalances(query: QueryInventoryDto) {
    const where = and(isNull(products.archivedAt), query.sku ? ilike(productVariants.sku, `%${query.sku}%`) : undefined);
    const [{ total }] = await this.database.db.select({ total: count() }).from(productVariants).innerJoin(products, eq(products.id, productVariants.productId)).where(where);
    const rows = await this.database.db.select({ variant: productVariants }).from(productVariants).innerJoin(products, eq(products.id, productVariants.productId)).where(where)
      .orderBy(desc(productVariants.id)).limit(query.limit).offset((query.page - 1) * query.limit);
    return { data: rows.map(r => inventoryBalance(r.variant)), meta: pagination(query.page, query.limit, total) };
  }
  async findMovements(id: number, query: PageQueryDto) {
    if (!(await this.database.db.select({ id: productVariants.id }).from(productVariants).where(eq(productVariants.id, id))).length) throw new NotFoundException('Variant not found');
    const where = eq(stockMovements.variantId, id);
    const [{ total }] = await this.database.db.select({ total: count() }).from(stockMovements).where(where);
    const rows = await this.database.db.select().from(stockMovements).where(where).orderBy(desc(stockMovements.createdAt), desc(stockMovements.id)).limit(query.limit).offset((query.page - 1) * query.limit);
    return { data: rows.map(movementView), meta: pagination(query.page, query.limit, total) };
  }
}
