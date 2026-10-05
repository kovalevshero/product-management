import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service.js';
import { users, type UserRole } from '../../database/schema/users.js';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import { AuditService } from '../audit/audit.service.js';

@Injectable()
export class UsersService {
  constructor(private readonly database: DatabaseService, private readonly audit: AuditService) {}
  async setRole(id: number, role: UserRole, actor: AuthenticatedUser) {
    return this.database.db.transaction(async tx => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(730105)`);
      const [target] = await tx.select().from(users).where(eq(users.id, id));
      if (!target) throw new NotFoundException('User not found');
      if (target.role === 'admin' && role !== 'admin') {
        const admins = await tx.select({ id: users.id }).from(users).where(eq(users.role, 'admin'));
        if (admins.length <= 1) throw new ConflictException('The last admin cannot be demoted');
      }
      const [currentActor] = await tx.select({ role: users.role }).from(users).where(eq(users.id, actor.id));
      if (currentActor?.role !== 'admin') throw new ForbiddenException();
      const [updated] = await tx.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, id))
        .returning({ id: users.id, username: users.username, role: users.role });
      if (target.role !== role) await this.audit.record(tx, { actorId: actor.id, action: 'user.role_change', entityType: 'user', entityId: String(id),
        before: { id, role: target.role }, after: { id, role } });
      return updated;
    });
  }
}
