import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import { PageQueryDto } from '../../common/dto/page-query.dto.js';
import { CreateVariantDto, UpdateVariantDto } from './dto/create-variant.dto.js';
import { VariantsService } from './variants.service.js';
@Controller('api') @ApiTags('Variants') @ApiBearerAuth('access-token')
export class VariantsController {
  constructor(private readonly variants: VariantsService) {}
  @Get('products/:id/variants')
  findAll(@Param('id', ParseIntPipe) id: number, @Query() query: PageQueryDto) { return this.variants.findAll(id, query); }
  @Post('products/:id/variants') @Roles('admin', 'staff')
  create(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateVariantDto, @CurrentUser() actor: AuthenticatedUser) { return this.variants.create(id, dto, actor); }
  @Patch('variants/:id') @Roles('admin', 'staff')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateVariantDto, @CurrentUser() actor: AuthenticatedUser) { return this.variants.update(id, dto, actor); }
}
