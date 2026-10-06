# Stock Reservations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Menunjukkan reservasi stok yang tidak oversell dan tidak menggandakan efek ketika request dikirim ulang.

**Architecture:** Reservasi satu SKU dan idempotency record disimpan dalam transaksi PostgreSQL. Counter reserved dibedakan dari on_hand. Konfirmasi membuat ledger OUT; cancel hanya melepaskan reserved. Tidak ada payment atau expiry worker.

**Tech Stack:** Stack M2, PostgreSQL row/advisory locks dan Node crypto untuk UUID/hash SHA-256; tanpa dependency queue tambahan.

**Spec:** [Desain](../specs/2026-10-05-inventory-portfolio-design.md), bagian model data, reservasi M3, dan acceptance.

## Global Constraints

- Branch kerja `experiment`; jangan push, merge, atau rebase ke `main` tanpa instruksi terpisah.
- Bentuk aplikasi modular monolith; PostgreSQL adalah sumber kebenaran stok.
- Setiap perubahan schema menggunakan migrasi baru; tidak mengedit migration yang sudah diterapkan.
- M1-M3 tidak memerlukan Redis, message broker, microservices, pembayaran, atau multi-tenant.
- Tidak menggunakan database development/production untuk test; nama database test wajib berakhiran `_test`.
- Seluruh batasan global spec berlaku; M2 harus sudah lulus. Code snippets merupakan assertion target, bukan test yang sudah dijalankan.

## Review Focus

- Dua request dengan key sama dan body sama menghasilkan satu resource (task 1).
- Key sama dengan body berbeda ditolak, key sama dari actor lain independen (task 1).
- Confirm/cancel bersamaan hanya memiliki satu hasil terminal legal (task 2).
- OUT manual menghormati reserved; cancel/confirm gagal tidak mengubah ledger atau audit (task 2).
- Pengujian concurrency berjalan pada PostgreSQL nyata tanpa disamarkan rate limit (task 3).

## Struktur file dan interface bersama

Schema baru ada di `src/database/schema/{reservations,idempotency-records}.ts`; modul di `src/modules/reservations/`. Gunakan `AuthenticatedUser`, `DbTransaction`, `InventoryBalance`, `lockVariant`, dan `AuditService.record` dari M1-M2. `ReservationView = { id: string; variant_id: number; quantity: number; status: 'PENDING' | 'CONFIRMED' | 'CANCELLED'; created_by_id: number; created_at: Date; updated_at: Date }` didefinisikan di `reservation.types.ts`.

Tidak memanggil `InventoryService.recordMovement()` dari transaksi confirm karena method itu membuka transaksi baru. Extract `InventoryService.applyMovement(tx: DbTransaction, locked: LockedVariant, dto: CreateMovementDto, actor: AuthenticatedUser, reservationId?: string): Promise<{ movement: MovementView; balance: InventoryBalance }>` untuk update counter/ledger/audit di transaksi yang disediakan. Parameter optional tidak berarti klien HTTP boleh memasukkan reservation_id.

### Task 1: Reservasi PENDING dan idempotency

Files: create schema reservations/idempotency, `src/modules/reservations/{reservations.module,reservations.controller,reservations.service}.ts`, `src/modules/reservations/reservation.types.ts`, `src/modules/reservations/idempotency.service.ts`, `src/modules/reservations/dto/{create-reservation,query-reservation}.dto.ts`, `test/reservations-create.integration-spec.ts`; modify schema index/app module; generate migration.

Interfaces: produces `ReservationsService.create(dto: CreateReservationDto, actor: AuthenticatedUser, key: string): Promise<ReservationView>`, `findAll(query: QueryReservationDto): Promise<{ data: ReservationView[]; meta: PaginationMeta }>`, `IdempotencyService.lock(tx: DbTransaction, actorId: number, operation: 'reservation.create', key: string): Promise<void>`. Advisory xact lock memakai `hashtextextended` terhadap actor/operation/key; UNIQUE composite tetap pertahanan database. Lock order key -> produk -> varian. Payload hash SHA-256 JSON kanonik `{ variant_id, quantity }` sesudah validasi DTO.

- [x] Tulis failing tests qty 1..1.000.000 integer, key UUID wajib, role viewer -> 403, tidak cukup available -> 409, variant missing/archived -> 404, create mengubah reserved saja. Test replay concurrent same actor/key/body menghasilkan satu ID dan satu efek reserved.

```ts
expect(first.statusCode).toBe(201);
expect(replay.json().id).toBe(first.json().id);
expect(balance).toMatchObject({ on_hand: 1, reserved: 1, available: 0 });
```

- [x] Tulis key sama/payload berbeda -> 409; actor berbeda/key sama tidak berbagi record; audit failure rollback reserved, reservation, dan idempotency record. Test dua actor berbeda meminta unit terakhir -> [201,409].
- [x] Run `npm run test:integration -- --runInBand test/reservations-create.integration-spec.ts`; stub throttler hanya suite ini agar assertion benar-benar menguji database.
- [x] Implementasikan transaksi: acquire idempotency lock, cari record dan cocokkan hash, kembalikan resource yang sama bila replay, lockVariant, cek available, increment reserved, insert reservation + audit + idempotency. Tidak menyimpan hasil 400/403/404/409. Replay sesudah confirm/cancel menampilkan state resource sekarang dengan 201, tidak membuat reservasi baru; dokumentasikan perilaku ini.
- [x] Run unit + integration + build dan migrasi upgrade M2; commit tanpa push jika diotorisasi.

### Task 2: Confirm dan cancel atomik

Files: modify reservations service/controller, InventoryService, inventory-locks dan movement schema; create `test/reservations-transition.integration-spec.ts`; generate migration `stock_movements.reservation_id` FK dan UNIQUE partial untuk OUT reservasi.

Interfaces: produces `ReservationsService.confirm(id: string, actor: AuthenticatedUser): Promise<ReservationView>`, `cancel(id: string, actor: AuthenticatedUser): Promise<ReservationView>` dan `InventoryService.applyMovement` di atas. Baca immutable variant ID dari reservasi, lock produk -> varian -> reservasi, lalu periksa status terbaru. Staff/admin dapat mengelola semua reservasi toko.

- [x] Tulis failing tests confirm PENDING menurunkan on_hand dan reserved tepat qty, OUT ledger/audit satu kali; confirm ulang tidak menulis tambahan. Cancel PENDING menurunkan reserved saja; cancel ulang tidak menulis tambahan. Transisi terminal berlawanan -> 409; UUID invalid -> 400; ID hilang -> 404.

```ts
expect(afterConfirm).toMatchObject({ on_hand: 0, reserved: 0, available: 0 });
expect(reservationMovements).toHaveLength(1);
expect(reservationMovements[0].delta).toBe(-1);
```

- [x] Tambahkan confirm-confirm, cancel-cancel, confirm-cancel concurrent; invariant dan ledger tetap konsisten. Test OUT manual ketika seluruh stok reserved -> 409; force movement/audit insert failure -> status dan kedua counter rollback. Uji archive ketika reserved nonzero -> 409.
- [x] Run `npm run test:integration -- --runInBand test/reservations-transition.integration-spec.ts` dan inventori M2 untuk mendeteksi regresi.
- [x] Implementasikan transisi dan extract applyMovement dengan transaksi bersama. Pada confirm kurangi reserved sebelum mengevaluasi OUT terhadap available dalam transaksi yang sama; kedua update tidak terlihat di luar transaksi sampai commit. Tambah unique reservation movement sebagai pertahanan replay dan jangan pernah mengedit ledger lama.
- [x] Run unit + semua integration + build; commit tanpa push jika diotorisasi.

### Task 3: Acceptance concurrency dan studi kasus

Files: create `test/reservations-acceptance.e2e-spec.ts`; modify `README.md`, Swagger, `docs/portfolio/inventory-case-study.md`, `docs/portfolio/inventory-api.http`, seed-demo bila perlu.

Interfaces: consumes seluruh service M1-M3; tidak menghasilkan modul baru. Test menggunakan API nyata dan PostgreSQL, dua actor/kunci berbeda; rate-limit test tetap terpisah dengan guard asli.

- [x] Tulis assertion awal skenario dua actor memesan satu unit, replay actor sukses, confirm dua kali, saldo/ledger final, dan audit yang sesuai. Buat skenario terpisah cancel lalu actor lain dapat mereservasi unit yang dibebaskan.

```ts
expect(results.map(r => r.statusCode).sort()).toEqual([201, 409]);
expect(finalBalance).toMatchObject({ on_hand: 0, reserved: 0, available: 0 });
expect(finalOutMovements).toHaveLength(1);
```

- [x] Run acceptance, lengkapi hanya wiring/kontrak yang belum memenuhi assertion. Jalankan juga M2 acceptance setelah module baru dipasang.
- [x] Tambahkan diagram create/confirm/cancel, lock order, alasan idempotency scoped actor, kebijakan tidak ada expiry otomatis, dan langkah reproduksi concurrency. Simpan hasil yang benar-benar diamati; jangan mengubah satu keberhasilan menjadi klaim throughput atau uptime.
- [x] Verifikasi build, unit, integration penuh, fresh migration, upgrade M2, Compose test dan demo HTTP. Catat command, tanggal, jumlah kasus, dan hasil aktual sebelum menandai M3 selesai.
- [x] Review diff, commit tanpa push jika diotorisasi; serahkan demo backend. Frontend/hosting/CSV tetap menunggu spesifikasi terpisah sesuai roadmap.
