# INVITE STUDIO

> **"Create. Invite. Celebrate."**  
> A premium, modern, multi-tenant invitation and guest management SaaS platform.

---

## Architecture Overview

- **`apps/web`**: React 18 + Vite + Tailwind CSS frontend (Host workspace, invitee RSVP, and Super Admin)
- **`apps/api`**: Node.js + Express + Prisma ORM modular-monolith backend
- **`packages/shared`**: Cross-cutting Zod validation schemas, business constants, and utilities
- **`docs`**: PRD, architecture decisions, database documentation, and RSVP privacy specs
- **`infra`**: Deployment and Docker configuration

---

## Technology Stack

- **Frontend**: React 18, Vite, React Router v6, Tailwind CSS, Lucide React, Axios
- **Backend**: Node.js (ES modules), Express, Helmet, CORS, Express Rate Limit
- **Database**: PostgreSQL with Prisma ORM (Supports Neon, Supabase, and local PostgreSQL)
- **Authentication**: Mobile number + 5-digit OTP (Provider-based; dev demo fallback `12345`)
- **Guest Import**: ExcelJS with pre-validation and deduplication
- **Multi-Tenancy**: Server-enforced row-level tenant scoping on all queries

---

## Getting Started

### 1. Prerequisites
- Node.js LTS (v18+ or v22+)
- npm (v9+)
- PostgreSQL database (Neon, Supabase, or local instance)

### 2. Environment Configuration
Copy sample environment files:
```bash
# Backend environment
cp apps/api/.env.example apps/api/.env

# Frontend environment
cp apps/web/.env.example apps/web/.env
```

Edit `apps/api/.env` with your PostgreSQL connection string:
```env
# Neon / Supabase / Local PostgreSQL
DATABASE_URL="postgresql://username:password@ep-sample.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

### 3. Installation & Database Generation
```bash
# Install dependencies across all monorepo workspaces
npm install

# Generate Prisma Client
npm run prisma:generate

# Run Prisma database migrations (when DATABASE_URL is configured)
npm run prisma:migrate
```

### 4. Running the Development Servers
```bash
# Run both Frontend and Backend concurrently (or in separate terminals)
# Frontend: http://localhost:5173
npm run dev:web

# Backend: http://localhost:5000
npm run dev:api
```

### 5. Verifying Health Endpoint
Visit or query `http://localhost:5000/api/health` to confirm server status and database connectivity.
