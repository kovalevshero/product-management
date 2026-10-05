import { Module } from '@nestjs/common';
import { ProductsService } from './products.service.js';
import { ProductsController } from './products.controller.js';
import { ProductCacheService } from './product-cache.service.js';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService, ProductCacheService],
  exports: [ProductsService],
})
export class ProductsModule {}
