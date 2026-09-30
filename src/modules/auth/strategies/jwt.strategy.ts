import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { DatabaseService } from '../../../database/database.service.js';
import { users } from '../../../database/schema/users.js';
import { eq } from 'drizzle-orm';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly databaseService: DatabaseService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'super-secret-jwt-key-for-product-api-2026',
    });
  }

  async validate(payload: { sub: number; username: string }) {
    const userResult = await this.databaseService.db
      .select({ id: users.id, username: users.username, fullName: users.fullName })
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1);

    const user = userResult[0];
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }
    return {
      id: user.id,
      username: user.username,
      fullName: user.fullName || user.username,
    };
  }
}
