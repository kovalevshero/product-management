import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { and, desc, eq, ilike, sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service.js';
import { products } from '../../database/schema/products.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { QueryProductDto } from './dto/query-product.dto.js';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';

@Injectable()
export class ProductsService {
  constructor(
    private readonly databaseService: DatabaseService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  private getCacheKey(query: QueryProductDto): string {
    return `products_list:${query.search || ''}:${query.category || ''}:${query.page || 1}:${query.limit || 10}`;
  }

  private async invalidateCache(productId?: number) {
    if (productId) {
      await this.cacheManager.del(`product_detail:${productId}`);
    }
    // Clear list cache
    try {
      if (typeof (this.cacheManager as any).clear === 'function') {
        await (this.cacheManager as any).clear();
      } else if (typeof (this.cacheManager as any).reset === 'function') {
        await (this.cacheManager as any).reset();
      }
    } catch {
      // Continue safely if reset/clear is not supported
    }
  }

  private formatProductOutput(p: any) {
    return {
      id: p.id,
      title: p.title,
      price: typeof p.price === 'string' ? parseFloat(p.price) : p.price,
      description: p.description,
      category: p.category,
      images: p.images,
      created_at: p.createdAt,
      created_by: p.createdBy,
      created_by_id: p.createdById,
      updated_at: p.updatedAt,
      updated_by: p.updatedBy,
      updated_by_id: p.updatedById,
    };
  }

  async findAll(query: QueryProductDto) {
    const cacheKey = this.getCacheKey(query);
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (query.search) {
      conditions.push(ilike(products.title, `%${query.search}%`));
    }
    if (query.category) {
      conditions.push(eq(products.category, query.category));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await this.databaseService.db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(products)
      .where(whereClause);

    const total = totalResult?.count || 0;

    const records = await this.databaseService.db
      .select()
      .from(products)
      .where(whereClause)
      .orderBy(desc(products.id))
      .limit(limit)
      .offset(offset);

    const result = {
      data: records.map((r) => this.formatProductOutput(r)),
      meta: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit) || 1,
      },
    };

    await this.cacheManager.set(cacheKey, result, 60000);
    return result;
  }

  async findOne(id: number) {
    const cacheKey = `product_detail:${id}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    const [product] = await this.databaseService.db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    const formatted = this.formatProductOutput(product);
    await this.cacheManager.set(cacheKey, formatted, 60000);
    return formatted;
  }

  async create(dto: CreateProductDto, user: AuthenticatedUser) {
    const creatorName = user.fullName || user.username;
    const creatorId = String(user.id);

    const [newProduct] = await this.databaseService.db
      .insert(products)
      .values({
        title: dto.title,
        price: String(dto.price),
        description: dto.description || null,
        category: dto.category,
        images: dto.images,
        createdBy: creatorName,
        createdById: creatorId,
        updatedBy: creatorName,
        updatedById: creatorId,
      })
      .returning();

    await this.invalidateCache();
    return this.formatProductOutput(newProduct);
  }

  async update(id: number, dto: UpdateProductDto, user: AuthenticatedUser) {
    const [existing] = await this.databaseService.db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!existing) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    const updaterName = user.fullName || user.username;
    const updaterId = String(user.id);

    const updateValues: Record<string, any> = {
      updatedBy: updaterName,
      updatedById: updaterId,
      updatedAt: new Date(),
    };

    if (dto.title !== undefined) updateValues.title = dto.title;
    if (dto.price !== undefined) updateValues.price = String(dto.price);
    if (dto.description !== undefined) updateValues.description = dto.description;
    if (dto.category !== undefined) updateValues.category = dto.category;
    if (dto.images !== undefined) updateValues.images = dto.images;

    const [updatedProduct] = await this.databaseService.db
      .update(products)
      .set(updateValues)
      .where(eq(products.id, id))
      .returning();

    await this.invalidateCache(id);
    return this.formatProductOutput(updatedProduct);
  }

  async remove(id: number) {
    const [existing] = await this.databaseService.db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!existing) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    await this.databaseService.db.delete(products).where(eq(products.id, id));
    await this.invalidateCache(id);

    return {
      statusCode: 200,
      message: `Product with ID ${id} successfully deleted`,
    };
  }
}
