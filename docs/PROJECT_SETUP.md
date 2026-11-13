# INVITE STUDIO - Project Setup Guide

This guide covers setting up INVITE STUDIO locally and configuring the PostgreSQL database with Prisma.

---

## 1. System Requirements
- Node.js LTS (v18.x, v20.x, or v22.x)
- npm (v9.x or v10.x+)
- PostgreSQL 14+ (Local, Docker, Neon, or Supabase)

---

## 2. PostgreSQL Connection Configuration

INVITE STUDIO uses **Prisma ORM** with **PostgreSQL**.

### Option A: Online Database (Recommended)
1. **Neon Serverless PostgreSQL** ([neon.tech](https://neon.tech)):
   - Create a free project.
   - Copy the pooled or direct connection string:
     `DATABASE_URL="postgresql://user:password@ep-sample.us-east-2.aws.neon.tech/neondb?sslmode=require"`
2. **Supabase PostgreSQL** ([supabase.com](https://supabase.com)):
   - Create a free project.
   - Copy the URI from Project Settings -> Database:
     `DATABASE_URL="postgresql://postgres:password@db.xyz.supabase.co:5432/postgres"`

### Option B: Local PostgreSQL (or Docker)
- Local PostgreSQL instance:
  `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/invite_studio?schema=public"`
- If using Docker:
  ```bash
  docker run --name invite-studio-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=invite_studio -p 5432:5432 -d postgres:16-alpine
  ```

---

## 3. Environment Setup

1. Copy `.env.example` in `apps/api`:
   ```bash
   cp apps/api/.env.example apps/api/.env
   ```
2. Set your `DATABASE_URL` in `apps/api/.env`.
3. Verify dev OTP settings:
   ```env
   NODE_ENV=development
   ENABLE_DEMO_OTP=true
   DEMO_OTP=12345
   ```

4. Copy `.env.example` in `apps/web`:
   ```bash
   cp apps/web/.env.example apps/web/.env
   ```

---

## 4. Install & Initialize Database

```bash
# 1. Install all dependencies across root and workspaces
npm install

# 2. Validate Prisma Schema
npx --workspace=@smart-invitation/api prisma validate

# 3. Generate Prisma Client
npm run prisma:generate

# 4. Apply Database Migrations (requires DATABASE_URL configured)
npm run prisma:migrate
```

---

## 5. Development Commands

| Command | Description |
|---|---|
| `npm run dev:api` | Starts Express backend on port `5000` with nodemon |
| `npm run dev:web` | Starts Vite React frontend on port `5173` |
| `npm run build` | Builds packages and web application |
| `npm run prisma:studio` | Opens Prisma Studio UI to inspect database tables |
