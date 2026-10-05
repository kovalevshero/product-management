# Inventory MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membuat alur katalog, SKU, pencatatan stok, role, dan audit untuk satu toko yang dapat didemokan end-to-end.

**Architecture:** Tambahkan modul users, audit, dan inventory di backend yang ada. Saldo dan ledger diperbarui dalam transaksi PostgreSQL yang sama; katalog publik tidak mengekspos data inventori. Produk diarsipkan sehingga riwayat tetap tersedia.

**Tech Stack:** Stack M1; Drizzle migrations dan PostgreSQL row/advisory locks. Tidak menambah Redis atau frontend.

**Spec:** [Desain](../specs/2026-10-05-inventory-portfolio-design.md), bagian model data, matriks izin, endpoint, dan acceptance M2.

## Global Constraints

- Branch kerja `experiment`; jangan push, merge, atau rebase ke `main` tanpa instruksi terpisah.
- Bentuk aplikasi modular monolith; PostgreSQL adalah sumber kebenaran stok.
- Setiap perubahan schema menggunakan migrasi baru; tidak mengedit migration yang sudah diterapkan.
- Default pagination `page=1`, `limit=10`, maksimum `limit=100`; nilai di luar batas ditolak dengan 400.
- `GET /api/products` dan `GET /api/products/:id` tetap publik; data stok, audit, dan anggota hanya untuk pengguna berizin.
- Tidak menggunakan database development/production untuk test; nama database test wajib berakhiran `_test`.
- Seluruh batasan global spec berlaku; M1 harus sudah lulus. Code snippets adalah assertion target, belum hasil test.

## Review Focus

- Registrasi menyisipkan role dan dua admin saling menurunkan role (task 1).
- Audit gagal atau input memuat token/password: rollback dan field sensitif tidak disimpan (task 2).
- SKU berbeda kapital/spasi, harga overflow, dan saldo disisipkan dalam DTO varian (task 3).
- OUT bersamaan serta movement bersamaan dengan arsip (task 4).
- Katalog publik tetap bersih dan demo seed tidak menulis ke database production (task 5).

## Struktur file dan interface bersama

Ikuti folder `src/modules/<domain>/` untuk controller/service/module/DTO. Schema ada di `src/database/schema/`; migrasi di `drizzle/`. Export `DbTransaction` dari `src/database/database.types.ts`, diturunkan dari callback `DatabaseService['db'].transaction`; `AuditService` menerima tipe transaksi ini.

Create `test/helpers/domain-fixtures.ts`. Task 1 mendefinisikan `seedActor(ctx: TestContext, role: UserRole): Promise<{ id: number; token: string }>` dan `seedProduct(ctx: TestContext, actorId: number): Promise<{ id: number }>` dengan data sintetis berlabel demo. Task 3 menambah `seedVariant(ctx, productId: number, sku: string): Promise<{ id: number }>`; saldo awal selalu nol. Fixtures bukan sumber test auth: auth HTTP sudah diuji M1. Gunakan token via login service untuk test domain dan nonaktifkan throttling hanya pada suite transaksi yang relevan.

### Task 1: Role dan bootstrap admin

Files: modify `src/database/schema/users.ts`, `src/database/schema/index.ts`, `src/common/decorators/current-user.decorator.ts`, `src/modules/auth/strategies/jwt.strategy.ts`, `src/modules/products/products.controller.ts`, `src/app.module.ts`, `package.json`; create `src/modules/users/{users.module,users.controller,users.service}.ts`, `src/modules/users/dto/update-role.dto.ts`, `src/common/decorators/roles.decorator.ts`, `src/common/guards/roles.guard.ts`, `src/database/bootstrap-admin.ts`, `test/helpers/domain-fixtures.ts`, `test/roles.e2e-spec.ts`, `test/users.integration-spec.ts`; generate migration role.

Interfaces: produces `UserRole = 'admin' | 'staff' | 'viewer'`, `AuthenticatedUser.role: UserRole`, `@Roles(...roles: UserRole[])`, `UsersService.setRole(id: number, role: UserRole, actor: AuthenticatedUser): Promise<{ id: number; username: string; role: UserRole }>`. CLI `bootstrapAdmin(username: string, password: string): Promise<void>` membuat admin pertama lewat credential environment eksplisit dan menolak bila admin sudah ada; tidak otomatis mempromosikan akun lama.

- [ ] Tulis failing test register role -> 400, user baru viewer, viewer mutasi produk -> 403, staff create/update -> sukses, staff DELETE -> 403, public GET -> 200, non-admin ubah role -> 403. Gunakan actor fixtures dan assertion:

```ts
const r = await ctx.api.inject({ method: 'DELETE', url: `/api/products/${product.id}`,
  headers: { authorization: `Bearer ${staff.token}` } });
expect(r.statusCode).toBe(403);
```

- [ ] Tulis test perubahan role langsung berlaku pada token lama; admin terakhir diturunkan -> 409; dua admin menurunkan satu sama lain bersamaan menyisakan tepat satu admin. Test CLI admin pertama sukses, pengulangan gagal tanpa mengganti credential.
- [ ] Run `npm run test:integration -- --runInBand test/roles.e2e-spec.ts test/users.integration-spec.ts`; catat RED pada aturan role baru.
- [ ] Implementasikan migration default/backfill viewer, role dibaca JWT strategy dari DB, guard sesudah auth, dan advisory transaction lock `730105` sebelum hitung/update admin. Buat command `npm run db:bootstrap-admin` ke dist entrypoint dan dokumentasi credential melalui env, bukan command-line plaintext atau seed otomatis saat startup.
- [ ] Run unit + integration + build, lalu commit tanpa push jika eksekusi diotorisasi. Audit role change ditambahkan task 2.

### Task 2: Audit atomik dan arsip katalog

Files: create `src/database/database.types.ts`, `src/database/schema/audit-logs.ts`, `src/modules/audit/{audit.module,audit.controller,audit.service}.ts`, `src/modules/audit/audit.types.ts`, `src/modules/audit/dto/query-audit.dto.ts`, `test/audit.integration-spec.ts`; modify schema products/index, ProductsService, UsersService, module wiring; generate migration audit dan `archived_at`.

Interfaces: produces `AuditEntry = { actorId: number; action: string; entityType: 'product' | 'variant' | 'stock_movement' | 'reservation' | 'user'; entityId: string; before: Record<string, unknown> | null; after: Record<string, unknown> | null }`; `AuditService.record(tx: DbTransaction, entry: AuditEntry): Promise<void>` dan `findAll(query: QueryAuditDto): Promise<{ data: AuditLog[]; meta: PaginationMeta }>`. Define `PaginationMeta = { page: number; limit: number; total: number; total_pages: number }` di `src/common/types/pagination.ts` dan `AuditLog` schema inferred type.

- [ ] Tulis failing assertions product create/update/archive dan role change punya audit tepat sekali; failed mutation tidak menulis audit; force audit insert failure membuat perubahan produk rollback; response audit hanya admin. Snapshot role hanya id/role, produk hanya field katalog, tanpa hash/token.

```ts
expect(await ctx.db.select().from(auditLogs).where(eq(auditLogs.entityId, String(product.id))))
  .toHaveLength(1);
expect((await ctx.api.inject(`/api/products/${archivedId}`)).statusCode).toBe(404);
```

- [ ] Run `npm run test:integration -- --runInBand test/audit.integration-spec.ts`; RED sebelum implementasi.
- [ ] Implementasikan insert audit dalam transaksi pemilik mutasi; hapus hard DELETE dan ganti `archivedAt`. Semua public reads/count/search menyaring archived. Arsip kedua pada produk arsip -> 404. Task 4 menambah syarat saldo nol setelah tabel varian tersedia.
- [ ] Uji rollback dengan stub satu insert audit failure, dan verifikasi state lewat DB nyata di luar transaksi. Integrasikan cache invalidation M1 hanya setelah commit sukses.
- [ ] Run unit + integration + build, update Swagger perubahan DELETE, commit tanpa push jika diotorisasi.

### Task 3: Varian dan SKU

Files: create `src/database/schema/product-variants.ts`, `src/modules/products/variants.service.ts`, `src/modules/products/variants.controller.ts`, `src/modules/products/variant.types.ts`, `src/modules/products/dto/{create-variant,update-variant,query-variant}.dto.ts`, `src/common/dto/page-query.dto.ts`, `test/variants.e2e-spec.ts`, `test/variants.integration-spec.ts`; modify schema index, products module, `test/helpers/domain-fixtures.ts`; generate migration varian.

Interfaces: produces `VariantView = { id: number; product_id: number; sku: string; label: string; price: string; created_at: Date; updated_at: Date }`; `VariantsService.create(productId, dto: CreateVariantDto, actor): Promise<VariantView>`, `update(id, dto: UpdateVariantDto, actor): Promise<VariantView>`, `findAll(productId, query: PageQueryDto): Promise<{ data: VariantView[]; meta: PaginationMeta }>`. Jenis actor `AuthenticatedUser`, semua ID numeric. Counter stok tidak masuk `VariantView` publik katalog; endpoint varian tetap authenticated.

- [ ] Tulis failing assertions zero stock, FK produk, SKU trim-uppercase unik, concurrent duplicate 409, label kosong/terlalu panjang 400, harga decimal string seperti `"99.99"` diterima dan `"1.001"`/`"100000000.00"` ditolak. DTO update hanya label/price; saldo atau SKU disisipkan -> 400.

```ts
expect(created.json()).toMatchObject({ sku: 'DEMO-BLACK-M', price: '99.99' });
expect(duplicate.statusCode).toBe(409);
```

- [ ] Run `npm run test:integration -- --runInBand test/variants.e2e-spec.ts test/variants.integration-spec.ts`; RED pada endpoint/constraint baru.
- [ ] Implementasikan UNIQUE SKU, FK, CHECK counter serta price, DTO sesuai spec, tanpa varian otomatis produk lama. Mutasi varian mengunci produk lalu varian agar serial dengan arsip, menulis audit transaksi; listing produk arsip -> 404. Tangani unique violation menjadi 409.
- [ ] Run unit + integration + build, verify migration dari database M1 tanpa kehilangan katalog, commit tanpa push jika diotorisasi.

### Task 4: Ledger dan saldo inventori

Files: create `src/database/schema/stock-movements.ts`, `src/modules/inventory/{inventory.module,inventory.controller,inventory.service}.ts`, `src/modules/inventory/inventory.types.ts`, `src/modules/inventory/inventory-locks.ts`, `src/modules/inventory/dto/{create-movement,query-inventory}.dto.ts`, `test/inventory.integration-spec.ts`, `test/inventory.e2e-spec.ts`; modify schema index, app module, ProductsService archive; generate migration ledger dan index `(variant_id, created_at, id)`.

Interfaces: produces `InventoryBalance = { variant_id: number; sku: string; on_hand: number; reserved: number; available: number }`, `MovementView` dari schema dan DTO mapping, `InventoryService.recordMovement(dto: CreateMovementDto, actor: AuthenticatedUser): Promise<{ movement: MovementView; balance: InventoryBalance }>`, `findBalances(query): Promise<{ data: InventoryBalance[]; meta: PaginationMeta }>`, `findMovements(variantId, query: PageQueryDto): Promise<{ data: MovementView[]; meta: PaginationMeta }>`. Ekspor `lockVariant(tx: DbTransaction, variantId: number): Promise<LockedVariant>` dari `src/modules/inventory/inventory-locks.ts`; tipe `LockedVariant` schema inferred row. Helper membaca parent ID lalu mengunci produk, mengecek aktif, lalu mengunci varian.

- [ ] Tulis failing tests IN +10, OUT -3, ADJUSTMENT -2 menghasilkan saldo 5 dan ledger sum 5; delta nol/fraction/direction salah -> 400, insufficient available -> 409, integer overflow -> 409, absent/archived variant -> 404. Viewer bisa read, hanya staff/admin bisa movement.

```ts
expect(balance).toMatchObject({ on_hand: 5, reserved: 0, available: 5 });
expect(ledger.reduce((sum, m) => sum + m.delta, 0)).toBe(balance.on_hand);
```

- [ ] Tulis concurrency satu unit dengan dua OUT -1 -> [201,409], saldo akhir nol, tepat satu movement OUT. Tambahkan forced ledger/audit failure -> saldo rollback; arsip saldo nonzero -> 409; movement dan arsip bersamaan -> salah satu perubahan legal tanpa produk arsip berstok nonzero.
- [ ] Run `npm run test:integration -- --runInBand test/inventory.integration-spec.ts test/inventory.e2e-spec.ts`; catat RED pada kontrak baru, bukan 429 (stub throttler khusus suite concurrency).
- [ ] Implementasikan lock order produk -> varian, update counter lalu insert ledger dan audit dalam transaksi. Validasi available menggunakan saldo terkunci; inventory reads tidak memakai cache. Arsip mengunci parent lalu semua varian menurut ID menaik dan hanya sukses jika counter semuanya nol. Ledger tidak menyediakan update/delete.
- [ ] Run unit + integration + build, verify constraint langsung melalui SQL invalid insert/update, commit tanpa push jika diotorisasi.

### Task 5: Acceptance MVP dan bukti demo

Files: create `test/inventory-acceptance.e2e-spec.ts`, `src/database/seed-demo.ts`, `docs/portfolio/inventory-case-study.md`, `docs/portfolio/inventory-api.http`; modify `README.md`, `package.json`, `.gitignore`, Swagger annotations. Dokumen portofolio masa depan memerlukan exception `.gitignore` terarah saat benar-benar dibuat; planning sekarang tidak membuka seluruh docs.

Interfaces: produces `seedDemo(databaseUrl: string): Promise<void>` dengan tiga akun demo, satu produk, dua SKU, dan movement awal berlabel sintetis. Seed hanya menerima DB bernama `product_management_demo` atau `product_management_test`, ditolak di production; repeat tidak menggandakan record/movement. CLI `npm run db:seed-demo` bukan bagian startup.

- [ ] Tulis failing acceptance HTTP: admin creates -> staff IN 10/OUT 3 -> viewer reads 7 -> viewer mutation 403 -> admin sees audit -> stok dikosongkan lewat OUT -> admin archives -> public GET 404. Assert katalog publik tidak memuat `on_hand`, `reserved`, role atau audit.

```ts
expect(publicProduct.json()).not.toHaveProperty('on_hand');
expect(viewerMutation.statusCode).toBe(403);
expect(viewerBalance.json().data[0].available).toBe(7);
```

- [ ] Run acceptance sampai RED yang spesifik; lengkapi integrasi modul/Swagger yang diperlukan. Test seed idempotent dan penolakan DB production.
- [ ] Implementasikan seed eksplisit, HTTP collection tanpa credential nyata, ERD Mermaid sesuai schema aktual, serta studi kasus dengan hasil command nyata dan batasan satu toko/satu instance/logout. Tidak membuat frontend atau angka benchmark fiktif.
- [ ] Run `npm test -- --runInBand`, `npm run test:integration -- --runInBand`, `npm run build`, migration dari DB kosong dan dari M1, lalu skenario demo pada DB demo terpisah. Update checklist M2 hanya setelah hasilnya dicatat.
- [ ] Commit tanpa push jika diotorisasi. M2 menjadi versi portofolio awal; M3 boleh dimulai setelah review hasil M2.
