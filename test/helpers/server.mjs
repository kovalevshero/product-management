import { Test } from '@nestjs/testing';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { ThrottlerStorage } from '@nestjs/throttler';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { AppModule } from '../../dist/app.module.js';
import { configureApplication } from '../../dist/bootstrap.js';
import { runMigrations } from '../../dist/database/migrations.js';

let app;
try {
  if (!new URL(process.env.DATABASE_URL).pathname.endsWith('_test')) throw new Error('Test database required');
  await runMigrations(process.env.DATABASE_URL);
  let builder = Test.createTestingModule({ imports: [AppModule] });
  if (process.env.TEST_THROTTLE !== 'true') {
    builder = builder.overrideProvider(ThrottlerStorage).useValue({ increment: async () => ({
      totalHits: 1, timeToExpire: 60, isBlocked: false, timeToBlockExpire: 0,
    }) });
  }
  const module = await builder.compile();
  app = module.createNestApplication(new FastifyAdapter(), { logger: false });
  configureApplication(app);
  await app.listen(0, '127.0.0.1');
  process.send({ ready: true, port: app.getHttpAdapter().getInstance().server.address().port });
  process.on('message', async ({ id, action }) => {
    try {
      if (action === 'reset') await app.get(CACHE_MANAGER).clear();
      if (action === 'close') await app.close();
      process.send({ id, ok: true });
      if (action === 'close') process.disconnect();
    } catch { process.send({ id, ok: false }); }
  });
} catch {
  process.send({ ready: false });
  await app?.close();
  process.exitCode = 1;
  process.disconnect();
}
