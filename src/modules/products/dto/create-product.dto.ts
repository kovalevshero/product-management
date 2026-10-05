import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsArray, ArrayMinSize, IsOptional, Min, Max, MaxLength, IsUrl } from 'class-validator';
import { Transform } from 'class-transformer';
import { numericScalar, trimText } from '../../../common/dto/transforms.js';

export class CreateProductDto {
  @ApiProperty({ example: 'Awesome T-Shirt', description: 'Product title' })
  @Transform(trimText)
  @IsString()
  @IsNotEmpty({ message: 'title is required' })
  @MaxLength(255)
  title: string;

  @ApiProperty({ example: 99.99, description: 'Product price' })
  @Transform(numericScalar)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'price must have at most two decimals' })
  @Min(0.01, { message: 'price must be greater than zero' })
  @Max(99999999.99)
  price: number;

  @ApiPropertyOptional({ example: 'High-quality cotton t-shirt', description: 'Product description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'Clothes', description: 'Product category' })
  @Transform(trimText)
  @IsString()
  @IsNotEmpty({ message: 'category is required' })
  @MaxLength(100)
  category: string;

  @ApiProperty({
    example: ['https://placeimg.com/640/480/any'],
    description: 'Array of image URLs (minimum 1 item)',
    type: [String],
  })
  @IsArray({ message: 'images must be an array' })
  @ArrayMinSize(1, { message: 'images must contain at least 1 item' })
  @IsString({ each: true, message: 'each image item must be a string URL' })
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true }, { each: true })
  images: string[];
}
