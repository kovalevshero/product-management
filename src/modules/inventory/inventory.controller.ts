import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { DatabaseIdPipe } from '../../common/pipes/database-id.pipe.js';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { PageQueryDto } from '../../common/dto/page-query.dto.js';
import { InventoryService } from './inventory.service.js';
import { CreateMovementDto } from './dto/create-movement.dto.js';
import { QueryInventoryDto } from './dto/query-inventory.dto.js';
@Controller('api/inventory') @ApiTags('Inventory') @ApiBearerAuth('access-token')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}
  @Get() findBalances(@Query() query: QueryInventoryDto) { return this.inventory.findBalances(query); }
  @Get('variants/:id/movements') findMovements(@Param('id', DatabaseIdPipe) id: number, @Query() query: PageQueryDto) { return this.inventory.findMovements(id, query); }
  @Post('movements') @Roles('admin', 'staff')
  record(@Body() dto: CreateMovementDto, @CurrentUser() actor: AuthenticatedUser) { return this.inventory.recordMovement(dto, actor); }
}
