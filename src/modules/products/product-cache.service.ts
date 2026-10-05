import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class ProductCacheService {
  private generation = 0;
  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}
  invalidate(): void { this.generation++; }
  async getOrLoad<T>(key: string, load: () => Promise<T>): Promise<T> {
    key = `catalog:${this.generation}:${key}`;
    const value = await this.cache.get<T>(key);
    if (value != null) return value;
    const result = await load();
    await this.cache.set(key, result, 60000);
    return result;
  }
}
