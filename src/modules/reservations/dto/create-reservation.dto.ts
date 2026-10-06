import { IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class CreateReservationDto {
  @ApiProperty({ example: 1 }) @IsInt() @Min(1) @Max(2147483647)
  variant_id: number;
  @ApiProperty({ example: 1, minimum: 1, maximum: 1000000 }) @IsInt() @Min(1) @Max(1000000)
  quantity: number;
}
