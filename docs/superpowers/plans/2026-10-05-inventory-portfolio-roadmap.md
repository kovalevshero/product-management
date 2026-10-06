# Inventory Portfolio Roadmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menghasilkan portofolio backend katalog dan inventori satu toko dengan bukti pengujian aturan bisnis.

**Architecture:** Modular monolith NestJS dan PostgreSQL. Inventori memiliki ledger dan saldo transaksional; reservasi ditambahkan setelah MVP. Antarmuka demo, hosting publik, dan background import direncanakan terpisah ketika kebutuhan dan batasannya dipilih.

**Tech Stack:** Node.js 24, NestJS 12.1.1, Fastify, PostgreSQL 18, Drizzle, Jest, Docker Compose, Swagger, GitHub Actions.

**Spec:** [Desain dan kontrak](../specs/2026-10-05-inventory-portfolio-design.md).

## Global Constraints

- Branch kerja `experiment`; jangan push, merge, atau rebase ke `main` tanpa instruksi terpisah.
- Pertahankan Node.js 24, NestJS 12.1.1, Fastify, PostgreSQL 18, dan Drizzle; tidak upgrade major version dalam milestone ini.
- Bentuk aplikasi modular monolith; PostgreSQL adalah sumber kebenaran stok.
- M1-M3 tidak memerlukan Redis, message broker, microservices, pembayaran, atau multi-tenant.
- Dokumen ini adalah planning; setiap subplan menunggu review sebelum implementasi dan mengikuti seluruh batasan global spec.

## Review Focus

- Database salah target: helper test menolak nama selain akhiran `_test` (M1 task 1).
- Refresh bersamaan: tepat satu rotasi berhasil (M1 task 3).
- Role escalation dan admin terakhir: 403/400/409 sesuai kontrak (M2 task 1).
- Stok keluar bersamaan dengan arsip: perubahan serial dan invariant tetap benar (M2 task 4).
- Retry dan transisi reservasi bersamaan: satu resource dan satu efek ledger (M3 task 1-2).

## Milestone dan urutan

| Milestone | Deliverable | Gate untuk melanjutkan |
|---|---|---|
| M1 Fondasi | Pengujian nyata, config, auth, migrasi, health, CI | Clean boot dan seluruh assertion M1 lulus |
| M2 MVP inventori | Role, SKU, ledger, audit, katalog terarsip | Alur admin/staff/viewer dan rollback teruji |
| M3 Reservasi | Stock reservation, concurrency, idempotency | Tidak oversell, replay aman, transisi konsisten |
| M4 Demo portofolio | Admin UI atau Swagger/collection, ERD, hosting, studi kasus | Demo dapat diulang dan semua klaim memiliki bukti |
| M5 Ekstensi pilihan | CSV background import atau SaaS multi-toko | Pilih satu kebutuhan, tulis spec baru, baru implementasi |

M1 -> M2 -> M3. Bukti portofolio mulai dikumpulkan sejak M1. M4 versi Swagger/collection dapat dirilis sesudah M2; M3 meningkatkan kedalaman teknisnya. M5 bukan syarat versi portofolio pertama.

## Subplan implementasi

1. [M1: Fondasi backend](2026-10-05-01-backend-foundation.md), lima task.
2. [M2: MVP inventori](2026-10-05-02-inventory-mvp.md), lima task.
3. [M3: Reservasi stok](2026-10-05-03-stock-reservations.md), tiga task.

## Checklist pelaksanaan

- [x] Review asumsi satu toko, satu lokasi, IDR, role, perubahan DELETE menjadi arsip, dan kebijakan logout.
- [x] Pilih metode eksekusi sesudah review; native direkomendasikan untuk mulai M1 karena schema, helper test, dan bootstrap saling bergantung.
- [x] Catat baseline build/test aktual sebelum memperbaiki kode; jangan menganggap test sudah lulus.
- [x] Selesaikan M1 dan rekam hasil command verifikasinya.
- [x] Selesaikan M2 dan jalankan skenario penerimaan pada database test serta seed demo.
- [x] Siapkan ERD dan dokumentasi API dari implementasi yang benar-benar selesai.
- [x] Selesaikan M3 bila ingin menampilkan concurrency dan idempotency sebagai fitur unggulan.
- [ ] Tentukan arah visual dan stack frontend sebelum membuat admin UI; Swagger/collection cukup sebagai demo backend awal.
- [ ] Pilih hosting, batas biaya, pengelolaan secret, dan reset data demo sebelum deployment publik.
- [x] Tulis studi kasus: masalah, model data, transaksi, hasil test, batasan, dan keputusan yang ditunda.
- [x] Review diff dan hasil verifikasi sebelum commit atau PR; jangan push otomatis.

## Skenario demo yang akan dibuat

Data berikut merupakan skenario sintetis, bukan hasil yang sudah diukur.

1. Admin membuat produk kaos dengan dua SKU; stok awal masing-masing nol.
2. Staff mencatat barang masuk 10 dan barang keluar 3; viewer melihat saldo 7 serta kedua ledger entry.
3. Viewer mencoba mengubah stok dan mendapat 403; audit tidak mencatat perubahan yang gagal.
4. Pada M3, satu SKU memiliki satu unit tersedia; dua actor membuat reservasi berbeda bersamaan. Tepat satu berhasil, satu mendapat 409.
5. Actor sukses mengirim ulang key dan payload yang sama; ID reservasi tetap sama. Confirm ulang menghasilkan satu movement OUT secara keseluruhan.

## Catatan branch dan artefak

Planning awal dibuat pada `experiment`, tanpa perubahan kode aplikasi. Implementasi kemudian diotorisasi. M1-M3 sudah dicommit lokal dan direview; tidak ada push atau merge. Lima dokumen desain/planning dan dua artefak `docs/portfolio` dilacak secara terarah; dokumen 2026-09-30 tetap ignored. `AGENTS.md` dan PDF yang sudah untracked tidak ikut distage.

Verifikasi akhir 2026-10-06: build, 16 unit test, 44 integration test, fresh/upgrade migration, demo HTTP database terpisah, Compose test dan HTTP container lulus. Bukti dan batasan ada di `docs/portfolio/inventory-case-study.md`. M4 frontend/hosting dan M5 belum termasuk hasil ini.

Tidak ada estimasi kalender yang dijanjikan. Setelah baseline M1 berjalan, ukur waktu task pertama untuk menyusun jadwal sesuai waktu luang Anda.
