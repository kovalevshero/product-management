import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsArray, ArrayMinSize, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({ example: 'Awesome T-Shirt', description: 'Product title' })
  @IsString()
  @IsNotEmpty({ message: 'title is required' })
  title: string;

  @ApiProperty({ example: 99.99, description: 'Product price' })
  @Type(() => Number)
  @IsNumber({}, { message: 'price must be a valid number' })
  @Min(0.01, { message: 'price must be greater than zero' })
  price: number;

  @ApiPropertyOptional({ example: 'High-quality cotton t-shirt', description: 'Product description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'Clothes', description: 'Product category' })
  @IsString()
  @IsNotEmpty({ message: 'category is required' })
  category: string;

  @ApiProperty({
    example: ['https://placeimg.com/640/480/any'],
    description: 'Array of image URLs (minimum 1 item)',
    type: [String],
  })
  @IsArray({ message: 'images must be an array' })
  @ArrayMinSize(1, { message: 'images must contain at least 1 item' })
  @IsString({ each: true, message: 'each image item must be a string URL' })
  images: string[];
}
