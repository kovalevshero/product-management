# Backend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memastikan backend dapat dimigrasikan, diuji, dan dijalankan secara berulang dengan konfigurasi serta auth yang memiliki kontrak jelas.

**Architecture:** Pisahkan factory aplikasi dari entrypoint, validasi environment, dan jalankan migrasi eksplisit. Test HTTP memakai Fastify inject dengan PostgreSQL test nyata. Tidak menambah fitur inventori pada tahap ini.

**Tech Stack:** Stack yang ada; gunakan Jest, Drizzle, Fastify inject, dan GitHub Actions tanpa menambah library auth baru.

**Spec:** [Desain](../specs/2026-10-05-inventory-portfolio-design.md), bagian baseline, batasan global, dan autentikasi/operasional.

## Global Constraints

- Branch kerja `experiment`; jangan push, merge, atau rebase ke `main` tanpa instruksi terpisah.
- Pertahankan Node.js 24, NestJS 12.1.1, Fastify, PostgreSQL 18, dan Drizzle; tidak upgrade major version dalam milestone ini.
- Tidak menggunakan database development/production untuk test; nama database test wajib berakhiran `_test`.
- Default pagination `page=1`, `limit=10`, maksimum `limit=100`; nilai di luar batas ditolak dengan 400.
- Timestamp technical test tetap `YYYY-MM-DD HH:mm:ss`; formatter menggunakan UTC secara eksplisit dan dokumentasi menyatakan UTC.
- Seluruh batasan global spec berlaku. Code snippets di bawah adalah assertion target, belum hasil test.

## Review Focus

- Database test salah target ditolak sebelum migrasi/reset (task 1).
- Secret hilang atau origin wildcard dengan credentials tidak menyebabkan startup diam-diam tidak aman (task 2).
- Dua refresh dalam detik yang sama menghasilkan satu sukses dan jti berbeda (task 3).
- Database putus/SQL error tidak membocorkan detail internal pada API (task 4).
- Cache read lama yang selesai sesudah update tidak memulihkan data lama (task 5).

## Struktur file dan interface test

`src/bootstrap.ts` memiliki `createApplication(): Promise<NestFastifyApplication>`; `src/main.ts` hanya memanggil factory dan listen. `test/helpers/test-context.ts` menghasilkan `TestContext = { app: NestFastifyApplication; api: FastifyInstance; db: DatabaseService['db']; reset(): Promise<void>; close(): Promise<void> }` melalui `createTestContext(): Promise<TestContext>`. Set env test sebelum dynamic import modul aplikasi; `api = app.getHttpAdapter().getInstance()`.

`reset()` membersihkan tabel hanya setelah guard nama database dan hanya pada database test. Serial execution `--runInBand`; gunakan beforeEach reset dan afterAll close. Test concurrency membuat beberapa koneksi/request dalam satu kasus, bukan menjalankan suite paralel. Stub throttler hanya pada suite yang mengisolasi transaksi; suite rate-limit tetap memakai guard asli.

Fixture config `validEnv` pada unit test adalah `{ NODE_ENV: 'test', DATABASE_URL: 'postgresql://postgres:test@localhost:5433/product_management_test', JWT_SECRET: 'a'.repeat(32), JWT_REFRESH_SECRET: 'b'.repeat(32), CORS_ORIGINS: '*', STORE_CURRENCY: 'IDR' }`. Nilai ini hanya credential sintetis untuk test; integration menerima URL test dari environment. Setiap snippet assertion memakai setup task yang disebutkan, bukan variabel global aplikasi.

### Task 1: Harness dan acceptance baseline

Files: create `src/bootstrap.ts`, `test/helpers/test-context.ts`, `test/jest-e2e.json`, `test/api.e2e-spec.ts`; modify `src/main.ts`, `package.json`, `test-e2e.mjs`; update import `.js` di test jika baseline membuktikan masalah ESM.

Interfaces: consumes `AppModule`; produces `createApplication()` dan `createTestContext()` di atas. Tambah script `test:integration` untuk config `test/jest-e2e.json`; config itu hanya menemukan `*.e2e-spec.ts` dan `*.integration-spec.ts`, config unit hanya `*.spec.ts`.

- [ ] Catat `npm ci`, `npm run build`, `npm test -- --runInBand` dan exit code aktual; perbaiki kegagalan baseline yang terbukti, tanpa menyembunyikan test yang gagal.
- [ ] Tulis failing tests HTTP untuk register, duplicate username 409, login salah 401, produk invalid 400, detail hilang 404, auth hilang 401, filter/pagination, dan rate limit sesuai decorator sekarang. Contoh assertion:

```ts
it('rejects product mutation without credentials', async () => {
  const r = await ctx.api.inject({ method: 'POST', url: '/api/products', payload: {} });
  expect(r.statusCode).toBe(401);
});
```

- [ ] Tulis `test/test-context.spec.ts`: `assertTestDatabaseUrl('postgres://x:y@localhost/product_management')` melempar; `.../product_management_test` diterima. Fungsi diekspor dari helper dan memeriksa pathname hasil URL, bukan substring.
- [ ] Jalankan `npm run test:integration -- --runInBand`; pastikan RED terkait harness/assertion baru, bukan database yang tidak disiapkan.
- [ ] Implementasikan factory dan helper, ubah skrip cetak E2E menjadi pemanggil test assertion resmi, pisahkan discovery unit/integration.
- [ ] Verifikasi `npm test -- --runInBand`, `npm run test:integration -- --runInBand`, dan `npm run build`; commit task bila eksekusi sudah diotorisasi, tanpa push.

### Task 2: Environment, error boundary, dan kontrak input

Files: create `src/config/environment.ts`, `test/environment.spec.ts`, `test/error-boundary.e2e-spec.ts`; modify `src/bootstrap.ts`, `src/modules/auth/auth.service.ts`, `src/modules/auth/strategies/jwt.strategy.ts`, `src/database/database.service.ts`, `src/common/filters/fastify-http-exception.filter.ts`, `src/common/interceptors/date-format.interceptor.ts`, `src/modules/products/dto/query-product.dto.ts`, `.env.example`, `docker-compose.yml`, DTO dan test yang terpengaruh.

Interfaces: produces `loadEnvironment(env: NodeJS.ProcessEnv): AppEnvironment` dengan `databaseUrl`, `jwtSecret`, `jwtRefreshSecret`, `accessTtl: '15m'`, `refreshTtl: '7d'`, `corsOrigins: '*' | string[]`, `currency: 'IDR'`. Muat dotenv sebelum validasi pada local entrypoint; environment test disiapkan oleh helper. Hindari validasi hanya saat import module.

- [ ] Tulis failing assertions berikut serta secret pendek/sama, URL invalid, input page/limit di luar batas, harga lebih dari dua digit desimal, array images yang bukan URL HTTP(S), dan username duplicate concurrent.

```ts
it('requires a database and two independent secrets', () => {
  expect(() => loadEnvironment({})).toThrow();
  expect(() => loadEnvironment({ ...validEnv, JWT_REFRESH_SECRET: validEnv.JWT_SECRET })).toThrow();
});
```

- [ ] Jalankan `npm test -- --runInBand test/environment.spec.ts test/product-dto.spec.ts` dan E2E error-boundary; catat RED pada aturan baru.
- [ ] Implementasikan parser, hilangkan fallback secret/database di runtime, set TTL konsisten, CORS wildcard tanpa credentials atau production allowlist. Batasi pagination dan panjang field sesuai schema; petakan username unique violation ke 409 tanpa mengembalikan pesan SQL. Pastikan unexpected error menjadi `{ statusCode: 500, message: 'Internal server error', error: 'InternalServerError' }` dan logger tidak mencetak password/token.
- [ ] Tambahkan test UTC yang tetap sama ketika `TZ` berubah dan ubah formatter ke getter UTC; update Swagger/README di task 5.
- [ ] Run unit + E2E terkait + build sampai PASS; commit task tanpa push jika diotorisasi.

### Task 3: Rotasi refresh dan logout satu sesi

Files: modify `src/modules/auth/auth.service.ts`, `src/modules/auth/auth.controller.ts`, `src/modules/auth/dto/refresh-token.dto.ts`, `test/auth.service.spec.ts`; create `test/auth-session.e2e-spec.ts`.

Interfaces: pertahankan `login(dto)`/`refreshTokens(dto)` dengan `{ authentication_token: string; refresh_token: string }`; produces `logout(userId: number): Promise<void>`. JWT access/refresh masing-masing jti UUID baru. Logout endpoint 204. Access lama tetap valid maksimum 15 menit; jangan mengklaim langsung dicabut.

- [ ] Tulis assertions refresh lama ditolak sesudah rotasi/logout, token expired ditolak, login menghasilkan token berbeda walau waktunya sama, serta dua refresh bersamaan dengan token sama:

```ts
const responses = await Promise.all([1, 2].map(() => ctx.api.inject({
  method: 'POST', url: '/api/auth/refresh', payload: { refresh_token: token },
})));
expect(responses.map(r => r.statusCode).sort()).toEqual([200, 401]);
```

- [ ] Run `npm run test:integration -- --runInBand test/auth-session.e2e-spec.ts`; RED harus menunjukkan race atau kontrak logout belum tersedia.
- [ ] Implementasikan jti dan compare-and-swap update `WHERE users.id = id AND refresh_token_hash = previousHash`, cek returning satu baris setelah verifikasi Argon2 dan pembuatan hash baru. Logout mengubah hash menjadi null. Login mengganti sesi sebelumnya; error database tidak disamarkan sebagai invalid token 401.
- [ ] Run unit auth + E2E + build sampai PASS; dokumentasikan kebijakan satu sesi dan access expiry; commit tanpa push jika diotorisasi.

### Task 4: Migrasi eksplisit, health, dan clean boot

Files: create `src/database/migrate.ts`, `src/database/migrations.ts`, `src/health/health.module.ts`, `src/health/health.controller.ts`, `src/health/health.service.ts`, `test/database-lifecycle.integration-spec.ts`, `test/health.e2e-spec.ts`; modify `src/database/database.service.ts`, `src/app.module.ts`, `package.json`, `docker-compose.yml`, `Dockerfile`.

Interfaces: produces `runMigrations(databaseUrl: string): Promise<void>`, `assertSchemaReady(databaseUrl: string): Promise<void>`, `HealthService.isDatabaseReady(): Promise<boolean>`. `assertSchemaReady` membandingkan journal migration yang dibundel dengan ledger Drizzle, bukan hanya koneksi SELECT 1. Migrator menutup koneksi baik sukses maupun error dan exit nonzero jika gagal.

- [ ] Tulis failing test clean database -> migrasi -> startup; migration kedua tidak mengubah data; schema tertinggal menggagalkan startup; migration error nonzero; live 200 dan ready 503 ketika database tidak bisa diquery.

```ts
expect((await ctx.api.inject('/api/health/live')).statusCode).toBe(200);
expect((await ctx.api.inject('/api/health/ready')).statusCode).toBe(200);
```

- [ ] Run integration lifecycle dan health; pastikan RED terjadi untuk entrypoint/schema check baru.
- [ ] Implementasikan migration runner, readiness schema saat startup, dan Compose `migrate` one-shot (`restart: 'no'`) dengan dependency db healthy -> migrate completed successfully -> api. Gunakan image build API yang sama untuk migrator; `db:migrate` menjalankan file dist yang benar-benar dibangun.
- [ ] Verifikasi pada project Compose test terpisah: `docker compose -p inventory_test -f docker-compose.test.yml up --build --wait` setelah task 5 menyediakan file itu. Untuk task ini gunakan database test lokal, build dan `npm run db:migrate`; jangan memakai volume development sebagai clean-boot test.
- [ ] Run unit + integration + build sampai PASS; commit tanpa push jika diotorisasi.

### Task 5: Cache yang konsisten, CI, dan dokumentasi reproduksi

Files: create `src/modules/products/product-cache.service.ts`, `test/product-cache.spec.ts`, `docker-compose.test.yml`, `.github/workflows/ci.yml`; modify `src/modules/products/products.service.ts`, `src/modules/products/products.module.ts`, `README.md`, `package.json`.

Interfaces: produces `ProductCacheService.getOrLoad<T>(key: string, load: () => Promise<T>): Promise<T>`, `invalidate(): void`. Generation diambil sebelum await load; mutasi menaikkan generation, sehingga hasil baca lama disimpan pada key generation lama. TTL 60000 ms; perubahan gagal tidak invalidasi. Satu instance saja.

- [ ] Tulis failing test controlled promise: read mulai pada generation A, mutation invalidates ke B, read A selesai, read berikut tetap mendapatkan nilai B.

```ts
expect(await cache.getOrLoad('detail:1', async () => updatedProduct)).toEqual(updatedProduct);
```

- [ ] Run `npm test -- --runInBand test/product-cache.spec.ts`; catat RED, lalu implementasikan service dan injeksi. Tidak menghapus cache global yang dimiliki modul lain.
- [ ] Buat Compose test PostgreSQL 18 dengan database `product_management_test`, port host 5433, kredensial test, volume terpisah, migrator dan API test. Workflow Node 24 memakai PostgreSQL service, env test, `npm ci`, build, migrate, unit, integration, dan artifact coverage. Gunakan secrets placeholder hanya untuk deployment, bukan secret nyata di Git.
- [ ] Perbarui README: command clean boot, migration sebelum start lokal, test unit/integration, env, UTC, CORS, logout, batas single-instance, dan versi test yang berbeda dari demo. Hindari klaim production-ready tanpa bukti.
- [ ] Verifikasi `npm run build`, unit, integration, `docker compose -f docker-compose.yml config`, `docker compose -p inventory_test -f docker-compose.test.yml up --build --wait`, serta smoke HTTP pada API test. Konfirmasi CI aktual setelah ada push yang diotorisasi; workflow lokal tidak membuktikan CI remote sudah lulus.
- [ ] Commit tanpa push jika diotorisasi dan catat hasil M1 di roadmap. M2 hanya dimulai sesudah semua acceptance M1 terpenuhi.
