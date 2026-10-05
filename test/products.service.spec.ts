import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ProductCacheService } from '../src/modules/products/product-cache.service.js';
import { ProductsService } from '../src/modules/products/products.service';
import { DatabaseService } from '../src/database/database.service';

describe('ProductsService', () => {
  let service: ProductsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: DatabaseService,
          useValue: { db: {} },
        },
        {
          provide: ProductCacheService,
          useValue: {
            get: jest.fn<any>(),
            set: jest.fn<any>(),
            del: jest.fn<any>(),
            reset: jest.fn<any>(),
          },
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
