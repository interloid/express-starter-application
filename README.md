# Express Starter Application

A production-ready Express + TypeScript backend starter with authentication, RBAC, observability, and a fully containerized workflow. Built with a functional architecture — flat, top-level functions and module singletons instead of classes and decorators.

## Features

- **Authentication** — JWT access + refresh tokens (rotation with reuse detection), cookie-based sessions, argon2id password hashing
- **Authorization** — role-based access control with granular permissions and a `manage` wildcard
- **Email flows** — verification and password reset via single-use, expiring, hashed tokens
- **Background jobs** — BullMQ + Redis for asynchronous email delivery with retries
- **Database** — Prisma 7 with PostgreSQL, multi-file schema, migrations, and idempotent seeding
- **Security** — Helmet, CORS, Redis-backed rate limiting, CSRF protection, Zod input validation
- **File uploads** — short-lived, size-capped pre-signed S3 POST URLs (client uploads directly to S3)
- **Observability** — structured logging (Pino), health checks (liveness/readiness), New Relic APM
- **API standards** — consistent response envelope, global error handler, offset + cursor pagination, URI versioning, Swagger docs generated from Zod schemas
- **Graceful shutdown** — drains HTTP, workers, and connections on SIGTERM
- **Testing** — Jest unit tests + a full e2e suite against a real database
- **Containerized** — multi-stage Docker build, Docker Compose, GitHub Actions CI

## Tech Stack

| Layer         | Technology                                    |
| ------------- | --------------------------------------------- |
| Runtime       | Node.js 24                                    |
| Framework     | Express 5                                     |
| Language      | TypeScript 5 (strict, ESM)                    |
| Database      | PostgreSQL + Prisma 7                         |
| Cache / Queue | Redis + BullMQ                                |
| Validation    | Zod                                           |
| Auth          | JWT (cookies) + argon2id                      |
| Logging       | Pino                                          |
| Monitoring    | New Relic APM                                 |
| API Docs      | `@asteasolutions/zod-to-openapi` + Swagger UI |
| Storage       | AWS S3 (pre-signed POST)                      |
| Testing       | Jest + Supertest                              |

## Architecture

This starter is deliberately **functional** — no classes, no decorators, no DI container:

- **Flat, top-level functions** — every service and handler is an exported function
- **Module singletons** — shared infrastructure (Prisma, Redis, queues) is created once in its own module and imported where needed
- **Layered modules** — each feature is `schema → service → controller → routes → docs`
- **Middleware over guards** — auth, validation, and RBAC are Express middleware

## Prerequisites

- Node.js 24+
- Docker & Docker Compose
- PostgreSQL (or use the bundled Compose service)
- Redis (or use the bundled Compose service)

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/interloid/express-starter-application.git
cd express-starter-application
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in your values — see [Environment Variables](#environment-variables).

### 3. Set up the database

```bash
npx prisma generate      # generate the Prisma client
npx prisma migrate dev   # apply migrations
npx prisma db seed       # seed roles, permissions, admin user
```

### 4. Run

**Local (hot reload):**

```bash
npm run dev
```

**Docker (app + Postgres + Redis):**

```bash
npm run docker:build
npm run docker:up
```

The API is available at `http://localhost:8080/api/v1`.

## Environment Variables

| Variable                 | Description                                               | Default / Example                                                 |
| ------------------------ | --------------------------------------------------------- | ----------------------------------------------------------------- |
| `PORT`                   | HTTP server port                                          | `8080`                                                            |
| `NODE_ENV`               | Runtime environment (`development`, `production`, `test`) | `development`                                                     |
| `APP_ENV`                | Deployment environment (`local`, `staging`, `production`) | `local`                                                           |
| `ADMIN_DEFAULT_PASSWORD` | Initial password for the seeded administrator account     | `ChangeMe123!`                                                    |
| `DATABASE_URL`           | PostgreSQL connection string                              | `postgresql://user:password@localhost:5432/db_name?schema=public` |
| `REDIS_URL`              | Redis connection URL                                      | `redis://localhost:6379`                                          |
| `JWT_ALGORITHM`          | JWT signing algorithm                                     | `HS256`                                                           |
| `JWT_ISSUER`             | JWT issuer claim                                          | `your-app-name`                                                   |
| `JWT_AUDIENCE`           | JWT audience claim                                        | `your-app-client`                                                 |
| `JWT_ACCESS_SECRET`      | Secret used to sign access tokens                         | —                                                                 |
| `JWT_ACCESS_TTL`         | Access token lifetime                                     | `1h`                                                              |
| `JWT_REFRESH_TTL`        | Refresh token lifetime                                    | `7d`                                                              |
| `FRONTEND_URL`           | Frontend application URL used in email links              | `http://localhost:3000`                                           |
| `CORS_ORIGINS`           | Comma-separated list of allowed CORS origins              | `http://localhost:3000`                                           |
| `CSRF_ENABLED`           | Enable CSRF protection                                    | `false`                                                           |
| `CSRF_SECRET`            | Secret used for CSRF token signing                        | —                                                                 |
| `RATE_LIMIT_ENABLED`     | Enable Redis-backed rate limiting                         | `true`                                                            |
| `SMTP_HOST`              | SMTP server host                                          | `smtp.gmail.com`                                                  |
| `SMTP_PORT`              | SMTP server port                                          | `587`                                                             |
| `SMTP_USER`              | SMTP username                                             | —                                                                 |
| `SMTP_PASSWORD`          | SMTP password or app password                             | —                                                                 |
| `MAIL_FROM`              | Sender email address                                      | `no-reply@example.com`                                            |
| `AWS_ACCESS_KEY_ID`      | AWS access key                                            | —                                                                 |
| `AWS_SECRET_ACCESS_KEY`  | AWS secret access key                                     | —                                                                 |
| `AWS_REGION`             | AWS region                                                | `ap-south-1`                                                      |
| `AWS_S3_BUCKET_NAME`     | S3 bucket used for uploads                                | —                                                                 |
| `NEW_RELIC_APP_NAME`     | New Relic application name                                | `express-starter-app`                                             |
| `NEW_RELIC_LICENSE_KEY`  | New Relic license key                                     | —                                                                 |
| `SWAGGER_ENABLED`        | Enable Swagger/OpenAPI documentation                      | `true`                                                            |
| `GIT_COMMIT`             | Git commit hash injected during build                     | `unknown`                                                         |
| `BUILD_TIME`             | Build timestamp injected during build                     | `unknown`                                                         |

## Project Structure

```
src/
├── server.ts                 # entry point: infra, listen, graceful shutdown
├── app.ts                    # createApp: middleware + routers + error handler
├── config/
│   └── env.config.ts         # Zod-validated environment
├── lib/                      # infrastructure singletons
│   ├── prisma.ts
│   ├── redis.ts
│   ├── s3.ts
│   └── graceful-shutdown.ts
├── common/
│   ├── api-response.ts       # ApiResponse<T>, ApiError, pagination types
│   ├── response.ts           # sendSuccess / sendPaginated / sendCursor
│   ├── error/
│   │   ├── http-errors.ts    # typed HTTP errors
│   │   └── error-handler.middleware.ts
│   └── pagination.ts
├── security/
│   ├── security.ts           # helmet, cors, trust proxy, csrf (ordered)
│   ├── rate-limit.ts         # Redis-backed limiter tiers
│   ├── csrf.ts
│   └── validate.ts           # Zod validation
```
