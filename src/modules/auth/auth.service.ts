import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import * as argon2 from 'argon2';
import { and, eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service.js';
import { users } from '../../database/schema/users.js';
import { hasDatabaseCode } from '../../common/database-error.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';

@Injectable()
export class AuthService {
  constructor(private readonly databaseService: DatabaseService, private readonly jwtService: JwtService) {}

  async register(dto: RegisterDto) {
    const password = await argon2.hash(dto.password);
    try {
      const [user] = await this.databaseService.db.insert(users).values({
        username: dto.username, password, fullName: dto.full_name || dto.username,
      }).returning({ id: users.id, username: users.username, fullName: users.fullName, createdAt: users.createdAt });
      return { id: user.id, username: user.username, full_name: user.fullName, created_at: user.createdAt };
    } catch (error) {
      if (hasDatabaseCode(error, '23505')) throw new ConflictException('Username is already taken');
      throw error;
    }
  }

  async login(dto: LoginDto) {
    const [user] = await this.databaseService.db.select().from(users).where(eq(users.username, dto.username)).limit(1);
    if (!user || !await argon2.verify(user.password, dto.password)) throw new UnauthorizedException('Invalid username or password');
    const tokens = await this.generateTokens(user.id, user.username);
    await this.databaseService.db.update(users).set({ refreshTokenHash: await argon2.hash(tokens.refresh_token) }).where(eq(users.id, user.id));
    return tokens;
  }

  async refreshTokens(dto: RefreshTokenDto) {
    let payload: { sub: number; username: string; jti: string };
    try {
      payload = await this.jwtService.verifyAsync(dto.refresh_token, { secret: process.env.JWT_REFRESH_SECRET, algorithms: ['HS256'] });
    } catch { throw new UnauthorizedException('Invalid or expired refresh token'); }
    if (!Number.isInteger(payload.sub) || typeof payload.username !== 'string' || typeof payload.jti !== 'string') {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const [user] = await this.databaseService.db.select().from(users).where(eq(users.id, payload.sub)).limit(1);
    if (!user?.refreshTokenHash || !await argon2.verify(user.refreshTokenHash, dto.refresh_token)) throw new UnauthorizedException('Invalid refresh token');
    const tokens = await this.generateTokens(user.id, user.username);
    const hash = await argon2.hash(tokens.refresh_token);
    const changed = await this.databaseService.db.update(users).set({ refreshTokenHash: hash })
      .where(and(eq(users.id, user.id), eq(users.refreshTokenHash, user.refreshTokenHash))).returning({ id: users.id });
    if (!changed.length) throw new UnauthorizedException('Refresh token was already used or revoked');
    return tokens;
  }

  async logout(userId: number): Promise<void> {
    await this.databaseService.db.update(users).set({ refreshTokenHash: null }).where(eq(users.id, userId));
  }

  private async generateTokens(userId: number, username: string) {
    const payload = { sub: userId, username };
    const [authentication_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(payload, { secret: process.env.JWT_SECRET, expiresIn: '15m', algorithm: 'HS256', jwtid: randomUUID() }),
      this.jwtService.signAsync(payload, { secret: process.env.JWT_REFRESH_SECRET, expiresIn: '7d', algorithm: 'HS256', jwtid: randomUUID() }),
    ]);
    return { authentication_token, refresh_token };
  }
}
