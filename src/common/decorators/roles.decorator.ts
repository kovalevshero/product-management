import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '../../database/schema/users.js';
export const ROLES_KEY = 'store_roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
