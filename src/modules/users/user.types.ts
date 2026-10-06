import { ApiProperty } from '@nestjs/swagger';
import { userRole, type UserRole } from '../../database/schema/users.js';
export class UserSummaryDto {
  @ApiProperty() id: number;
  @ApiProperty() username: string;
  @ApiProperty({ type: String, nullable: true }) full_name: string | null;
  @ApiProperty({ enum: userRole.enumValues }) role: UserRole;
  @ApiProperty({ type: String, description: 'UTC YYYY-MM-DD HH:mm:ss' }) created_at: Date;
}
export class UserPageMetaDto {
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() total: number;
  @ApiProperty() total_pages: number;
}
export class UserPageDto {
  @ApiProperty({ type: [UserSummaryDto] }) data: UserSummaryDto[];
  @ApiProperty({ type: UserPageMetaDto }) meta: UserPageMetaDto;
}
