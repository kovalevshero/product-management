import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
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
          provide: CACHE_MANAGER,
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
