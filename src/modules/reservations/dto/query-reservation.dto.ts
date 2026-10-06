import { IsOptional, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { reservationStatus } from '../../../database/schema/reservations.js';
import { PageQueryDto } from '../../../common/dto/page-query.dto.js';
export class QueryReservationDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: reservationStatus.enumValues }) @IsOptional() @IsIn(reservationStatus.enumValues)
  status?: typeof reservationStatus.enumValues[number];
}
