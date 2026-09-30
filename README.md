# Product Management & Authentication REST API

Production-ready Backend REST API built with NestJS 12.1.1, Fastify, PostgreSQL 18, Drizzle ORM, Argon2, and Docker Desktop.

## Tech Stack
- **Framework**: NestJS 12.1.1
- **HTTP Engine**: Fastify (`@nestjs/platform-fastify`)
- **Runtime**: Node.js 24 (`node:24-alpine`)
- **Database**: PostgreSQL 18 (`postgres:18`)
- **ORM & Migrations**: Drizzle ORM (`drizzle-orm`, `drizzle-kit`, `postgres`)
- **Password & Token Security**: Argon2 (`argon2`), JWT (`@nestjs/jwt`, `passport-jwt`)
- **Rate Limiting**: `@nestjs/throttler` (Auth: max 3/60s, Products create/update/delete: max 1/5s)
- **Caching**: `@nestjs/cache-manager` (in-memory with eviction on mutations)
- **Documentation**: Swagger OpenAPI at `/api/docs`
- **Containerization**: Docker & Docker Compose (Docker Desktop compatible)

---

## Quick Start with Docker Desktop

Run the complete backend stack with a single command:

```bash
docker compose up --build
```

The services will start:
- **API URL**: `http://localhost:3000`
- **Interactive Swagger Documentation**: `http://localhost:3000/api/docs`
- **PostgreSQL 18**: `localhost:5432`

---

## API Endpoints Summary

### 1. Authentication Endpoints (`/api/auth`)
| Method | Endpoint | Description | Rate Limit |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new user | Max 3 requests / 60s |
| `POST` | `/api/auth/login` | Login user, returns `authentication_token` & `refresh_token` | Max 3 requests / 60s |
| `POST` | `/api/auth/refresh` | Exchange refresh token for new access & refresh tokens | - |

#### Register Request Example:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "jhon_doe",
    "password": "supersecret",
    "password_confirmation": "supersecret",
    "full_name": "Jhon Doe"
  }'
```

#### Login Request Example:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "jhon_doe",
    "password": "supersecret"
  }'
```
Response:
```json
{
  "authentication_token": "eyJhbGciOi...",
  "refresh_token": "eyJhbGciOi..."
}
```

---

### 2. Product Management Endpoints (`/api/products`)
| Method | Endpoint | Description | Auth Required | Rate Limit |
|---|---|---|---|---|
| `GET` | `/api/products` | List all products with pagination and filters | No (Public, Cached) | - |
| `GET` | `/api/products/:id` | Get detail of a product | No (Public, Cached) | - |
| `POST` | `/api/products` | Create a new product | Yes (Bearer Token) | Max 1 request / 5s |
| `PUT` | `/api/products/:id` | Update an existing product | Yes (Bearer Token) | Max 1 request / 5s |
| `DELETE` | `/api/products/:id` | Delete a product by ID | Yes (Bearer Token) | Max 1 request / 5s |

#### List Products with Filtering & Pagination:
```bash
curl "http://localhost:3000/api/products?search=shirt&category=Clothes&page=1&limit=10"
```

#### Create Product (Authorized):
```bash
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <authentication_token>" \
  -d '{
    "title": "Awesome T-Shirt",
    "price": 99.99,
    "description": "High-quality cotton t-shirt",
    "category": "Clothes",
    "images": ["https://placeimg.com/640/480/any"]
  }'
```

Sample Product Response (formatted strictly according to PDF spec):
```json
{
  "id": 1,
  "title": "Awesome T-Shirt",
  "price": 99.99,
  "description": "High-quality cotton t-shirt",
  "category": "Clothes",
  "images": [
    "https://placeimg.com/640/480/any"
  ],
  "created_at": "2025-01-01 15:01:04",
  "created_by": "Jhon Doe",
  "created_by_id": "1",
  "updated_at": "2025-01-01 15:01:04",
  "updated_by": "Jhon Doe",
  "updated_by_id": "1"
}
```

---

## Local Development (Without Docker)

1. Make sure PostgreSQL 18 is running locally.
2. Setup environment:
   ```bash
   cp .env.example .env
   ```
3. Run migrations:
   ```bash
   npm run db:generate
   ```
4. Start dev server:
   ```bash
   npm run start:dev
   ```
5. Run tests:
   ```bash
   npm test
   ```
