import { ApiProperty } from '@nestjs/swagger';
import { userRole, type UserRole } from '../../../database/schema/users.js';
export class AuthProfileDto {
  @ApiProperty() id: number;
  @ApiProperty() username: string;
  @ApiProperty() full_name: string;
  @ApiProperty({ enum: userRole.enumValues }) role: UserRole;
}
