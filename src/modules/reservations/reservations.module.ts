import { Module } from '@nestjs/common';
import { ReservationsController } from './reservations.controller.js';
import { ReservationsService } from './reservations.service.js';
import { IdempotencyService } from './idempotency.service.js';
import { InventoryModule } from '../inventory/inventory.module.js';
@Module({ imports: [InventoryModule], controllers: [ReservationsController], providers: [ReservationsService, IdempotencyService] })
export class ReservationsModule {}
