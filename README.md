<div align="center">

# 🎓 LastBench

**The modern, college-first community platform for campus discussions, anonymous confessions, academic resources, and campus life.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React 19](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Express 5](https://img.shields.io/badge/Express-5.0-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Turborepo](https://img.shields.io/badge/Turborepo-2.9-EF4444?logo=turborepo&logoColor=white)](https://turbo.build/)
[![Vitest](https://img.shields.io/badge/Vitest-4.1-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[Live Demo](https://last-bench-web.vercel.app) • [Architecture](#-architecture) • [Features](#-key-features) • [Getting Started](#-getting-started) • [API Overview](#-api-specification) • [Engineering Highlights](#-engineering-highlights)

</div>

---

## 🌟 Overview

Campus conversations often fragment across unstructured WhatsApp groups, ephemeral Discord servers, and informal gossip apps. **LastBench** brings that energy into a dedicated, college-aware platform combining the best of **Reddit**, **Twitter**, and campus micro-communities.

Students can share placement experiences, debate campus events, ask academic doubts, vote on live polls, upload high-res images and campus videos, or post completely anonymously with zero trace.

---

## 🚀 Key Features

### 🏛️ Campus-First Communities (`g/slug`)
- **Subreddit-Style Groups**: Discover department channels, hobby hubs, and clubs (e.g. `g/placements`, `g/memes`, `g/sports`, `g/academic`).
- **Community Customization**: Rich full-bleed cover banners, custom avatars, group rules, and member roles (Owner, Moderator, Student).
- **Default Campus Square**: Campus-wide general feed ensuring immediate engagement for newly joined freshmen.

### 🎭 Flexible Identity & Anonymous Posting
- **Dual Identity Modes**: Toggle between posting as your public handle (`u/username`) or posting **Anonymously** with a single click.
- **Zero-Trace Privacy**: Anonymous posts strip all author metadata at the API boundary, guaranteeing unbiased sharing and open confessions.

### 🎬 Interactive Feed & Smart Media Engine
- **Reddit/Insta-Style Auto-Play Videos**: In-feed videos auto-play when scrolled into the viewport and auto-pause when scrolled away to preserve system resources and bandwidth.
- **Floating Controls & Scrubbing**: Instant mute/unmute audio pill, smooth custom seek bar, animated play/pause overlay, and full-screen lightbox.
- **Rich Media & Polls**: Multi-image grids (up to 4 images per post), live interactive polls with real-time percentage bars, and external resource link previews.

### 💬 Deep Discussion & Community Moderation
- **Multi-Level Nested Comments**: Recursive threaded replies with optimistic upvoting/downvoting and zero cursor-jump typing stability.
- **Content Moderation Pipeline**: BullMQ background workers for automated content validation and keyword checks.
- **Role-Based Access Control (RBAC)**: Comprehensive report management, multi-target validation, and privilege escalation guards preventing moderator abuse.

### ⚡ Real-Time Notifications
- **Socket.IO Engine**: Instant live notifications when someone upvotes your post, replies to your comment, or mentions your handle.

---

## 🏗️ Architecture

LastBench is structured as a production-grade TypeScript monorepo orchestrated with **Turborepo** and **pnpm workspaces**. Client and server contracts share unified Zod validation schemas and TypeScript types.

```text
                               ┌─────────────────────────┐
                               │   React 19 Single Page  │
                               │   (Vite + Tailwind CSS) │
                               └────────────┬────────────┘
                                            │ HTTP / WebSocket
                               ┌────────────▼────────────┐
                               │     Express 5.0 API     │
                               │   Socket.IO Gateway     │
                               └──────┬──────┬──────┬────┘
                                      │      │      │
                   ┌──────────────────┘      │      └─────────────────┐
                   ▼                         ▼                        ▼
        ┌──────────────────┐      ┌──────────────────┐     ┌──────────────────┐
        │  PostgreSQL 16   │      │     Redis 7      │     │  BullMQ Workers  │
        │   (Prisma ORM)   │      │  (Rate Limits &  │     │ (Content Checks  │
        │                  │      │  Sliding Window) │     │ & Hourly Purges) │
        └──────────────────┘      └──────────────────┘     └──────────────────┘
```

### Monorepo Structure

```text
├── apps/
│   ├── web/               # React 19 frontend application (Vite, TanStack Query, Tailwind)
│   └── api/               # Express 5 backend API (Prisma, Socket.IO, BullMQ, Passport)
├── packages/
│   ├── shared/            # Shared Zod validation schemas, domain types, and constants
│   └── tsconfig/          # Standardized TypeScript compiler configurations
├── docker/                # Local development Docker Compose services
└── .github/workflows/     # Automated CI/CD pipeline (Vitest, Typecheck, Prisma, Builds)
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, Vite, TypeScript, Tailwind CSS, Lucide Icons, Framer Motion |
| **State & Data Fetching** | TanStack Query (React Query v5), Zustand |
| **Backend API** | Express 5, Node.js (v22+), Socket.IO, Passport.js |
| **Database & ORM** | PostgreSQL 16, Prisma ORM 6 |
| **Caching & Queues** | Redis 7, BullMQ (background workers) |
| **Cloud Storage** | Supabase Storage CDN (with resilient local disk fallback) |
| **Validation & Types** | Zod (shared full-stack schemas), TypeScript 5.9 |
| **Testing & CI/CD** | Vitest 4.1, GitHub Actions CI, Docker Compose |

---

## 🏁 Getting Started

### Prerequisites
- **Node.js**: `v22.0.0` or higher
- **pnpm**: `v9.0.0` or higher (`corepack enable` recommended)
- **Docker Desktop**: For running local PostgreSQL and Redis instances

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/kishanppatel-dev/LastBench.git
cd LastBench

corepack enable
pnpm install
```

### 2. Launch Local Infrastructure

Start PostgreSQL (port `5434`) and Redis (port `6380`):

```bash
docker compose up -d
```

### 3. Setup Environment Variables

Copy the environment template:

```bash
# Windows (PowerShell)
Copy-Item apps/api/.env.example apps/api/.env

# macOS / Linux
cp apps/api/.env.example apps/api/.env
```

### 4. Database Setup & Migrations

```bash
pnpm db:generate
pnpm db:migrate --name init
pnpm db:seed
```

### 5. Start Development Servers

```bash
pnpm dev
```

- **Frontend Client**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:3001](http://localhost:3001)
- **API Readiness Check**: [http://localhost:3001/health/ready](http://localhost:3001/health/ready)

---

## 📜 Everyday Scripts

| Command | Description |
| :--- | :--- |
| `pnpm dev` | Starts all monorepo workspaces concurrently in hot-reload dev mode |
| `pnpm build` | Compiles optimized production builds across all applications |
| `pnpm turbo type-check` | Executes strict TypeScript type validation across the entire repository |
| `pnpm test` | Runs the full Vitest automated test suite |
| `pnpm db:generate` | Regenerates Prisma Client types from `schema.prisma` |
| `pnpm db:migrate` | Applies development database migrations |
| `pnpm db:studio` | Launches visual Prisma Studio database manager |
| `docker compose down` | Safely stops background PostgreSQL and Redis containers |

---

## 🔐 Engineering & Security Highlights

### 🛡️ 1. Zero-Trust Authentication & OAuth CSRF Defense
- Session tokens are **SHA-256 hashed** prior to database storage, ensuring database leaks cannot compromise active user sessions.
- Google OAuth implementation uses cryptographically random `state` tokens stored in short-lived (10m TTL), `httpOnly`, `SameSite=None`, `secure` cookies, preventing CSRF replay attacks during authentication dances.

### ⏱️ 2. Resilient Sliding-Window Rate Limiting
- Employs Redis for high-throughput distributed rate limiting with isolated thresholds for authentication (10 req/15m) and general API endpoints (120 req/m).
- **In-Memory Sliding Window Fallback**: If Redis experiences an upstream outage or transient disconnection, the API automatically falls back to an in-memory sliding window counter with periodic 5-minute memory eviction, ensuring auth endpoints never fail-open to brute-force attacks.

### ⚡ 3. Graceful Worker Teardown
- Background BullMQ workers and job queues are tracked via an internal registry.
- On `SIGTERM` / `SIGINT` termination signals, the server drains and gracefully shuts down all active workers and queue handles before closing Prisma and Redis connections.

### 🧼 4. 100% Strict Type Safety
- Zero `as any`, zero `as never`, and zero `as unknown as` assertions across both frontend and backend application code.
- Shared Zod schemas strictly validate and infer input/output types across HTTP boundaries.

---

## 📡 API Specification

| Domain | Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/auth/register` | Public | Create student account |
| **Auth** | `POST` | `/api/auth/login` | Public | Authenticate session |
| **Auth** | `GET` | `/api/auth/me` | Session | Retrieve current authenticated user |
| **Posts** | `GET` | `/api/posts` | Public | Paginated feed (sort: `hot`, `new`, `top`) |
| **Posts** | `POST` | `/api/posts` | Session | Create post (text, image, video, poll, link) |
| **Posts** | `POST` | `/api/posts/:id/vote` | Session | Upvote or downvote post |
| **Comments**| `GET` | `/api/comments` | Public | Fetch threaded comments for a post |
| **Comments**| `POST` | `/api/comments` | Session | Post comment or nested reply |
| **Groups** | `GET` | `/api/communities` | Public | Explore and search campus communities |
| **Groups** | `POST` | `/api/communities` | Session | Create a new student community |
| **Uploads** | `POST` | `/api/upload` | Verified | Upload media to CDN (up to 50MB) |
| **Admin** | `POST` | `/api/admin/reports` | Session | Submit content report for moderation |
| **Admin** | `GET` | `/api/admin/reports` | Moderator | Review reported content queue |

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
