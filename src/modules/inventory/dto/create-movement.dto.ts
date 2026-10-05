import { IsInt, Min, Max, IsIn, IsString, IsNotEmpty, MaxLength, NotEquals } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
export class CreateMovementDto {
  @ApiProperty({ example: 1 }) @IsInt() @Min(1) @Max(2147483647)
  variant_id: number;
  @ApiProperty({ enum: ['IN', 'OUT', 'ADJUSTMENT'] }) @IsIn(['IN', 'OUT', 'ADJUSTMENT'])
  kind: 'IN' | 'OUT' | 'ADJUSTMENT';
  @ApiProperty({ example: 10, minimum: -1000000, maximum: 1000000 }) @IsInt() @Min(-1000000) @Max(1000000) @NotEquals(0)
  delta: number;
  @ApiProperty({ example: 'Synthetic demo opening stock' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @IsNotEmpty() @MaxLength(255)
  reason: string;
}
