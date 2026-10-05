import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PageQueryDto } from '../../../common/dto/page-query.dto.js';
export class QueryAuditDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: ['product', 'variant', 'stock_movement', 'reservation', 'user'] })
  @IsOptional() @IsIn(['product', 'variant', 'stock_movement', 'reservation', 'user'])
  entity_type?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(80)
  entity_id?: string;
}
