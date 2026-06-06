# 🟣 LastBench — Your Campus. Unfiltered.

A modern anonymous college social platform built with production-grade architecture.
Inspired by Reddit, Discord, YikYak, and anonymous confession platforms.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19 + Vite + TypeScript |
| **Styling** | Tailwind CSS v4 + shadcn/ui primitives |
| **State** | TanStack Query (server) + Zustand (client) |
| **Animations** | Framer Motion |
| **Forms** | React Hook Form + Zod |
| **Backend** | Express 5 + TypeScript |
| **Database** | PostgreSQL 16 + Prisma ORM |
| **Cache** | Redis 7 |
| **Realtime** | Socket.IO |
| **Queue** | BullMQ |
| **Monorepo** | Turborepo + pnpm |
| **DevOps** | Docker + GitHub Actions |

## Features

- ✅ **Zero-Friction Guest Mode** — read-first browsing of feed, posts, and communities
- ✅ **Confetti Animations** — custom physics-based Framer Motion confetti effects on post creation
- ✅ **Anonymous/Public Posting** — toggle visibility per post
- ✅ **Multi-College Communities** — `/iitm/placements`, `/vit/memes`
- ✅ **Infinite Scroll Feed** — hot, new, top sorting
- ✅ **Upvote/Downvote System** — optimistic updates
- ✅ **Nested Comment Threads** — threaded replies
- ✅ **Polls** — multi-option with live results
- ✅ **Tags** — organize posts by topic
- ✅ **Dark Mode** — system-aware, toggle-able
- ✅ **Search** — fuzzy search across posts & communities
- ✅ **Notifications** — in-app realtime notifications
- ✅ **AI Moderation** — toxicity filtering pipeline (BullMQ)
- ✅ **Report System** — user reports + admin dashboard
- ✅ **Rate Limiting** — Redis-backed per-endpoint limits
- ✅ **Session Auth** — secure token-based sessions
- ✅ **Image Uploads** — multer with S3 abstraction
- ✅ **Mobile-First UI** — responsive with bottom nav
- ✅ **Glassmorphism** — modern blur effects
- ✅ **Micro-Animations** — Framer Motion throughout

## Project Structure

```
lastbench/
├── apps/
│   ├── web/           # React + Vite frontend
│   │   ├── src/
│   │   │   ├── components/   # UI components
│   │   │   ├── pages/        # Route pages
│   │   │   ├── stores/       # Zustand stores
│   │   │   ├── lib/          # API client, utils
│   │   │   └── App.tsx       # Router setup
│   │   └── index.html
│   └── api/           # Express backend
│       ├── src/
│       │   ├── modules/      # Feature modules
│       │   │   ├── auth/
│       │   │   ├── posts/
│       │   │   ├── comments/
│       │   │   ├── communities/
│       │   │   ├── notifications/
│       │   │   ├── search/
│       │   │   ├── admin/
│       │   │   └── upload/
│       │   ├── middleware/    # Auth, validation, rate-limit
│       │   ├── socket/       # Socket.IO handlers
│       │   ├── workers/      # BullMQ workers
│       │   ├── lib/          # Prisma, Redis, Queue
│       │   └── config/       # Env validation
│       └── prisma/           # Schema + seed
├── packages/
│   ├── shared/        # Zod schemas, types, constants
│   └── tsconfig/      # Shared TS configs
├── docker/            # Docker Compose
└── turbo.json         # Turborepo config
```

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 9+
- Docker (for PostgreSQL + Redis)

### Setup

```bash
# 1. Clone and install
git clone <repo-url> lastbench
cd lastbench
pnpm install

# 2. Start databases
docker compose -f docker/docker-compose.yml up -d

# 3. Setup environment
cp .env.example .env

# 4. Initialize database
pnpm db:generate
pnpm db:migrate --name init
pnpm db:seed

# 5. Start development
pnpm dev
```

Frontend: http://localhost:3000
Backend API: http://localhost:3001
Prisma Studio: `pnpm db:studio`

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@lastbench.app | Admin123 |
| Student | student@iitm.ac.in | Admin123 |
| Student | student@vit.ac.in | Admin123 |

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/register | ❌ | Register |
| POST | /api/auth/login | ❌ | Login |
| POST | /api/auth/logout | ✅ | Logout |
| GET | /api/auth/me | ✅ | Get current user |
| PATCH | /api/auth/profile | ✅ | Update profile |
| GET | /api/posts | ❌ | Feed (paginated) |
| GET | /api/posts/:id | ❌ | Single post |
| POST | /api/posts | ✅ | Create post |
| POST | /api/posts/:id/vote | ✅ | Vote on post |
| DELETE | /api/posts/:id | ✅ | Delete post |
| GET | /api/comments | ❌ | Comments for post |
| POST | /api/comments | ✅ | Create comment |
| GET | /api/communities | ❌ | List communities |
| GET | /api/communities/:slug | ❌ | Community detail |
| POST | /api/communities/:id/join | ✅ | Join community |
| GET | /api/notifications | ✅ | User notifications |
| GET | /api/search | ❌ | Search |
| POST | /api/admin/reports | ✅ | Submit report |
| POST | /api/upload | ✅ | Upload image |

## License

MIT
