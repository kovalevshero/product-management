import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { ProductsModule } from './modules/products/products.module.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { DateFormatInterceptor } from './common/interceptors/date-format.interceptor.js';
import { FastifyHttpExceptionFilter } from './common/filters/fastify-http-exception.filter.js';

@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
      ttl: 60000,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    DatabaseModule,
    AuthModule,
    ProductsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: DateFormatInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: FastifyHttpExceptionFilter,
    },
  ],
})
export class AppModule {}
