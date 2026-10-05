import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, ilike, isNull, count } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service.js';
import { products, type Product } from '../../database/schema/products.js';
import { productVariants } from '../../database/schema/product-variants.js';
import type { DbTransaction } from '../../database/database.types.js';
import { ProductCacheService } from './product-cache.service.js';
import { AuditService } from '../audit/audit.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { QueryProductDto } from './dto/query-product.dto.js';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import { pagination } from '../../common/types/pagination.js';

@Injectable()
export class ProductsService {
  constructor(private readonly database: DatabaseService, private readonly cache: ProductCacheService, private readonly audit: AuditService) {}
  private view(p: Product) {
    return { id: p.id, title: p.title, price: Number(p.price), description: p.description, category: p.category, images: p.images,
      created_at: p.createdAt, created_by: p.createdBy, created_by_id: p.createdById,
      updated_at: p.updatedAt, updated_by: p.updatedBy, updated_by_id: p.updatedById };
  }
  async findAll(query: QueryProductDto) {
    return this.cache.getOrLoad(JSON.stringify([query.search || '', query.category || '', query.page || 1, query.limit || 10]), async () => {
      const page = query.page || 1, limit = query.limit || 10;
      const where = and(isNull(products.archivedAt), query.search ? ilike(products.title, `%${query.search}%`) : undefined,
        query.category ? eq(products.category, query.category) : undefined);
      const [{ total }] = await this.database.db.select({ total: count() }).from(products).where(where);
      const rows = await this.database.db.select().from(products).where(where).orderBy(desc(products.id)).limit(limit).offset((page - 1) * limit);
      return { data: rows.map(r => this.view(r)), meta: pagination(page, limit, total) };
    });
  }
  async findOne(id: number) {
    return this.cache.getOrLoad(`product_detail:${id}`, async () => {
      const [p] = await this.database.db.select().from(products).where(and(eq(products.id, id), isNull(products.archivedAt)));
      if (!p) throw new NotFoundException('Product not found');
      return this.view(p);
    });
  }
  async create(dto: CreateProductDto, actor: AuthenticatedUser) {
    const p = await this.database.db.transaction(async tx => {
      const name = actor.fullName || actor.username;
      const [p] = await tx.insert(products).values({ title: dto.title, price: String(dto.price), description: dto.description || null,
        category: dto.category, images: dto.images, createdBy: name, updatedBy: name, createdById: String(actor.id), updatedById: String(actor.id) }).returning();
      await this.audit.record(tx, { actorId: actor.id, action: 'product.create', entityType: 'product', entityId: String(p.id), before: null, after: this.view(p) });
      return p;
    });
    this.cache.invalidate();
    return this.view(p);
  }
  private async lockProduct(tx: DbTransaction, id: number) {
    const [p] = await tx.select().from(products).where(eq(products.id, id)).for('update');
    if (!p || p.archivedAt) throw new NotFoundException('Product not found');
    return p;
  }
  async update(id: number, dto: UpdateProductDto, actor: AuthenticatedUser) {
    const p = await this.database.db.transaction(async tx => {
      const before = await this.lockProduct(tx, id);
      const [p] = await tx.update(products).set({ ...dto, price: dto.price === undefined ? undefined : String(dto.price),
        updatedBy: actor.fullName || actor.username, updatedById: String(actor.id), updatedAt: new Date() }).where(eq(products.id, id)).returning();
      await this.audit.record(tx, { actorId: actor.id, action: 'product.update', entityType: 'product', entityId: String(id), before: this.view(before), after: this.view(p) });
      return p;
    });
    this.cache.invalidate();
    return this.view(p);
  }
  async remove(id: number, actor: AuthenticatedUser) {
    await this.database.db.transaction(async tx => {
      const before = await this.lockProduct(tx, id);
      const variants = await tx.select().from(productVariants).where(eq(productVariants.productId, id)).orderBy(asc(productVariants.id)).for('update');
      if (variants.some(v => v.onHand !== 0 || v.reserved !== 0)) throw new ConflictException('Product stock must be zero before archive');
      const archivedAt = new Date();
      await tx.update(products).set({ archivedAt, updatedAt: archivedAt, updatedBy: actor.fullName || actor.username, updatedById: String(actor.id) }).where(eq(products.id, id));
      await this.audit.record(tx, { actorId: actor.id, action: 'product.archive', entityType: 'product', entityId: String(id), before: this.view(before), after: { id, archived_at: archivedAt } });
    });
    this.cache.invalidate();
    return { statusCode: 200, message: `Product with ID ${id} successfully archived` };
  }
}
