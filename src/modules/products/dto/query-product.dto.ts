import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryProductDto {
  @ApiPropertyOptional({ example: 'T-Shirt', description: 'Search keyword for product title' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'Clothes', description: 'Filter by category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 1, default: 1, description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10, description: 'Number of items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
