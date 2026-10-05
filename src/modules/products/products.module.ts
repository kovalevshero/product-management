import { Module } from '@nestjs/common';
import { ProductsService } from './products.service.js';
import { ProductsController } from './products.controller.js';
import { ProductCacheService } from './product-cache.service.js';
import { VariantsController } from './variants.controller.js';
import { VariantsService } from './variants.service.js';

@Module({
  controllers: [ProductsController, VariantsController],
  providers: [ProductsService, ProductCacheService, VariantsService],
  exports: [ProductsService],
})
export class ProductsModule {}
