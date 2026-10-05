export interface AppEnvironment {
  databaseUrl: string;
  jwtSecret: string;
  jwtRefreshSecret: string;
  accessTtl: '15m';
  refreshTtl: '7d';
  corsOrigins: '*' | string[];
  currency: 'IDR';
  port: number;
}

export function loadEnvironment(env: NodeJS.ProcessEnv): AppEnvironment {
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required');
  const database = new URL(databaseUrl);
  if (!['postgres:', 'postgresql:'].includes(database.protocol) || database.pathname.length <= 1) {
    throw new Error('DATABASE_URL must identify a PostgreSQL database');
  }
  const jwtSecret = env.JWT_SECRET;
  const jwtRefreshSecret = env.JWT_REFRESH_SECRET;
  if (!jwtSecret || !jwtRefreshSecret || jwtSecret.length < 32 || jwtRefreshSecret.length < 32 || jwtSecret === jwtRefreshSecret) {
    throw new Error('JWT secrets must be independent and at least 32 characters');
  }
  const origins = env.CORS_ORIGINS || '*';
  if (env.NODE_ENV === 'production' && origins === '*') throw new Error('Production requires a CORS origin allowlist');
  const corsOrigins = origins === '*' ? '*' : origins.split(',').map(origin => {
    const value = origin.trim();
    const parsed = new URL(value);
    if (!['https:', 'http:'].includes(parsed.protocol) || parsed.origin !== value) throw new Error('Invalid CORS origin');
    return value;
  });
  const port = Number(env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  if (env.STORE_CURRENCY && env.STORE_CURRENCY !== 'IDR') throw new Error('This store uses IDR');
  return { databaseUrl, jwtSecret, jwtRefreshSecret, accessTtl: '15m', refreshTtl: '7d', corsOrigins, currency: 'IDR', port };
}
