import { Body, Controller, Param, Patch } from '@nestjs/common';
import { DatabaseIdPipe } from '../../common/pipes/database-id.pipe.js';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
import { UsersService } from './users.service.js';
@Controller('api/users')
@ApiTags('Users')
@ApiBearerAuth('access-token')
@Roles('admin')
export class UsersController {
  constructor(private readonly users: UsersService) {}
  @Patch(':id/role')
  setRole(@Param('id', DatabaseIdPipe) id: number, @Body() dto: UpdateRoleDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.users.setRole(id, dto.role, actor);
  }
}
