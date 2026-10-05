# Desain katalog dan inventori untuk portofolio

Tanggal: 2026-10-05. Status: usulan desain untuk direview; belum diimplementasikan.

## Tujuan dan asumsi

Mengembangkan backend technical test menjadi aplikasi satu toko yang mengelola katalog, varian produk, stok, hak akses staf, dan jejak perubahan. Keberhasilan dinilai dari alur yang dapat didemokan dan pengujian aturan bisnis, bukan jumlah teknologi.

Asumsi kerja: target utama posisi backend; satu toko dan satu lokasi penyimpanan; satu mata uang `STORE_CURRENCY=IDR`; harga memiliki dua digit desimal. Nilai ini adalah keputusan usulan, bukan kebutuhan yang sudah dikonfirmasi. Frontend admin disiapkan sesudah API MVP stabil dan arah visual disepakati.

Permintaan sesi ini hanya planning dan pembuatan branch. Tidak mengimplementasikan fitur, menginstall dependency, menjalankan migrasi, commit, atau push. Branch kerja: `experiment`; tidak push ke `main`.

## Baseline yang diperiksa

- Brief PDF meminta REST API produk dan auth, filter/pagination, Docker, CORS, dan Swagger/Postman; cache dan rate limiting bersifat opsional.
- Kode memuat NestJS 12.1.1, Fastify, PostgreSQL 18, Drizzle, Argon2, JWT, refresh token, cache in-memory, throttling, dan Swagger.
- `ProductsService` belum memeriksa role; metadata pembuat/pengubah bukan mekanisme otorisasi.
- Test service/controller terutama memeriksa konstruksi provider. `test-e2e.mjs` mencetak respons tanpa assertion penerimaan.
- `test:e2e` menunjuk `test/jest-e2e.json` yang belum ada; `db:migrate` menunjuk entrypoint yang belum ada dalam source.
- Migrasi startup menangkap error dan tetap melanjutkan; auth memiliki fallback secret; exception filter dapat menampilkan pesan error internal.
- Temuan berasal dari pembacaan file. Aplikasi, build, dan test belum dijalankan dalam sesi planning.
- Dokumen desain 2026-09-30 adalah referensi technical test; kode sekarang menjadi baseline ketika dokumen lama berbeda.

## Batasan global

- Branch kerja `experiment`; jangan push, merge, atau rebase ke `main` tanpa instruksi terpisah.
- Pertahankan Node.js 24, NestJS 12.1.1, Fastify, PostgreSQL 18, dan Drizzle; tidak upgrade major version dalam milestone ini.
- Bentuk aplikasi modular monolith; PostgreSQL adalah sumber kebenaran stok.
- M1-M3 tidak memerlukan Redis, message broker, microservices, pembayaran, atau multi-tenant.
- Endpoint dan field technical test `/api/products` serta `/api/auth` tetap tersedia; pembatasan role dan arsip produk merupakan perubahan perilaku yang didokumentasikan.
- `GET /api/products` dan `GET /api/products/:id` tetap publik; data stok, audit, dan anggota hanya untuk pengguna berizin.
- Timestamp technical test tetap `YYYY-MM-DD HH:mm:ss`; formatter menggunakan UTC secara eksplisit dan dokumentasi menyatakan UTC.
- Tabel baru menggunakan `timestamptz`; API baru juga menampilkan waktu UTC dengan format yang sama untuk konsistensi.
- Default pagination `page=1`, `limit=10`, maksimum `limit=100`; nilai di luar batas ditolak dengan 400.
- Setiap perubahan schema menggunakan migrasi baru; tidak mengedit migration yang sudah diterapkan.
- Tidak menggunakan database development/production untuk test; nama database test wajib berakhiran `_test`.
- Tidak mengklaim test, performa, keamanan, atau deployment berhasil tanpa hasil verifikasi yang dicatat.

## Arsitektur dan kepemilikan modul

| Modul | Tanggung jawab | Kontrak dengan modul lain |
|---|---|---|
| config | Validasi konfigurasi saat startup | `loadEnvironment(env): AppEnvironment` |
| database | Koneksi, migrasi eksplisit, transaksi, lifecycle | `DatabaseService.db`, tipe `DbTransaction` |
| auth | Login, refresh, logout, identitas | `AuthenticatedUser` dengan `role` |
| users | Perubahan role oleh admin | `UsersService.setRole(id, role, actor)` |
| products | Katalog publik, mutasi katalog, varian | `ProductsService`, `VariantsService` |
| inventory | Saldo per varian dan ledger | `InventoryService.recordMovement(dto, actor)` |
| audit | Riwayat mutasi berhasil | `AuditService.record(tx, entry)` |
| reservations (M3) | Pemesanan stok dan transisi status | `ReservationsService.create/confirm/cancel` |
| health | Liveness dan kesiapan database | `/api/health/live`, `/api/health/ready` |

Mutasi yang mengubah produk/stok dan audit commit dalam satu transaksi. Cache katalog tidak menjadi sumber kebenaran stok dan tidak menampung saldo inventori.

## Model data dan aturan bisnis

| Entitas | Field dan constraint penting |
|---|---|
| users | Tambah enum role `admin`, `staff`, `viewer`; default dan backfill `viewer`. Admin awal dibuat lewat CLI lokal yang eksplisit. |
| products | Field lama dipertahankan; tambah `archived_at` nullable. DELETE menjadi arsip; GET publik menyembunyikan produk arsip. |
| product_variants | `id`, `product_id` FK, `sku` varchar(80) UNIQUE, `label` varchar(100), `price` numeric(10,2), `on_hand` integer default 0, `reserved` integer default 0, timestamps. |
| stock_movements | `id`, `variant_id` FK, `kind` IN/OUT/ADJUSTMENT, `delta` integer nonzero, `reason` varchar(255), `actor_id` FK, `reservation_id` nullable pada M3, `created_at`. Append-only. |
| audit_logs | `id`, `actor_id` FK, `action`, `entity_type`, `entity_id`, `before`/`after` jsonb, `created_at`. Simpan hanya field yang diizinkan, tanpa password/token. |
| reservations (M3) | UUID `id`, `variant_id` FK, `quantity` integer positif, `status` PENDING/CONFIRMED/CANCELLED, `created_by_id` FK, timestamps. Satu SKU per reservasi. |
| idempotency_records (M3) | `actor_id`, `operation`, `key`, `request_hash`, `resource_id`, UNIQUE(actor_id, operation, key). Hanya hasil sukses yang disimpan. |

Varian tidak dibackfill otomatis dari produk lama karena SKU harus dipilih secara eksplisit. SKU dinormalisasi trim + uppercase, pola `^[A-Z0-9][A-Z0-9_-]{0,79}$`; duplikat menghasilkan 409. Harga varian pada API adalah decimal string positif maksimum `99999999.99`, tepat dua digit pecahan; respons produk lama tetap number. Angka nol atau negatif ditolak. `on_hand >= 0`, `reserved >= 0`, `reserved <= on_hand` dijaga juga oleh CHECK database.

`available = on_hand - reserved`. Varian baru berstok nol; menambah stok hanya lewat ledger. IN menggunakan delta positif; OUT delta negatif; ADJUSTMENT memakai delta signed dengan alasan. Delta harus integer nonzero, maksimum absolut 1.000.000; jumlah akhir tidak boleh melebihi batas PostgreSQL integer. Mutasi stok memakai row lock dalam transaksi. Katalog tidak menerima perubahan saldo dari DTO varian.

DELETE produk hanya admin; arsip ditolak dengan 409 jika salah satu varian memiliki `on_hand != 0` atau `reserved != 0`. Varian produk arsip tidak menerima movement/reservasi. Untuk mencegah race, semua transaksi stok mengunci baris produk lalu varian; arsip mengunci produk lalu varian menurut ID menaik. Belum ada penghapusan varian atau fitur restore pada MVP.

## Matriks izin

| Aksi | Publik | viewer | staff | admin |
|---|---|---|---|---|
| Lihat katalog aktif | Ya | Ya | Ya | Ya |
| Lihat varian, saldo, dan ledger | Tidak | Ya | Ya | Ya |
| Buat/update produk dan varian | Tidak | Tidak | Ya | Ya |
| Catat movement dan kelola reservasi | Tidak | Tidak | Ya | Ya |
| Arsip produk | Tidak | Tidak | Tidak | Ya |
| Lihat audit dan kelola role | Tidak | Tidak | Tidak | Ya |

Registrasi publik tidak menerima field role. User viewer tidak dapat meningkatkan perannya sendiri. Perubahan role dibaca dari database pada setiap request; tidak mengandalkan role dalam token. Admin terakhir tidak boleh diturunkan; transaksi perubahan role memakai advisory transaction lock global dengan key tetap `730105` sebelum menghitung admin.

## Kontrak endpoint baru

| Method dan path | Body/query | Respons sukses |
|---|---|---|
| POST `/api/auth/logout` | Bearer access token | 204; mencabut refresh token aktif |
| PATCH `/api/users/:id/role` | `{ role }` | 200 profil aman |
| GET `/api/products/:id/variants` | page, limit | 200 `{ data, meta }` |
| POST `/api/products/:id/variants` | `{ sku, label, price }` | 201 varian |
| PATCH `/api/variants/:id` | label dan/atau price; tidak menerima sku/saldo | 200 varian |
| GET `/api/inventory` | page, limit, sku optional | 200 daftar `{ variant_id, sku, on_hand, reserved, available }` |
| POST `/api/inventory/movements` | `{ variant_id, kind, delta, reason }` | 201 movement + saldo terbaru |
| GET `/api/inventory/variants/:id/movements` | page, limit | 200 ledger terbaru dahulu |
| GET `/api/audit-logs` | page, limit, entity_type/entity_id optional | 200 audit terbaru dahulu |
| POST `/api/reservations` (M3) | `{ variant_id, quantity }`, header `Idempotency-Key` | 201 reservasi, termasuk replay identik |
| POST `/api/reservations/:id/confirm` (M3) | Body kosong | 200 reservasi |
| POST `/api/reservations/:id/cancel` (M3) | Body kosong | 200 reservasi |
| GET `/api/reservations` (M3) | page, limit, status optional | 200 `{ data, meta }` |

401 untuk auth hilang/tidak valid, 403 untuk role tidak berizin, 404 untuk ID yang tidak ada, 400 untuk input tidak valid, 409 untuk konflik aturan bisnis. Format error mempertahankan `{ statusCode, message, error }`; 500 selalu pesan generik.

## Autentikasi dan operasional M1

M1 mempertahankan satu refresh token aktif per user. Access TTL `15m`, refresh TTL `7d`; kedua secret wajib berbeda dan masing-masing minimal 32 karakter. Setiap token memiliki UUID `jti` baru. Refresh menggunakan compare-and-swap terhadap hash lama agar dua refresh bersamaan tidak sama-sama berhasil. Logout mencabut refresh; access token yang telah terbit tetap berlaku sampai expiry. Kebijakan ini dinyatakan di Swagger dan README; multi-device dan pencabutan access langsung masuk backlog.

`CORS_ORIGINS=*` boleh untuk mode Bearer tanpa cookies dengan `credentials=false`; production menggunakan allowlist origin yang eksplisit. `DATABASE_URL` wajib; error migrasi menghentikan migration command. Startup memverifikasi schema sudah sesuai lalu gagal bila belum siap. Compose menjalankan service migration sekali sebelum API; CI melakukan hal yang sama pada database kosong. Readiness memeriksa koneksi database, liveness tidak bergantung database.

Cache katalog tetap in-memory untuk satu instance. Gunakan generation key agar invalidasi saat mutasi tidak dapat ditimpa request baca lama. Stok/audit/reservasi tidak dicache. Deployment multi-instance belum menjadi klaim milestone ini.

## Reservasi stok M3

Create PENDING menambah `reserved`, tidak mengurangi `on_hand`; qty 1..1.000.000 dan `available >= qty`. Confirm PENDING mengurangi kedua counter dan membuat movement OUT tepat satu kali. Cancel PENDING hanya mengurangi reserved. Tidak ada expiry otomatis, partial fulfilment, pembayaran, atau keranjang multi-SKU.

Confirm ulang CONFIRMED dan cancel ulang CANCELLED mengembalikan 200 tanpa efek tambahan. Confirm CANCELLED atau cancel CONFIRMED menghasilkan 409. Transisi mengunci produk, varian, kemudian reservasi. Header idempotency wajib UUID valid; key yang sama dengan payload berbeda menghasilkan 409. Simpan hash payload kanonik beserta reservasi dalam satu transaksi; record dipertahankan selama reservasi disimpan.

## Acceptance dan bukti portofolio

- M1: clean database dapat dimigrasikan dan API siap; CI build/unit/integration/E2E berjalan dengan assertion; role negatif dan akses publik diuji pada M2.
- M2: admin membuat produk dan dua SKU, staf mencatat IN/OUT, viewer membaca; saldo sama dengan jumlah delta ledger; perubahan berhasil memiliki audit, rollback tidak meninggalkan audit.
- M3: dua actor memesan satu unit bersamaan, tepat satu sukses; replay permintaan dan transisi tidak menggandakan efek; pembatalan membebaskan reserved.
- Demo: Swagger atau HTTP collection, ERD, video/screenshot hasil nyata, CI, keputusan desain dan batasan operasional. Seluruh seed diberi label data demo.
- Frontend/deployment publik merupakan milestone terpisah setelah M2; bukan prasyarat klaim bahwa UI telah selesai.

## Backlog yang sengaja dipisahkan

Frontend admin memerlukan desain visual, pemilihan stack, alur keyboard, serta empty/loading/error states sebelum implementasi. Deployment publik memerlukan pilihan hosting dan biaya. CSV background import memerlukan spesifikasi ukuran file, validasi per baris, partial failure, job idempotency, dan retry sebelum menambah Redis/BullMQ. Upload gambar, kategori terkelola, multi-gudang, multi-tenant, session multi-device, notifikasi, dan laporan analitik belum termasuk M1-M3.

Referensi teknis: [PostgreSQL row locks](https://www.postgresql.org/docs/current/explicit-locking.html), [GitHub Actions PostgreSQL service](https://docs.github.com/en/actions/tutorials/use-containerized-services/create-postgresql-service-containers), [NestJS queues](https://docs.nestjs.com/techniques/queues).
