import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, IsArray, ArrayMinSize, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'Updated T-Shirt' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 109.99 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'price must be a valid number' })
  @Min(0.01, { message: 'price must be greater than zero' })
  price?: number;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Apparel' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: ['https://placeimg.com/640/480/updated'], type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'images must contain at least 1 item' })
  @IsString({ each: true })
  images?: string[];
}
