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

| Variable                                       | Description                                    | Default                  |
| ---------------------------------------------- | ---------------------------------------------- | ------------------------ |
| `NODE_ENV`                                     | Build mode (`development`/`production`/`test`) | `development`            |
| `APP_ENV`                                      | Deployment target (`local`/`production`)       | `local`                  |
| `PORT`                                         | Server port                                    | `8080`                   |
| `DATABASE_URL`                                 | PostgreSQL connection string                   | —                        |
| `REDIS_URL`                                    | Redis connection string                        | `redis://localhost:6379` |
| `JWT_ACCESS_SECRET`                            | Access token secret (≥32 chars)                | —                        |
| `JWT_ACCESS_TTL`                               | Access token lifetime                          | `15m`                    |
| `JWT_REFRESH_TTL`                              | Refresh token lifetime                         | `7d`                     |
| `FRONTEND_URL`                                 | Frontend base URL (for email links)            | `http://localhost:3000`  |
| `CORS_ORIGINS`                                 | Comma-separated allowed origins                | `http://localhost:3000`  |
| `CSRF_ENABLED`                                 | Enable CSRF protection                         | `false`                  |
| `CSRF_SECRET`                                  | CSRF signing secret                            | —                        |
| `RATE_LIMIT_ENABLED`                           | Enable rate limiting (set `false` in tests)    | `true`                   |
| `SMTP_HOST` / `SMTP_PORT`                      | SMTP server                                    | —                        |
| `SMTP_USER` / `SMTP_PASSWORD`                  | SMTP credentials                               | —                        |
| `MAIL_FROM`                                    | Sender address                                 | —                        |
| `AWS_REGION`                                   | S3 region                                      | —                        |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`  | S3 credentials                                 | —                        |
| `AWS_S3_BUCKET_NAME`                           | Upload bucket                                  | —                        |
| `NEW_RELIC_ENABLED`                            | Enable New Relic agent                         | `false`                  |
| `NEW_RELIC_APP_NAME` / `NEW_RELIC_LICENSE_KEY` | New Relic config (required when enabled)       | —                        |
| `SWAGGER_ENABLED`                              | Expose Swagger docs                            | `true`                   |
| `LOG_LEVEL`                                    | Pino log level                                 | `info`                   |
| `GIT_COMMIT` / `BUILD_TIME`                    | Injected at Docker build                       | `unknown`                |

> **Never commit `.env`.** Use `.env.example` as the template.

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
