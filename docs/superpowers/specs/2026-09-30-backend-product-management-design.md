# Specification: Product Management & Auth Backend API

## 1. Overview & Objectives
This project provides a robust, production-grade REST API backend for Product Management and Authentication based on the recruitment test specification (`Coding Backend v2.pdf`).

### Tech Stack
- **Framework**: NestJS 12.1.1
- **HTTP Adapter**: Fastify (`@nestjs/platform-fastify`)
- **Runtime**: Node.js 24 (`node:24-alpine`)
- **Database**: PostgreSQL 18 (`postgres:18`)
- **ORM & Migrations**: Drizzle ORM (`drizzle-orm`, `drizzle-kit`, `postgres` driver)
- **Documentation**: Swagger / OpenAPI (`@nestjs/swagger`, `@fastify/swagger`, `@fastify/swagger-ui`)
- **Security & Auth**: Argon2 (`argon2`), JWT (`@nestjs/jwt`, `passport-jwt`)
- **Rate Limiting**: `@nestjs/throttler`
- **Caching**: `@nestjs/cache-manager` (in-memory store with invalidation)
- **Containerization**: Docker & Docker Compose (Docker Desktop compatible)

---

## 2. System Architecture & Directory Structure

```
product-management/
├── .dockerignore
├── .env.example
├── docker-compose.yml
├── Dockerfile
├── drizzle.config.ts
├── package.json
├── tsconfig.json
├── drizzle/                      # Generated SQL migration files
├── src/
│   ├── main.ts                   # Fastify bootstrap, CORS, Swagger, Global Filters & Pipes
│   ├── app.module.ts             # Root application module
│   ├── common/
│   │   ├── decorators/           # @CurrentUser(), @Public()
│   │   ├── filters/              # FastifyHttpExceptionFilter
│   │   ├── guards/               # ThrottlerBehindProxyGuard, JwtAuthGuard
│   │   └── interceptors/         # DateFormatInterceptor (YYYY-MM-DD HH:mm:ss)
│   ├── database/
│   │   ├── database.module.ts    # Drizzle ORM provider & connection pool
│   │   ├── database.service.ts   # Database instance provider & auto-migrator
│   │   └── schema/
│   │       ├── index.ts
│   │       ├── users.ts          # Users table schema
│   │       └── products.ts       # Products table schema
│   └── modules/
│       ├── auth/
│       │   ├── auth.module.ts
│       │   ├── auth.controller.ts
│       │   ├── auth.service.ts
│       │   ├── dto/
│       │   │   ├── register.dto.ts
│       │   │   ├── login.dto.ts
│       │   │   └── refresh-token.dto.ts
│       │   └── strategies/
│       │       └── jwt.strategy.ts
│       └── products/
│           ├── products.module.ts
│           ├── products.controller.ts
│           ├── products.service.ts
│           └── dto/
│               ├── create-product.dto.ts
│               ├── update-product.dto.ts
│               └── query-product.dto.ts
```

---

## 3. Database Schema (Drizzle ORM)

### 3.1. `users` Table
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `serial` | Primary Key | Auto-incrementing identifier |
| `username` | `varchar(50)` | NOT NULL, UNIQUE | User login name |
| `password` | `varchar(255)` | NOT NULL | Argon2 password hash |
| `full_name` | `varchar(100)` | NULLABLE | Display name (fallback: username) |
| `refresh_token_hash` | `text` | NULLABLE | Argon2 hash of current refresh token |
| `created_at` | `timestamp with time zone` | NOT NULL, default `now()` | Registration timestamp |
| `updated_at` | `timestamp with time zone` | NOT NULL, default `now()` | Last profile update timestamp |

### 3.2. `products` Table
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `serial` | Primary Key | Auto-incrementing identifier |
| `title` | `varchar(255)` | NOT NULL | Product title/name (indexed) |
| `price` | `numeric(10, 2)` | NOT NULL | Price as decimal (e.g. 99.99) |
| `description` | `text` | NULLABLE | Product detailed description |
| `category` | `varchar(100)` | NOT NULL | Category name (indexed) |
| `images` | `text[]` | NOT NULL | Native array of image URLs (min 1) |
| `created_by` | `varchar(100)` | NOT NULL | Creator's full_name or username |
| `created_by_id` | `varchar(50)` | NOT NULL | Creator user ID as string |
| `created_at` | `timestamp with time zone` | NOT NULL, default `now()` | Creation timestamp |
| `updated_by` | `varchar(100)` | NOT NULL | Last updater's full_name or username |
| `updated_by_id` | `varchar(50)` | NOT NULL | Last updater user ID as string |
| `updated_at` | `timestamp with time zone` | NOT NULL, default `now()` | Last updated timestamp |

---

## 4. API Endpoints & Contracts

### 4.1. Authentication Endpoints (`/api/auth`)

#### `POST /api/auth/register`
- **Rate Limit**: Max 3 requests per 60 seconds (`@Throttle({ default: { limit: 3, ttl: 60000 } })`)
- **Request Body**:
  ```json
  {
    "username": "jhon_doe",
    "password": "supersecret",
    "password_confirmation": "supersecret",
    "full_name": "Jhon Doe"
  }
  ```
- **Validation**:
  - `username`: String, min 3 chars, alphanumeric & underscore. Must be unique.
  - `password`: String, min 6 chars.
  - `password_confirmation`: Must match `password`.
  - `full_name`: Optional string.
- **Response (201 Created)**:
  ```json
  {
    "id": 1,
    "username": "jhon_doe",
    "full_name": "Jhon Doe",
    "created_at": "2025-01-01 15:01:04"
  }
  ```

#### `POST /api/auth/login`
- **Rate Limit**: Max 3 requests per 60 seconds
- **Request Body**:
  ```json
  {
    "username": "jhon_doe",
    "password": "supersecret"
  }
  ```
- **Validation**:
  - Checks if user exists.
  - Verifies password hash using `argon2.verify()`.
  - Throws HTTP 401 Unauthorized if invalid.
- **Response (200 OK)**:
  ```json
  {
    "authentication_token": "<jwt-access-token>",
    "refresh_token": "<jwt-refresh-token>"
  }
  ```

#### `POST /api/auth/refresh`
- **Request Body**:
  ```json
  {
    "refresh_token": "<jwt-refresh-token>"
  }
  ```
- **Validation**:
  - Verifies JWT validity and compares with stored `refresh_token_hash`.
- **Response (200 OK)**:
  ```json
  {
    "authentication_token": "<new-jwt-access-token>",
    "refresh_token": "<new-jwt-refresh-token>"
  }
  ```

---

### 4.2. Product Endpoints (`/api/products`)

#### `GET /api/products`
- **Access**: Public
- **Caching**: In-memory cache based on query parameters (TTL: 60s)
- **Query Parameters**:
  - `search` (optional): Filter `title` via case-insensitive pattern matching (`ILIKE %search%`).
  - `category` (optional): Exact match for `category`.
  - `page` (optional, default: `1`): Page number.
  - `limit` (optional, default: `10`): Items per page.
- **Response (200 OK)**:
  ```json
  {
    "data": [
      {
        "id": 1,
        "title": "Awesome T-Shirt",
        "price": 99.99,
        "description": "High-quality cotton t-shirt",
        "category": "Clothes",
        "images": ["https://placeimg.com/640/480/any"],
        "created_at": "2025-01-01 15:01:04",
        "created_by": "Jhon Doe",
        "created_by_id": "1",
        "updated_at": "2025-01-01 15:01:04",
        "updated_by": "Jhon Doe",
        "updated_by_id": "1"
      }
    ],
    "meta": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "total_pages": 1
    }
  }
  ```

#### `GET /api/products/:id`
- **Access**: Public
- **Caching**: In-memory cache by ID (TTL: 60s)
- **Response (200 OK)**: Single product object matching the schema above.
- **Error (404 Not Found)**:
  ```json
  {
    "statusCode": 404,
    "message": "Product with ID 999 not found",
    "error": "Not Found"
  }
  ```

#### `POST /api/products`
- **Access**: Protected (`Bearer <authentication_token>`)
- **Rate Limit**: Max 1 request per 5 seconds (`@Throttle({ default: { limit: 1, ttl: 5000 } })`)
- **Request Body**:
  ```json
  {
    "title": "Awesome T-Shirt",
    "price": 99.99,
    "description": "High-quality cotton t-shirt",
    "category": "Clothes",
    "images": ["https://placeimg.com/640/480/any"]
  }
  ```
- **Validation**:
  - `title`: Required non-empty string.
  - `price`: Required positive number.
  - `category`: Required non-empty string.
  - `images`: Required array of string URLs, minimum 1 item.
  - Returns 400 Bad Request with validation details if invalid.
- **Behavior**:
  - Injects `created_by` and `updated_by` from authenticated user's `full_name` or `username`.
  - Injects `created_by_id` and `updated_by_id` from authenticated user's `id`.
  - Invalidates product list cache.
- **Response (201 Created)**: Returns the newly created product.

#### `PUT /api/products/:id`
- **Access**: Protected (`Bearer <authentication_token>`)
- **Rate Limit**: Max 1 request per 5 seconds
- **Request Body**: Partial or full update of `title`, `price`, `description`, `category`, `images`.
- **Behavior**:
  - Updates `updated_by`, `updated_by_id`, and `updated_at`.
  - Invalidates product cache for this ID and list.
- **Response (200 OK)**: Returns the updated product.
- **Error (404 Not Found)**: When product does not exist.

#### `DELETE /api/products/:id`
- **Access**: Protected (`Bearer <authentication_token>`)
- **Rate Limit**: Max 1 request per 5 seconds
- **Behavior**:
  - Removes product from database.
  - Invalidates product cache.
- **Response (200 OK)**:
  ```json
  {
    "statusCode": 200,
    "message": "Product with ID 1 successfully deleted"
  }
  ```
- **Error (404 Not Found)**: When product does not exist.

---

## 5. Non-Functional & Infrastructure Specifications

### 5.1. Fastify & CORS Configuration
- Fastify HTTP Adapter listening on `0.0.0.0:3000`.
- Global CORS configured with `origin: '*'` allowing GET, POST, PUT, DELETE, and OPTIONS from any domain.

### 5.2. Swagger / OpenAPI Documentation
- Served at `/api/docs`.
- Includes BearerAuth security definition.
- Full DTO schema documentation with examples for all status codes.

### 5.3. Date Formatting Interceptor
- Intercepts all product responses to ensure `created_at` and `updated_at` timestamps are strictly formatted as `YYYY-MM-DD HH:mm:ss`.

### 5.4. Docker & Docker Compose
- **`Dockerfile`**:
  - Multi-stage build with `node:24-alpine`.
  - Builder stage runs `npm run build` and generates Drizzle migrations.
  - Runner stage runs with minimal footprint.
- **`docker-compose.yml`**:
  - `db`: `postgres:18` with persistent volume `pgdata`, port `5432:5432`, and healthcheck.
  - `api`: builds `./Dockerfile`, port `3000:3000`, depends on `db` (healthy), auto-executes database migration on boot.
