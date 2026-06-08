# DNSC Hostel Management System (HMS)

A production-ready Hostel Management System built for DNSC Hostel.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | NestJS, TypeScript |
| Database | PostgreSQL via Prisma ORM |
| Auth | JWT + Refresh Tokens |
| Infrastructure | Docker, Docker Compose |

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 20+
- pnpm (recommended)

### Development Setup

```bash
# 1. Clone and enter the project
git clone <repo-url>
cd hms

# 2. Copy environment variables
cp .env.example .env
# Edit .env with your values

# 3. Start all services via Docker
docker-compose up -d

# 4. Run Prisma migrations (first time)
cd apps/api
npx prisma migrate dev

# 5. Seed the database
npx prisma db seed
```

### Manual Setup (without Docker)

```bash
# API
cd apps/api
pnpm install
pnpm run start:dev

# Web (separate terminal)
cd apps/web
pnpm install
pnpm run dev
```

## Project Structure

```
hms/
├── apps/
│   ├── web/          # Next.js 15 frontend
│   └── api/          # NestJS backend
├── docker/           # Docker configs
│   ├── postgres/
│   └── nginx/
├── docker-compose.yml
├── docker-compose.prod.yml
└── .env.example
```

## Roles

| Role | Description |
|---|---|
| `HOSTEL_MANAGER` | Full administrative access |
| `FRONT_DESK` | Operational access (reservations, check-in/out) |

## Default Credentials (Dev Seed)

| Role | Email | Password |
|---|---|---|
| Hostel Manager | manager@dnsc-hostel.com | Manager@123 |
| Front Desk | frontdesk@dnsc-hostel.com | FrontDesk@123 |

> **⚠️ Change all credentials in production!**
