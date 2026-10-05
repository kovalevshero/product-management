# Product catalog and inventory API

Backend portfolio project developed from a product-management technical test. The implementation runs on Node.js 24, NestJS 12.1.1, Fastify, PostgreSQL 18, and Drizzle ORM.

## Development

Copy `.env.example` to `.env` and replace both JWT secrets with independent random values of at least 32 characters. Generate each value with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.

```sh
docker compose up --build -d
```

Compose starts PostgreSQL, runs migrations once, then starts the API. Migration errors stop the deployment. The API checks that database migration hashes match its bundled schema before accepting traffic.

API: `http://localhost:3000`; Swagger: `http://localhost:3000/api/docs`.

Without Docker, provide `DATABASE_URL`, install dependencies, build, and migrate before starting:

```sh
npm ci
npm run build
npm run db:migrate
npm run start:prod
```

Use `npm run start:dev` after the initial migration. Schema changes require `npm run db:generate`, review of generated SQL, a build, and `npm run db:migrate`.

## Configuration and API contracts

`DATABASE_URL`, `JWT_SECRET`, and `JWT_REFRESH_SECRET` are required. Secrets must differ and contain at least 32 characters. Access tokens expire after 15 minutes; refresh tokens expire after 7 days. Each user has one active refresh session. Login replaces it, refresh rotates it atomically, and logout revokes it. Issued access tokens remain valid until expiry; logout does not immediately revoke them.

`CORS_ORIGINS` is a comma-separated list of origins. Production requires an explicit allowlist. Wildcard origins are supported for development/test with credentials disabled; authentication uses Bearer tokens rather than cookies. `STORE_CURRENCY` is IDR. Timestamps use UTC in `YYYY-MM-DD HH:mm:ss` format. Pagination defaults to page 1 and limit 10; maximum limit is 100.

| Method | Path | Access |
|---|---|---|
| POST | `/api/auth/register` | Public, 3 requests/minute |
| POST | `/api/auth/login` | Public, 3 requests/minute |
| POST | `/api/auth/refresh` | Refresh token |
| POST | `/api/auth/logout` | Bearer token, returns 204 |
| GET | `/api/products`, `/api/products/:id` | Public catalog |
| POST/PUT | `/api/products`, `/api/products/:id` | Staff/admin, 1 mutation/5 seconds |
| DELETE | `/api/products/:id` | Admin archive, requires zero stock |
| GET/POST | `/api/products/:id/variants` | Authenticated read; staff/admin create |
| PATCH | `/api/variants/:id` | Staff/admin, label and decimal-string price |
| GET | `/api/inventory`, `/api/inventory/variants/:id/movements` | Authenticated |
| POST | `/api/inventory/movements` | Staff/admin |
| PATCH | `/api/users/:id/role` | Admin, final admin protected |
| GET | `/api/audit-logs` | Admin |
| GET | `/api/health/live` | Public liveness |
| GET | `/api/health/ready` | Public database readiness |

Product search accepts `search`, `category`, `page`, and `limit`. Product fields retain the technical test response shape. Swagger describes request validation and response statuses. Unexpected failures return a generic 500 response without SQL or credentials.

Catalog caching uses in-memory generations with a 60-second TTL. An in-flight old read cannot repopulate the current generation after a successful mutation. This implementation targets one API instance; shared caches and multi-instance deployment require additional work.

## Verification

Public signup creates a viewer and rejects role injection. To create the first admin, build and migrate, then set `BOOTSTRAP_ADMIN_USERNAME` and `BOOTSTRAP_ADMIN_PASSWORD` as environment variables and run `npm run db:bootstrap-admin`. The command refuses to run when an admin already exists and never promotes an existing account automatically. With Docker, pass those variables to a one-off API service command; do not commit their values.

For a separate demo database, set `DATABASE_URL` to `product_management_demo`, migrate, then run `npm run db:seed-demo` in development mode. Synthetic accounts `demo_admin`, `demo_staff` and `demo_viewer` use `demo-secret123`; the database contains one product, two SKU variants and ten opening units each. Seed refuses production mode and other database names. Replaying seed keeps existing credentials and opening movements.

Variant price is a positive decimal string, such as `"99.99"`; SKU is immutable. Inventory movements accept nonzero integer delta up to 1,000,000 absolute, a kind and a reason. `IN` is positive, `OUT` negative, `ADJUSTMENT` signed. `available = on_hand - reserved`; insufficient stock returns 409. Catalog DTOs cannot update stock. All successful domain mutations and their audit records share one transaction.

The [case study](docs/portfolio/inventory-case-study.md) explains the schema and concurrency decisions; the [HTTP collection](docs/portfolio/inventory-api.http) provides demo requests.

The Docker test project has its own volume, PostgreSQL port 5433, and API port 3001. It does not restart or reset the development project.

```sh
docker compose -p inventory_test -f docker-compose.test.yml up -d --build --wait
npm test -- --runInBand
npm run test:integration -- --runInBand
```

Unit tests run in Jest. HTTP tests start the compiled application in an isolated Node.js 24 process because Jest 29 cannot load the CommonJS throttler's NestJS 12 ESM dependencies. Requests go through a real HTTP listener and PostgreSQL; concurrency tests use simultaneous requests. Throttling is stubbed only for suites that isolate other behavior; rate-limit tests use the real limiter.

By default HTTP tests use `postgresql://postgres:test@localhost:5433/product_management_test`. Set `TEST_DATABASE_URL` to use another test database, including the PostgreSQL service in CI. Test helpers refuse names without the `_test` suffix before reset; migrations also run only on that selected test database. Do not point tests at development data.

The GitHub Actions workflow installs dependencies, builds, migrates PostgreSQL 18, and runs unit/HTTP tests. A workflow file is not evidence of a successful remote run; inspect actual Actions results after an authorized push.

Protected test and demo URLs must have no query parameters or fragments. Guards verify the connected database name before migration, reset or seed. Remote SSL options for those protected operations require a separate supported connection configuration. Numeric resource IDs and pages are limited to positive PostgreSQL integers. Run demo seed on a separate database while catalog writes are stopped.

## Development roadmap

Planning lives in `docs/superpowers/plans/2026-10-05-inventory-portfolio-roadmap.md`; the design contract lives in `docs/superpowers/specs/2026-10-05-inventory-portfolio-design.md`. The milestones are backend foundations, inventory MVP, and stock reservations. Frontend, public hosting, background CSV import, and multi-store support are separate follow-up milestones.

Work is on branch `experiment`. No automated push or merge to `main` is part of this workflow.
