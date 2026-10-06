import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { DatabaseIdPipe } from '../../common/pipes/database-id.pipe.js';
import { ApiBearerAuth, ApiTags, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { QueryUsersDto } from './dto/query-users.dto.js';
import { UserPageDto } from './user.types.js';
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
  @Get()
  @ApiOperation({ summary: 'Paginated safe member profiles (admin only)' })
  @ApiOkResponse({ type: UserPageDto })
  findAll(@Query() query: QueryUsersDto) { return this.users.findAll(query); }
  @Patch(':id/role')
  setRole(@Param('id', DatabaseIdPipe) id: number, @Body() dto: UpdateRoleDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.users.setRole(id, dto.role, actor);
  }
}
