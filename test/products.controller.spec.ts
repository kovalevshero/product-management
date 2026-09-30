import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { ProductsController as ProductsControllerType } from '../src/modules/products/products.controller';

jest.unstable_mockModule('@nestjs/throttler', () => ({
  Throttle: () => () => {},
  ThrottlerGuard: class {},
  ThrottlerModule: { forRoot: () => ({ module: class {} }) },
}));

const { Test } = await import('@nestjs/testing');
const { ProductsController } = await import('../src/modules/products/products.controller');
const { ProductsService } = await import('../src/modules/products/products.service');

describe('ProductsController', () => {
  let controller: ProductsControllerType;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: {
            findAll: jest.fn<any>().mockResolvedValue({ data: [], meta: {} }),
            findOne: jest.fn<any>().mockResolvedValue({ id: 1 }),
            create: jest.fn<any>().mockResolvedValue({ id: 1 }),
            update: jest.fn<any>().mockResolvedValue({ id: 1 }),
            remove: jest.fn<any>().mockResolvedValue({ statusCode: 200 }),
          },
        },
      ],
    }).compile();

    controller = module.get<ProductsControllerType>(ProductsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
