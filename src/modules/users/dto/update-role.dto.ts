import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { userRole, type UserRole } from '../../../database/schema/users.js';
export class UpdateRoleDto {
  @ApiProperty({ enum: userRole.enumValues })
  @IsIn(userRole.enumValues)
  role: UserRole;
}
