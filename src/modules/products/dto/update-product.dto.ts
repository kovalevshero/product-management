import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, IsArray, ArrayMinSize, Min, Max, MaxLength, IsNotEmpty, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'Updated T-Shirt' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ example: 109.99 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'price must be greater than zero' })
  @Max(99999999.99)
  price?: number;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Apparel' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ example: ['https://placeimg.com/640/480/updated'], type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'images must contain at least 1 item' })
  @IsString({ each: true })
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true }, { each: true })
  images?: string[];
}
