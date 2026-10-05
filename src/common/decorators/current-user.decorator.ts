import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { UserRole } from '../../database/schema/users.js';

export interface AuthenticatedUser {
  id: number;
  username: string;
  role: UserRole;
  fullName?: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;
    return data && user ? user[data] : user;
  },
);
