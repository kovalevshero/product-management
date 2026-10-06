import { BadRequestException, Body, Controller, Get, Headers, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { ApiBearerAuth, ApiBody, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { EmptyRequestDto } from './dto/empty-request.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import { CreateReservationDto } from './dto/create-reservation.dto.js';
import { QueryReservationDto } from './dto/query-reservation.dto.js';
import { ReservationsService } from './reservations.service.js';
@Controller('api/reservations') @ApiTags('Reservations') @ApiBearerAuth('access-token')
export class ReservationsController {
  constructor(private readonly reservations: ReservationsService) {}
  @Get() findAll(@Query() query: QueryReservationDto) { return this.reservations.findAll(query); }
  @Post() @Roles('admin', 'staff')
  @ApiHeader({ name: 'Idempotency-Key', required: true, schema: { type: 'string', format: 'uuid' } })
  @ApiOperation({ summary: 'Reserve one SKU; replay returns current reservation state with 201' })
  create(@Body() dto: CreateReservationDto, @CurrentUser() actor: AuthenticatedUser,
    @Headers('idempotency-key') key: string) {
    if (!isUUID(key)) throw new BadRequestException('Idempotency-Key must be a UUID');
    return this.reservations.create(dto, actor, key);
  }
  @Post(':id/confirm') @Roles('admin', 'staff') @HttpCode(200)
  @ApiBody({ required: false, schema: { type: 'object', additionalProperties: false } })
  confirm(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() actor: AuthenticatedUser, @Body() _body: EmptyRequestDto) { return this.reservations.confirm(id, actor); }
  @Post(':id/cancel') @Roles('admin', 'staff') @HttpCode(200)
  @ApiBody({ required: false, schema: { type: 'object', additionalProperties: false } })
  cancel(@Param('id', new ParseUUIDPipe()) id: string, @CurrentUser() actor: AuthenticatedUser, @Body() _body: EmptyRequestDto) { return this.reservations.cancel(id, actor); }
}
