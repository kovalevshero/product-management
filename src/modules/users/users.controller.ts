import { Body, Controller, Param, ParseIntPipe, Patch } from '@nestjs/common';
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
  setRole(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRoleDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.users.setRole(id, dto.role, actor);
  }
}
