# Product Management & Auth Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready, fully containerized backend REST API for Product Management and Authentication with NestJS 12.1.1, Fastify, PostgreSQL 18, Drizzle ORM, Argon2, Swagger, and Docker Desktop support.

**Architecture:** Modular Clean Layered Architecture with Fastify adapter. Features separated into `database`, `auth`, `products`, and `common` modules, utilizing Drizzle ORM for type-safe queries and automatic migrations, in-memory caching with eviction, custom date formatting interceptors, and Argon2 password hashing.

**Tech Stack:** NestJS 12.1.1, Fastify (@nestjs/platform-fastify), Node.js 24 (node:24-alpine), PostgreSQL 18 (postgres:18), Drizzle ORM (drizzle-orm, drizzle-kit, postgres), Argon2, @nestjs/jwt, passport-jwt, @nestjs/throttler, @nestjs/cache-manager, @nestjs/swagger, Docker, Docker Compose.

**Spec:** [docs/superpowers/specs/2026-09-30-backend-product-management-design.md](file:///d:/Repository%20Test/product-management/docs/superpowers/specs/2026-09-30-backend-product-management-design.md)

## Global Constraints
- Framework version: NestJS 12.1.1
- Runtime: Node.js 24 (`node:24-alpine`)
- Database: PostgreSQL 18 (`postgres:18`)
- ORM: Drizzle ORM with `postgres` (postgres.js) driver
- Security: Password & refresh token hashing with `argon2`
- Date formatting: Timestamps in API responses strictly formatted as `YYYY-MM-DD HH:mm:ss`
- Documentation: Swagger OpenAPI available at `/api/docs`
- CORS: Enabled for all origins `*` with credentials
- Containerization: Fully runnable via `docker compose up --build` on Docker Desktop

---

### Task 1: Project Scaffolding & Dependencies Configuration

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `nest-cli.json`
- Create: `drizzle.config.ts`
- Create: `.env.example`
- Create: `.env`

**Interfaces:**
- Produces: Base configuration files, scripts (`npm run build`, `npm run start:dev`, `npm run test`, `npm run db:generate`, `npm run db:migrate`), and installed npm dependencies.

- [ ] **Step 1: Write `package.json` with NestJS 12.1.1, Fastify, Drizzle, Argon2, and dependencies**

```json
{
  "name": "product-management-backend",
  "version": "1.0.0",
  "description": "Product Management and Authentication REST API with NestJS 12, Fastify, and Drizzle ORM",
  "author": "Backend Developer",
  "private": true,
  "license": "UNLICENSED",
  "scripts": {
    "build": "nest build",
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\"",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:debug": "nest start --debug --watch",
    "start:prod": "node dist/main",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "node dist/database/migrate.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  },
  "dependencies": {
    "@fastify/static": "^8.1.1",
    "@fastify/swagger": "^9.4.2",
    "@fastify/swagger-ui": "^5.2.2",
    "@nestjs/cache-manager": "^3.0.1",
    "@nestjs/common": "12.1.1",
    "@nestjs/core": "12.1.1",
    "@nestjs/jwt": "^11.0.1",
    "@nestjs/passport": "^11.0.5",
    "@nestjs/platform-fastify": "12.1.1",
    "@nestjs/swagger": "^12.0.0",
    "@nestjs/throttler": "^6.4.0",
    "argon2": "^0.44.0",
    "cache-manager": "^7.3.1",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.3",
    "dotenv": "^17.3.1",
    "drizzle-orm": "^0.45.1",
    "fastify": "^5.2.1",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "postgres": "^3.4.5",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.2"
  },
  "devDependencies": {
    "@nestjs/cli": "^11.0.5",
    "@nestjs/schematics": "^11.0.5",
    "@nestjs/testing": "12.1.1",
    "@types/jest": "^29.5.14",
    "@types/node": "^24.10.0",
    "@types/passport-jwt": "^4.0.1",
    "@types/supertest": "^6.0.2",
    "drizzle-kit": "^0.31.9",
    "jest": "^29.7.0",
    "supertest": "^7.1.0",
    "ts-jest": "^29.2.6",
    "ts-loader": "^9.5.2",
    "ts-node": "^10.9.2",
    "tsconfig-paths": "^4.2.0",
    "typescript": "^5.7.3"
  },
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": {
      "^.+\\.(t|j)s$": "ts-jest"
    },
    "collectCoverageFrom": ["**/*.(t|j)s"],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node"
  }
}
```

- [ ] **Step 2: Write `tsconfig.json` and `nest-cli.json`**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2023",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": false,
    "noImplicitAny": false,
    "strictBindCallApply": false,
    "forceConsistentCasingInFileNames": false,
    "noFallthroughCasesInSwitch": false,
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

`nest-cli.json`:
```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true
  }
}
```

- [ ] **Step 3: Write `drizzle.config.ts`, `.env.example`, and `.env`**

`drizzle.config.ts`:
```typescript
import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
dotenv.config();

export default defineConfig({
  schema: './src/database/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/product_management',
  },
});
```

`.env.example`:
```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/product_management
JWT_SECRET=super-secret-jwt-key-for-product-api-2026
JWT_EXPIRES_IN=1h
JWT_REFRESH_SECRET=super-secret-jwt-refresh-key-for-product-api-2026
JWT_REFRESH_EXPIRES_IN=7d
THROTTLE_TTL=60000
THROTTLE_LIMIT=60
```

- [ ] **Step 4: Run `npm install` and verify dependencies install clean**

Run: `npm install`
Expected: Dependencies resolve and node_modules is created without errors.

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.json nest-cli.json drizzle.config.ts .env.example .env package-lock.json
git commit -m "chore: setup project scaffolding and dependencies"
```

---

### Task 2: Database Schemas & Drizzle Module

**Files:**
- Create: `src/database/schema/users.ts`
- Create: `src/database/schema/products.ts`
- Create: `src/database/schema/index.ts`
- Create: `src/database/database.service.ts`
- Create: `src/database/database.module.ts`
- Create: `src/database/migrate.ts`

**Interfaces:**
- Produces:
  - `users`: Drizzle table definition
  - `products`: Drizzle table definition
  - `DRIZZLE_TOKEN`: Dependency injection token for Drizzle Postgres client
  - `DatabaseService`: Service managing connection lifecycle and running migrations

- [ ] **Step 1: Write `src/database/schema/users.ts` and `src/database/schema/products.ts`**

`src/database/schema/users.ts`:
```typescript
import { pgTable, serial, varchar, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  fullName: varchar('full_name', { length: 100 }),
  refreshTokenHash: text('refresh_token_hash'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

`src/database/schema/products.ts`:
```typescript
import { pgTable, serial, varchar, numeric, text, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }).notNull(),
  images: text('images').array().notNull(),
  createdBy: varchar('created_by', { length: 100 }).notNull(),
  createdById: varchar('created_by_id', { length: 50 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedBy: varchar('updated_by', { length: 100 }).notNull(),
  updatedById: varchar('updated_by_id', { length: 50 }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
```

`src/database/schema/index.ts`:
```typescript
export * from './users';
export * from './products';
```

- [ ] **Step 2: Write `src/database/database.service.ts` and `src/database/database.module.ts`**

`src/database/database.service.ts`:
```typescript
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { drizzle, PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from './schema';
import * as path from 'path';

export const DRIZZLE_TOKEN = 'DRIZZLE_DATABASE';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  public client: postgres.Sql;
  public db: PostgresJsDatabase<typeof schema>;

  constructor() {
    const connectionString =
      process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/product_management';
    this.client = postgres(connectionString, { max: 10 });
    this.db = drizzle(this.client, { schema });
  }

  async onModuleInit() {
    this.logger.log('Connecting to PostgreSQL and running migrations...');
    try {
      const migrationsFolder = path.resolve(process.cwd(), 'drizzle');
      await migrate(this.db, { migrationsFolder });
      this.logger.log('Database migrations completed successfully.');
    } catch (err: any) {
      this.logger.warn(`Migration check completed with notice: ${err?.message || err}`);
    }
  }

  async onModuleDestroy() {
    await this.client.end();
  }
}
```

`src/database/database.module.ts`:
```typescript
import { Global, Module } from '@nestjs/common';
import { DatabaseService, DRIZZLE_TOKEN } from './database.service';

@Global()
@Module({
  providers: [
    DatabaseService,
    {
      provide: DRIZZLE_TOKEN,
      useFactory: (databaseService: DatabaseService) => databaseService.db,
      inject: [DatabaseService],
    },
  ],
  exports: [DatabaseService, DRIZZLE_TOKEN],
})
export class DatabaseModule {}
```

- [ ] **Step 3: Generate Drizzle migrations using `npx drizzle-kit generate`**

Run: `npx drizzle-kit generate`
Expected: SQL migration files created under `./drizzle/`.

- [ ] **Step 4: Commit**

```bash
git add src/database drizzle/
git commit -m "feat(database): define schemas, drizzle module, and generate migrations"
```

---

### Task 3: Common Utilities (Date Formatter, Exception Filter, Guards, Decorators)

**Files:**
- Create: `src/common/interceptors/date-format.interceptor.ts`
- Create: `src/common/filters/fastify-http-exception.filter.ts`
- Create: `src/common/decorators/current-user.decorator.ts`
- Create: `src/common/decorators/public.decorator.ts`
- Create: `src/common/guards/jwt-auth.guard.ts`
- Create: `test/date-format.interceptor.spec.ts`

**Interfaces:**
- Produces:
  - `DateFormatInterceptor`: Recursively converts dates to `YYYY-MM-DD HH:mm:ss`
  - `FastifyHttpExceptionFilter`: Formats 400/401/404/500 JSON responses consistently
  - `@CurrentUser()`: Extracts authenticated user from Fastify request
  - `@Public()`: Skips JWT check on public endpoints
  - `JwtAuthGuard`: Enforces Bearer JWT verification

- [ ] **Step 1: Write test for `DateFormatInterceptor`**

`test/date-format.interceptor.spec.ts`:
```typescript
import { of } from 'rxjs';
import { DateFormatInterceptor } from '../src/common/interceptors/date-format.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';

describe('DateFormatInterceptor', () => {
  let interceptor: DateFormatInterceptor;

  beforeEach(() => {
    interceptor = new DateFormatInterceptor();
  });

  it('should format Date objects into YYYY-MM-DD HH:mm:ss strings', (done) => {
    const testDate = new Date('2025-01-01T15:01:04.000Z');
    const mockHandler: CallHandler = {
      handle: () => of({ created_at: testDate, nested: { updated_at: testDate } }),
    };

    interceptor.intercept({} as ExecutionContext, mockHandler).subscribe({
      next: (result) => {
        expect(typeof result.created_at).toBe('string');
        expect(result.created_at).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
        expect(result.nested.updated_at).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
        done();
      },
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest test/date-format.interceptor.spec.ts`
Expected: FAIL (Cannot find module '../src/common/interceptors/date-format.interceptor').

- [ ] **Step 3: Implement `DateFormatInterceptor` and helpers**

`src/common/interceptors/date-format.interceptor.ts`:
```typescript
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

function padZero(num: number): string {
  return num < 10 ? `0${num}` : `${num}`;
}

export function formatDateTime(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return typeof date === 'string' ? date : null;

  const year = d.getFullYear();
  const month = padZero(d.getMonth() + 1);
  const day = padZero(d.getDate());
  const hours = padZero(d.getHours());
  const minutes = padZero(d.getMinutes());
  const seconds = padZero(d.getSeconds());

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function transformDates(data: any): any {
  if (data === null || data === undefined) return data;
  if (data instanceof Date) {
    return formatDateTime(data);
  }
  if (Array.isArray(data)) {
    return data.map((item) => transformDates(item));
  }
  if (typeof data === 'object') {
    const transformed: Record<string, any> = {};
    for (const key of Object.keys(data)) {
      const val = data[key];
      if (val instanceof Date || (typeof val === 'string' && (key.includes('_at') || key.includes('At')))) {
        transformed[key] = formatDateTime(val) || val;
      } else if (typeof val === 'object') {
        transformed[key] = transformDates(val);
      } else {
        transformed[key] = val;
      }
    }
    return transformed;
  }
  return data;
}

@Injectable()
export class DateFormatInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map((data) => transformDates(data)));
  }
}
```

- [ ] **Step 4: Implement `FastifyHttpExceptionFilter`, decorators, and guards**

`src/common/filters/fastify-http-exception.filter.ts`:
```typescript
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';

@Catch()
export class FastifyHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(FastifyHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: any = 'Internal server error';
    let errorName = 'InternalServerError';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        message = (res as any).message || (res as any).error || message;
        errorName = (res as any).error || exception.name;
      } else {
        message = res;
        errorName = exception.name;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      errorName = exception.name;
    }

    this.logger.error(`[${request.method}] ${request.url} - ${status} - ${JSON.stringify(message)}`);

    response.status(status).send({
      statusCode: status,
      message,
      error: errorName,
    });
  }
}
```

`src/common/decorators/current-user.decorator.ts`:
```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthenticatedUser {
  id: number;
  username: string;
  fullName?: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;
    return data && user ? user[data] : user;
  },
);
```

`src/common/decorators/public.decorator.ts`:
```typescript
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

`src/common/guards/jwt-auth.guard.ts`:
```typescript
import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('Authorization token is missing or invalid');
    }
    return user;
  }
}
```

- [ ] **Step 5: Run tests and verify they pass**

Run: `npx jest test/date-format.interceptor.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/common test/date-format.interceptor.spec.ts
git commit -m "feat(common): add date format interceptor, exception filter, decorators, and auth guard"
```

---

### Task 4: Auth Module - DTOs, Argon2 Service & JWT Strategy

**Files:**
- Create: `src/modules/auth/dto/register.dto.ts`
- Create: `src/modules/auth/dto/login.dto.ts`
- Create: `src/modules/auth/dto/refresh-token.dto.ts`
- Create: `src/modules/auth/strategies/jwt.strategy.ts`
- Create: `test/auth-dto.spec.ts`

**Interfaces:**
- Produces:
  - `RegisterDto` with matching validation for password & password_confirmation
  - `LoginDto`
  - `RefreshTokenDto`
  - `JwtStrategy`: Passport strategy extracting Bearer token

- [ ] **Step 1: Write test for RegisterDto validation**

`test/auth-dto.spec.ts`:
```typescript
import { validate } from 'class-validator';
import { RegisterDto } from '../src/modules/auth/dto/register.dto';

describe('RegisterDto', () => {
  it('should fail when password and password_confirmation do not match', async () => {
    const dto = new RegisterDto();
    dto.username = 'john_doe';
    dto.password = 'supersecret';
    dto.password_confirmation = 'differentsecret';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'password_confirmation')).toBe(true);
  });

  it('should pass when password and password_confirmation match', async () => {
    const dto = new RegisterDto();
    dto.username = 'john_doe';
    dto.password = 'supersecret';
    dto.password_confirmation = 'supersecret';

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest test/auth-dto.spec.ts`
Expected: FAIL (Cannot find module '../src/modules/auth/dto/register.dto').

- [ ] **Step 3: Implement Auth DTOs & JWT Strategy**

`src/modules/auth/dto/register.dto.ts`:
```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MinLength, Matches, Validate } from 'class-validator';
import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

@ValidatorConstraint({ name: 'MatchPassword', async: false })
export class MatchPasswordConstraint implements ValidatorConstraintInterface {
  validate(propertyValue: string, args: ValidationArguments) {
    return propertyValue === (args.object as any)['password'];
  }
  defaultMessage() {
    return 'password_confirmation must match password';
  }
}

export class RegisterDto {
  @ApiProperty({ example: 'jhon_doe', description: 'Unique username' })
  @IsString()
  @IsNotEmpty({ message: 'username is required' })
  @MinLength(3, { message: 'username must be at least 3 characters' })
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'username can only contain alphanumeric characters and underscores' })
  username: string;

  @ApiProperty({ example: 'supersecret', description: 'User password (min 6 characters)' })
  @IsString()
  @IsNotEmpty({ message: 'password is required' })
  @MinLength(6, { message: 'password must be at least 6 characters' })
  password: string;

  @ApiProperty({ example: 'supersecret', description: 'Confirmation matching password' })
  @IsString()
  @IsNotEmpty({ message: 'password_confirmation is required' })
  @Validate(MatchPasswordConstraint)
  password_confirmation: string;

  @ApiPropertyOptional({ example: 'Jhon Doe', description: 'Optional user full name' })
  @IsOptional()
  @IsString()
  full_name?: string;
}
```

`src/modules/auth/dto/login.dto.ts`:
```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'jhon_doe', description: 'Username' })
  @IsString()
  @IsNotEmpty({ message: 'username is required' })
  username: string;

  @ApiProperty({ example: 'supersecret', description: 'Password' })
  @IsString()
  @IsNotEmpty({ message: 'password is required' })
  password: string;
}
```

`src/modules/auth/dto/refresh-token.dto.ts`:
```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token' })
  @IsString()
  @IsNotEmpty({ message: 'refresh_token is required' })
  refresh_token: string;
}
```

`src/modules/auth/strategies/jwt.strategy.ts`:
```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { DatabaseService } from '../../../database/database.service';
import { users } from '../../../database/schema/users';
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest test/auth-dto.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/auth/dto/ src/modules/auth/strategies/ test/auth-dto.spec.ts
git commit -m "feat(auth): add register, login, refresh DTOs with validation and JWT strategy"
```

---

### Task 5: Auth Module - Service, Controller & Endpoints

**Files:**
- Create: `src/modules/auth/auth.service.ts`
- Create: `src/modules/auth/auth.controller.ts`
- Create: `src/modules/auth/auth.module.ts`
- Create: `test/auth.service.spec.ts`

**Interfaces:**
- Produces:
  - `POST /api/auth/register` (max 3 req/60s)
  - `POST /api/auth/login` (max 3 req/60s)
  - `POST /api/auth/refresh`
  - Argon2 hashing & verification routines

- [ ] **Step 1: Write unit test for `AuthService`**

`test/auth.service.spec.ts`:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../src/modules/auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService, DRIZZLE_TOKEN } from '../src/database/database.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('mock-token'),
            verifyAsync: jest.fn().mockResolvedValue({ sub: 1, username: 'test' }),
          },
        },
        {
          provide: DRIZZLE_TOKEN,
          useValue: {},
        },
        {
          provide: DatabaseService,
          useValue: { db: {} },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest test/auth.service.spec.ts`
Expected: FAIL (Cannot find module '../src/modules/auth/auth.service').

- [ ] **Step 3: Implement `AuthService`, `AuthController`, and `AuthModule`**

`src/modules/auth/auth.service.ts`:
```typescript
import { Injectable, BadRequestException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { users } from '../../database/schema/users';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    // Check if username already exists
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
```

`src/modules/auth/auth.controller.ts`:
```typescript
import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Authentication')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('register')
  @ApiOperation({ summary: 'Register a new user (Max 3 req/60s)' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 409, description: 'Username already exists' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user and get tokens (Max 3 req/60s)' })
  @ApiResponse({ status: 200, description: 'Authentication successful' })
  @ApiResponse({ status: 401, description: 'Invalid username or password' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({ status: 200, description: 'Tokens successfully refreshed' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto);
  }
}
```

`src/modules/auth/auth.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

- [ ] **Step 4: Run unit test to verify it passes**

Run: `npx jest test/auth.service.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/auth/ test/auth.service.spec.ts
git commit -m "feat(auth): implement AuthService and AuthController with register, login, refresh"
```

---

### Task 6: Products Module - DTOs & Validation

**Files:**
- Create: `src/modules/products/dto/create-product.dto.ts`
- Create: `src/modules/products/dto/update-product.dto.ts`
- Create: `src/modules/products/dto/query-product.dto.ts`
- Create: `test/product-dto.spec.ts`

**Interfaces:**
- Produces:
  - `CreateProductDto`: Validates title, price, category, images (min 1)
  - `UpdateProductDto`: Partial validation
  - `QueryProductDto`: Pagination and filters (search, category, page, limit)

- [ ] **Step 1: Write test for Product DTO validations**

`test/product-dto.spec.ts`:
```typescript
import { validate } from 'class-validator';
import { CreateProductDto } from '../src/modules/products/dto/create-product.dto';

describe('CreateProductDto', () => {
  it('should fail when images array is empty', async () => {
    const dto = new CreateProductDto();
    dto.title = 'T-Shirt';
    dto.price = 99.99;
    dto.category = 'Clothes';
    dto.images = [];

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'images')).toBe(true);
  });

  it('should pass with valid data', async () => {
    const dto = new CreateProductDto();
    dto.title = 'T-Shirt';
    dto.price = 99.99;
    dto.category = 'Clothes';
    dto.images = ['https://placeimg.com/640/480/any'];

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest test/product-dto.spec.ts`
Expected: FAIL (Cannot find module '../src/modules/products/dto/create-product.dto').

- [ ] **Step 3: Implement Product DTOs**

`src/modules/products/dto/create-product.dto.ts`:
```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsArray, ArrayMinSize, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty({ example: 'Awesome T-Shirt', description: 'Product title' })
  @IsString()
  @IsNotEmpty({ message: 'title is required' })
  title: string;

  @ApiProperty({ example: 99.99, description: 'Product price' })
  @Type(() => Number)
  @IsNumber({}, { message: 'price must be a valid number' })
  @Min(0.01, { message: 'price must be greater than zero' })
  price: number;

  @ApiPropertyOptional({ example: 'High-quality cotton t-shirt', description: 'Product description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'Clothes', description: 'Product category' })
  @IsString()
  @IsNotEmpty({ message: 'category is required' })
  category: string;

  @ApiProperty({
    example: ['https://placeimg.com/640/480/any'],
    description: 'Array of image URLs (minimum 1 item)',
    type: [String],
  })
  @IsArray({ message: 'images must be an array' })
  @ArrayMinSize(1, { message: 'images must contain at least 1 item' })
  @IsString({ each: true, message: 'each image item must be a string URL' })
  images: string[];
}
```

`src/modules/products/dto/update-product.dto.ts`:
```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, IsArray, ArrayMinSize, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'Updated T-Shirt' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 109.99 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'price must be a valid number' })
  @Min(0.01, { message: 'price must be greater than zero' })
  price?: number;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Apparel' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: ['https://placeimg.com/640/480/updated'], type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'images must contain at least 1 item' })
  @IsString({ each: true })
  images?: string[];
}
```

`src/modules/products/dto/query-product.dto.ts`:
```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryProductDto {
  @ApiPropertyOptional({ example: 'T-Shirt', description: 'Search keyword for product title' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'Clothes', description: 'Filter by category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 1, default: 1, description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10, description: 'Number of items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest test/product-dto.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/products/dto/ test/product-dto.spec.ts
git commit -m "feat(products): create CreateProductDto, UpdateProductDto, and QueryProductDto"
```

---

### Task 7: Products Module - Service, Drizzle Queries & Caching

**Files:**
- Create: `src/modules/products/products.service.ts`
- Create: `test/products.service.spec.ts`

**Interfaces:**
- Consumes: `DatabaseService`, `CACHE_MANAGER`
- Produces:
  - `findAll(query: QueryProductDto)`
  - `findOne(id: number)`
  - `create(dto: CreateProductDto, user: AuthenticatedUser)`
  - `update(id: number, dto: UpdateProductDto, user: AuthenticatedUser)`
  - `remove(id: number)`
  - Cache management & eviction

- [ ] **Step 1: Write unit test for `ProductsService`**

`test/products.service.spec.ts`:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { NotFoundException } from '@nestjs/common';
import { ProductsService } from '../src/modules/products/products.service';
import { DatabaseService } from '../src/database/database.service';

describe('ProductsService', () => {
  let service: ProductsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: DatabaseService,
          useValue: { db: {} },
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            reset: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest test/products.service.spec.ts`
Expected: FAIL (Cannot find module '../src/modules/products/products.service').

- [ ] **Step 3: Implement `ProductsService` with caching & invalidation**

`src/modules/products/products.service.ts`:
```typescript
import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { and, desc, eq, ilike, sql } from 'drizzle-orm';
import { DatabaseService } from '../../database/database.service';
import { products, Product } from '../../database/schema/products';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class ProductsService {
  constructor(
    private readonly databaseService: DatabaseService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  private getCacheKey(query: QueryProductDto): string {
    return `products_list:${query.search || ''}:${query.category || ''}:${query.page || 1}:${query.limit || 10}`;
  }

  private async invalidateCache(productId?: number) {
    if (productId) {
      await this.cacheManager.del(`product_detail:${productId}`);
    }
    // Clear list cache
    try {
      if (typeof (this.cacheManager as any).reset === 'function') {
        await (this.cacheManager as any).reset();
      }
    } catch {
      // Continue safely if reset is not supported
    }
  }

  private formatProductOutput(p: any) {
    return {
      id: p.id,
      title: p.title,
      price: typeof p.price === 'string' ? parseFloat(p.price) : p.price,
      description: p.description,
      category: p.category,
      images: p.images,
      created_at: p.createdAt,
      created_by: p.createdBy,
      created_by_id: p.createdById,
      updated_at: p.updatedAt,
      updated_by: p.updatedBy,
      updated_by_id: p.updatedById,
    };
  }

  async findAll(query: QueryProductDto) {
    const cacheKey = this.getCacheKey(query);
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 10;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (query.search) {
      conditions.push(ilike(products.title, `%${query.search}%`));
    }
    if (query.category) {
      conditions.push(eq(products.category, query.category));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await this.databaseService.db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(products)
      .where(whereClause);

    const total = totalResult?.count || 0;

    const records = await this.databaseService.db
      .select()
      .from(products)
      .where(whereClause)
      .orderBy(desc(products.id))
      .limit(limit)
      .offset(offset);

    const result = {
      data: records.map((r) => this.formatProductOutput(r)),
      meta: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit) || 1,
      },
    };

    await this.cacheManager.set(cacheKey, result, 60000);
    return result;
  }

  async findOne(id: number) {
    const cacheKey = `product_detail:${id}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      return cached;
    }

    const [product] = await this.databaseService.db
      .select()
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    const formatted = this.formatProductOutput(product);
    await this.cacheManager.set(cacheKey, formatted, 60000);
    return formatted;
  }

  async create(dto: CreateProductDto, user: AuthenticatedUser) {
    const creatorName = user.fullName || user.username;
    const creatorId = String(user.id);

    const [newProduct] = await this.databaseService.db
      .insert(products)
      .values({
        title: dto.title,
        price: String(dto.price),
        description: dto.description || null,
        category: dto.category,
        images: dto.images,
        createdBy: creatorName,
        createdById: creatorId,
        updatedBy: creatorName,
        updatedById: creatorId,
      })
      .returning();

    await this.invalidateCache();
    return this.formatProductOutput(newProduct);
  }

  async update(id: number, dto: UpdateProductDto, user: AuthenticatedUser) {
    const [existing] = await this.databaseService.db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!existing) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    const updaterName = user.fullName || user.username;
    const updaterId = String(user.id);

    const updateValues: Record<string, any> = {
      updatedBy: updaterName,
      updatedById: updaterId,
      updatedAt: new Date(),
    };

    if (dto.title !== undefined) updateValues.title = dto.title;
    if (dto.price !== undefined) updateValues.price = String(dto.price);
    if (dto.description !== undefined) updateValues.description = dto.description;
    if (dto.category !== undefined) updateValues.category = dto.category;
    if (dto.images !== undefined) updateValues.images = dto.images;

    const [updatedProduct] = await this.databaseService.db
      .update(products)
      .set(updateValues)
      .where(eq(products.id, id))
      .returning();

    await this.invalidateCache(id);
    return this.formatProductOutput(updatedProduct);
  }

  async remove(id: number) {
    const [existing] = await this.databaseService.db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, id))
      .limit(1);

    if (!existing) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    await this.databaseService.db.delete(products).where(eq(products.id, id));
    await this.invalidateCache(id);

    return {
      statusCode: 200,
      message: `Product with ID ${id} successfully deleted`,
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest test/products.service.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/products/products.service.ts test/products.service.spec.ts
git commit -m "feat(products): implement ProductsService with Drizzle ORM and cache invalidation"
```

---

### Task 8: Products Module - Controller & Route Handlers

**Files:**
- Create: `src/modules/products/products.controller.ts`
- Create: `src/modules/products/products.module.ts`
- Create: `test/products.controller.spec.ts`

**Interfaces:**
- Produces:
  - `GET /api/products` (Public, cached)
  - `GET /api/products/:id` (Public, cached, 404 on missing)
  - `POST /api/products` (Bearer Auth, Rate limit: 1x/5s)
  - `PUT /api/products/:id` (Bearer Auth, Rate limit: 1x/5s)
  - `DELETE /api/products/:id` (Bearer Auth, Rate limit: 1x/5s)

- [ ] **Step 1: Write controller test**

`test/products.controller.spec.ts`:
```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from '../src/modules/products/products.controller';
import { ProductsService } from '../src/modules/products/products.service';

describe('ProductsController', () => {
  let controller: ProductsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: {
            findAll: jest.fn().mockResolvedValue({ data: [], meta: {} }),
            findOne: jest.fn().mockResolvedValue({ id: 1 }),
            create: jest.fn().mockResolvedValue({ id: 1 }),
            update: jest.fn().mockResolvedValue({ id: 1 }),
            remove: jest.fn().mockResolvedValue({ statusCode: 200 }),
          },
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest test/products.controller.spec.ts`
Expected: FAIL (Cannot find module '../src/modules/products/products.controller').

- [ ] **Step 3: Implement `ProductsController` and `ProductsModule`**

`src/modules/products/products.controller.ts`:
```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Products')
@Controller('api/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all products with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
  async findAll(@Query() query: QueryProductDto) {
    return this.productsService.findAll(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a single product by ID' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, description: 'Product found' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Throttle({ default: { limit: 1, ttl: 5000 } })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new product (Authorized, max 1 req/5s)' })
  @ApiResponse({ status: 201, description: 'Product successfully created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() dto: CreateProductDto, @CurrentUser() user: AuthenticatedUser) {
    return this.productsService.create(dto, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Throttle({ default: { limit: 1, ttl: 5000 } })
  @Put(':id')
  @ApiOperation({ summary: 'Update an existing product (Authorized, max 1 req/5s)' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, description: 'Product successfully updated' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.update(id, dto, user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Throttle({ default: { limit: 1, ttl: 5000 } })
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a product by ID (Authorized, max 1 req/5s)' })
  @ApiParam({ name: 'id', example: 1 })
  @ApiResponse({ status: 200, description: 'Product successfully deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.remove(id);
  }
}
```

`src/modules/products/products.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest test/products.controller.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/products/ test/products.controller.spec.ts
git commit -m "feat(products): implement ProductsController with auth guards and throttling"
```

---

### Task 9: App Module Assembly, Fastify Bootstrap, CORS & Swagger OpenAPI

**Files:**
- Create: `src/app.module.ts`
- Create: `src/main.ts`

**Interfaces:**
- Produces:
  - Working Fastify application server bound to `0.0.0.0:3000`
  - Global CORS setup
  - Swagger documentation UI at `http://localhost:3000/api/docs`
  - Global ValidationPipe, DateFormatInterceptor, and FastifyHttpExceptionFilter

- [ ] **Step 1: Implement `src/app.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProductsModule } from './modules/products/products.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { DateFormatInterceptor } from './common/interceptors/date-format.interceptor';
import { FastifyHttpExceptionFilter } from './common/filters/fastify-http-exception.filter';

@Module({
  imports: [
    CacheModule.register({
      isGlobal: true,
      ttl: 60000,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    DatabaseModule,
    AuthModule,
    ProductsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: DateFormatInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: FastifyHttpExceptionFilter,
    },
  ],
})
export class AppModule {}
```

- [ ] **Step 2: Implement `src/main.ts` with Fastify adapter, CORS, and Swagger**

```typescript
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
  );

  // Global CORS configuration - enables all origins
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  });

  // Global input validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger OpenAPI Documentation Configuration
  const config = new DocumentBuilder()
    .setTitle('Product Management & Authentication API')
    .setDescription(
      'Robust backend REST API for product management and user authentication, built with NestJS 12.1.1, Fastify, Drizzle ORM, and PostgreSQL 18.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your Bearer authentication_token',
        in: 'header',
      },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  await app.listen(port, '0.0.0.0');

  logger.log(`Server is running at: http://localhost:${port}`);
  logger.log(`Swagger documentation available at: http://localhost:${port}/api/docs`);
}

bootstrap();
```

- [ ] **Step 3: Run `npm run build` to verify compilation**

Run: `npm run build`
Expected: NestJS TypeScript compilation succeeds with zero errors, producing `dist/`.

- [ ] **Step 4: Commit**

```bash
git add src/app.module.ts src/main.ts
git commit -m "feat: setup Fastify bootstrap, CORS, Swagger documentation, and AppModule"
```

---

### Task 10: Dockerfile, Docker Compose & End-to-End Container Verification

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`
- Create: `docker-compose.yml`
- Create: `README.md`

**Interfaces:**
- Produces:
  - Multi-stage Docker build with `node:24-alpine`
  - Automated PostgreSQL 18 container with healthcheck
  - Docker Compose service orchestration

- [ ] **Step 1: Write `.dockerignore`**

```
node_modules
dist
.git
.env
npm-debug.log
Dockerfile*
docker-compose*
README.md
docs
test
```

- [ ] **Step 2: Write multi-stage `Dockerfile` with Node 24**

```dockerfile
# Stage 1: Build stage
FROM node:24-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production runner stage
FROM node:24-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/drizzle ./drizzle

EXPOSE 3000

CMD ["node", "dist/main"]
```

- [ ] **Step 3: Write `docker-compose.yml` with PostgreSQL 18 & NestJS API**

```yaml
version: '3.8'

services:
  db:
    image: postgres:18
    container_name: product_management_db
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgrespassword
      POSTGRES_DB: product_management
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d product_management"]
      interval: 5s
      timeout: 5s
      retries: 5

  api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: product_management_api
    restart: always
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      PORT: 3000
      DATABASE_URL: postgresql://postgres:postgrespassword@db:5432/product_management
      JWT_SECRET: super-secret-jwt-key-for-product-api-2026
      JWT_EXPIRES_IN: 1h
      JWT_REFRESH_SECRET: super-secret-jwt-refresh-key-for-product-api-2026
      JWT_REFRESH_EXPIRES_IN: 7d
    depends_on:
      db:
        condition: service_healthy

volumes:
  postgres_data:
```

- [ ] **Step 4: Write `README.md` with instructions, architecture, and curl examples**

```markdown
# Product Management & Authentication REST API

Production-ready Backend REST API built with NestJS 12.1.1, Fastify, PostgreSQL 18, Drizzle ORM, Argon2, and Docker.

## Tech Stack
- **Framework**: NestJS 12.1.1
- **HTTP Engine**: Fastify
- **Runtime**: Node.js 24 (`node:24-alpine`)
- **Database**: PostgreSQL 18 (`postgres:18`)
- **ORM**: Drizzle ORM
- **Password Security**: Argon2
- **Documentation**: Swagger OpenAPI at `/api/docs`
- **Containerization**: Docker Compose

## Quick Start with Docker Desktop
Run the complete stack with one command:
```bash
docker compose up --build
```
The API will be live at:
- **API URL**: `http://localhost:3000`
- **Swagger Documentation**: `http://localhost:3000/api/docs`

## Endpoints Summary
### Auth (`/api/auth`)
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and receive `authentication_token` & `refresh_token`
- `POST /api/auth/refresh` - Refresh access tokens

### Products (`/api/products`)
- `GET /api/products` - List all products with filtering (`?search=`, `?category=`) and pagination (`?page=`, `?limit=`)
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create product (Bearer Auth required)
- `PUT /api/products/:id` - Update product by ID (Bearer Auth required)
- `DELETE /api/products/:id` - Delete product by ID (Bearer Auth required)
```

- [ ] **Step 5: Test Docker build and execution**

Run: `docker compose up --build -d`
Verify:
1. `docker compose ps` shows both `db` and `api` running and healthy.
2. `curl http://localhost:3000/api/products` returns 200 with `{ "data": [], "meta": ... }`.
3. `curl http://localhost:3000/api/docs` returns 200 (Swagger UI).
4. Run integration flow (Register user -> Login user -> Create product -> Fetch products -> Update -> Delete).

- [ ] **Step 6: Commit**

```bash
git add Dockerfile .dockerignore docker-compose.yml README.md
git commit -m "feat(docker): add Dockerfile, docker-compose.yml, and README"
```
