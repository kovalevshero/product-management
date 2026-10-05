import { Type } from 'class-transformer';
import { IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
export class PageQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 2147483647 })
  @Type(() => Number) @IsInt() @Min(1) @Max(2147483647)
  page: number = 1;
  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit: number = 10;
}
