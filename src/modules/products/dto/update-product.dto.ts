import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, ValidateIf, IsNumber, IsString, IsArray, ArrayMinSize, Min, Max, MaxLength, IsNotEmpty, IsUrl } from 'class-validator';
import { Transform } from 'class-transformer';
import { numericScalar, trimText } from '../../../common/dto/transforms.js';

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'Updated T-Shirt' })
  @ValidateIf((_, value) => value !== undefined)
  @Transform(trimText)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ example: 109.99 })
  @ValidateIf((_, value) => value !== undefined)
  @Transform(numericScalar)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'price must be greater than zero' })
  @Max(99999999.99)
  price?: number;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Apparel' })
  @ValidateIf((_, value) => value !== undefined)
  @Transform(trimText)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ example: ['https://placeimg.com/640/480/updated'], type: [String] })
  @ValidateIf((_, value) => value !== undefined)
  @IsArray()
  @ArrayMinSize(1, { message: 'images must contain at least 1 item' })
  @IsString({ each: true })
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true }, { each: true })
  images?: string[];
}
