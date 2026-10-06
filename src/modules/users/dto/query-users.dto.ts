import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PageQueryDto } from '../../../common/dto/page-query.dto.js';
import { userRole, type UserRole } from '../../../database/schema/users.js';
export class QueryUsersDto extends PageQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50)
  search?: string;
  @ApiPropertyOptional({ enum: userRole.enumValues }) @IsOptional() @IsIn(userRole.enumValues)
  role?: UserRole;
}
