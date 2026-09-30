import { jest, describe, it, expect, beforeEach } from '@jest/globals';
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
            signAsync: jest.fn<any>().mockResolvedValue('mock-token'),
            verifyAsync: jest.fn<any>().mockResolvedValue({ sub: 1, username: 'test' }),
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
