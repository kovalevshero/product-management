import { Transform } from 'class-transformer';
import { IsString, Matches, MaxLength, IsNotEmpty, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
export class UpdateVariantDto {
  @ApiPropertyOptional({ example: 'Black M' })
  @ValidateIf((_, value) => value !== undefined)
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @IsNotEmpty() @MaxLength(100)
  label?: string;
  @ApiPropertyOptional({ example: '99.99', type: String, pattern: '^(?!0\\.00$)(?:0|[1-9]\\d{0,7})\\.\\d{2}$' })
  @ValidateIf((_, value) => value !== undefined)
  @IsString() @Matches(/^(?!0\.00$)(?:0|[1-9]\d{0,7})\.\d{2}$/)
  price?: string;
}
export class CreateVariantDto {
  @ApiProperty({ example: 'DEMO-BLACK-M' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toUpperCase() : value)
  @IsString() @Matches(/^[A-Z0-9][A-Z0-9_-]{0,79}$/)
  sku: string;
  @ApiProperty({ example: 'Black M' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @IsNotEmpty() @MaxLength(100)
  label: string;
  @ApiProperty({ example: '99.99', type: String })
  @IsString() @Matches(/^(?!0\.00$)(?:0|[1-9]\d{0,7})\.\d{2}$/)
  price: string;
}
