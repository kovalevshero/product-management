import { Injectable, BadRequestException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service.js';
import { users } from '../../database/schema/users.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.databaseService.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, dto.username))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException(`Username '${dto.username}' is already taken`);
    }

    const hashedPassword = await argon2.hash(dto.password);
    const fullName = dto.full_name || dto.username;

    const [newUser] = await this.databaseService.db
      .insert(users)
      .values({
        username: dto.username,
        password: hashedPassword,
        fullName,
      })
      .returning({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        createdAt: users.createdAt,
      });

    return {
      id: newUser.id,
      username: newUser.username,
      full_name: newUser.fullName,
      created_at: newUser.createdAt,
    };
  }

  async login(dto: LoginDto) {
    const [user] = await this.databaseService.db
      .select()
      .from(users)
      .where(eq(users.username, dto.username))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const isPasswordValid = await argon2.verify(user.password, dto.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const tokens = await this.generateTokens(user.id, user.username);
    const refreshHash = await argon2.hash(tokens.refresh_token);

    await this.databaseService.db
      .update(users)
      .set({ refreshTokenHash: refreshHash })
      .where(eq(users.id, user.id));

    return tokens;
  }

  async refreshTokens(dto: RefreshTokenDto) {
    try {
      const payload = await this.jwtService.verifyAsync(dto.refresh_token, {
        secret: process.env.JWT_REFRESH_SECRET || 'super-secret-jwt-refresh-key-for-product-api-2026',
      });

      const [user] = await this.databaseService.db
        .select()
        .from(users)
        .where(eq(users.id, payload.sub))
        .limit(1);

      if (!user || !user.refreshTokenHash) {
        throw new UnauthorizedException('Access denied');
      }

      const isTokenMatch = await argon2.verify(user.refreshTokenHash, dto.refresh_token);
      if (!isTokenMatch) {
        throw new UnauthorizedException('Access denied');
      }

      const tokens = await this.generateTokens(user.id, user.username);
      const newRefreshHash = await argon2.hash(tokens.refresh_token);

      await this.databaseService.db
        .update(users)
        .set({ refreshTokenHash: newRefreshHash })
        .where(eq(users.id, user.id));

      return tokens;
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private async generateTokens(userId: number, username: string) {
    const payload = { sub: userId, username };

    const [authentication_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET || 'super-secret-jwt-key-for-product-api-2026',
        expiresIn: '1h',
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET || 'super-secret-jwt-refresh-key-for-product-api-2026',
        expiresIn: '7d',
      }),
    ]);

    return {
      authentication_token,
      refresh_token,
    };
  }
}
