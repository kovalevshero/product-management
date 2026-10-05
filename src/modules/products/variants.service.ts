import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, isNull, count, desc } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service.js';
import { productVariants, products } from '../../database/schema/index.js';
import { AuditService } from '../audit/audit.service.js';
import { lockActiveProduct, lockVariant } from '../inventory/inventory-locks.js';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import { PageQueryDto } from '../../common/dto/page-query.dto.js';
import { pagination } from '../../common/types/pagination.js';
import { hasDatabaseCode } from '../../common/database-error.js';
import { CreateVariantDto, UpdateVariantDto } from './dto/create-variant.dto.js';
import { variantView } from './variant.types.js';
@Injectable()
export class VariantsService {
  constructor(private readonly database: DatabaseService, private readonly audit: AuditService) {}
  async findAll(productId: number, query: PageQueryDto) {
    return this.database.db.transaction(async tx => {
      const [p] = await tx.select({ id: products.id }).from(products).where(and(eq(products.id, productId), isNull(products.archivedAt))).for('share');
      if (!p) throw new NotFoundException('Product not found');
      const where = eq(productVariants.productId, productId);
      const [{ total }] = await tx.select({ total: count() }).from(productVariants).where(where);
      const rows = await tx.select().from(productVariants).where(where).orderBy(desc(productVariants.id)).limit(query.limit).offset((query.page - 1) * query.limit);
      return { data: rows.map(variantView), meta: pagination(query.page, query.limit, total) };
    });
  }
  async create(productId: number, dto: CreateVariantDto, actor: AuthenticatedUser) {
    try {
      return await this.database.db.transaction(async tx => {
        await lockActiveProduct(tx, productId);
        const [v] = await tx.insert(productVariants).values({ productId, ...dto }).returning();
        await this.audit.record(tx, { actorId: actor.id, action: 'variant.create', entityType: 'variant', entityId: String(v.id), before: null, after: { ...variantView(v) } });
        return variantView(v);
      });
    } catch (error) {
      if (hasDatabaseCode(error, '23505')) throw new ConflictException('SKU already exists');
      throw error;
    }
  }
  async update(id: number, dto: UpdateVariantDto, actor: AuthenticatedUser) {
    return this.database.db.transaction(async tx => {
      const before = await lockVariant(tx, id);
      const [v] = await tx.update(productVariants).set({ ...dto, updatedAt: new Date() }).where(eq(productVariants.id, id)).returning();
      await this.audit.record(tx, { actorId: actor.id, action: 'variant.update', entityType: 'variant', entityId: String(id), before: { ...variantView(before) }, after: { ...variantView(v) } });
      return variantView(v);
    });
  }
}
