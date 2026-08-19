# LastBench

**A campus community platform for the conversations students usually have somewhere else.**

LastBench gives college communities a focused place to share updates, ask questions, run polls, discover groups, and participate anonymously when the topic calls for it. It is built as a production-minded TypeScript monorepo with a React client, an Express API, PostgreSQL, Redis, realtime notifications, background moderation, and CI.

## Why LastBench

Campus conversation tends to fragment across informal chats, anonymous forums, and broad social networks. LastBench brings that activity into college-scoped communities while preserving the low-friction, pseudonymous experience students expect.

- **Campus-first spaces** for placement news, academics, memes, events, and everything in between.
- **Choice of identity** with public or anonymous posts.
- **Thoughtful participation** through votes, nested comments, polls, tags, reports, and notifications.
- **Operator tooling** with report handling and an admin moderation queue.
- **Built to grow** with database-backed data, Redis rate limiting, Socket.IO, and BullMQ workers.

## Product Surface

| Area | What it supports |
| --- | --- |
| Feed | Cursor-paginated feed, hot/new/top ordering, optimistic voting, and infinite scrolling |
| Communities | College-aware groups such as `g/placements` and `g/memes`, membership, discovery, and search |
| Discussion | Rich posts, image uploads, tags, polls, nested replies, and post reporting |
| Identity | Email/password sessions, optional Google OAuth, onboarding, profiles, and anonymous posting |
| Realtime | In-app notifications delivered through Socket.IO |
| Moderation | Redis-backed rate limits, report workflow, queue-backed post checks, and admin review tools |

## Architecture

```text
                         React 19 + Vite
                         Tailwind + Radix UI
                                  |
                    HTTP API + Socket.IO client
                                  |
                        Express 5 API service
          auth | posts | comments | groups | search | admin
                    |                 |                 \
               PostgreSQL 16       Redis 7          BullMQ workers
                 Prisma ORM      cache/rate limits    moderation jobs
```

This is a pnpm/Turborepo workspace. Shared Zod schemas and TypeScript types keep client and server contracts aligned.

```text
apps/
  web/                 React single-page application
  api/                 Express API, Prisma schema, Socket.IO, workers
packages/
  shared/              Shared Zod schemas, types, and constants
  tsconfig/            Shared TypeScript configuration
.github/workflows/     CI for type checks, tests, and production builds
```

## Stack

| Concern | Technology |
| --- | --- |
| Client | React 19, Vite, TypeScript, Tailwind CSS, Radix UI |
| Data fetching and state | TanStack Query, Zustand, React Hook Form, Zod |
| API | Express 5, TypeScript, Socket.IO |
| Persistence | PostgreSQL 16, Prisma ORM |
| Performance and jobs | Redis 7, BullMQ |
| Quality | Vitest, TypeScript, GitHub Actions |
| Local infrastructure | Docker Compose |

## Quick Start

### Prerequisites

- Node.js 22 or newer
- pnpm 9 (Corepack is recommended)
- Docker Desktop for PostgreSQL and Redis

### Run locally

```bash
git clone <your-repository-url> lastbench
cd lastbench

corepack enable
pnpm install

# Start PostgreSQL on :5434 and Redis on :6380.
docker compose up -d

# Create local API configuration.
Copy-Item apps/api/.env.example apps/api/.env

# Generate the Prisma client, apply migrations, and load local demo data.
pnpm db:generate
pnpm db:migrate --name init
pnpm db:seed

# Start the web app and API together.
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The API readiness endpoint is [http://localhost:3001/health/ready](http://localhost:3001/health/ready).

For macOS/Linux, replace the PowerShell `Copy-Item` command with:

```bash
cp apps/api/.env.example apps/api/.env
```

### Demo accounts

The seed command creates these accounts for local evaluation:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@lastbench.app` | `Admin123` |
| Student | `student@iitm.ac.in` | `Admin123` |
| Student | `student@vit.ac.in` | `Admin123` |

These credentials are strictly for local development. The demo seed deletes existing application data before rebuilding the local dataset and is programmatically blocked when `NODE_ENV=production`. Never use it against a live database.

## Everyday Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start all workspace applications in development mode |
| `pnpm build` | Create production builds |
| `pnpm lint` | Run TypeScript checks for the web workspace |
| `pnpm test` | Run the API test suite through Turborepo |
| `pnpm db:generate` | Generate the Prisma client |
| `pnpm db:migrate --name <name>` | Create and apply a development migration |
| `pnpm db:seed` | Reset a local development database with demo data; blocked in production |
| `pnpm db:studio` | Open Prisma Studio |
| `docker compose down` | Stop local PostgreSQL and Redis without removing data |

## Configuration

Copy [`apps/api/.env.example`](apps/api/.env.example) to `apps/api/.env` before starting the API. The defaults are ready for the local Docker Compose services.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection URL |
| `REDIS_URL` | Yes | Redis connection URL for caching, queues, and rate limits |
| `BETTER_AUTH_SECRET` | Yes | Long, random session signing secret |
| `BETTER_AUTH_URL` | Yes | Public API URL used in authentication flows |
| `CORS_ORIGIN` | Yes | Frontend origin allowed to call the API |
| `FRONTEND_URL` | Yes | Public frontend URL used for redirects |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | No | Enable Google OAuth |
| `SMTP_*` or `RESEND_*` | No | Enable production email delivery |
| `MAX_FILE_SIZE` | No | Upload limit in bytes; defaults to 50 MB |

Never commit a populated `.env` file. For production, use your platform's encrypted environment-variable store and set `NODE_ENV=production`.

## Authentication and OAuth

LastBench supports email/password sessions and optional Google OAuth. When enabling Google OAuth, configure the callback through the frontend origin so the browser receives a first-party session cookie:

```text
http://localhost:3000/api/auth/google/callback
https://<your-frontend-domain>/api/auth/google/callback
```

Add the matching callback URL to Google Cloud Console and set `GOOGLE_CALLBACK_URL` and `FRONTEND_URL` for the target environment. See [`apps/api/.env.example`](apps/api/.env.example) for the complete configuration reference.

## API Overview

The API is namespaced under `/api` and returns JSON. Public read endpoints let visitors explore the platform before signing in; write operations and personal data require an authenticated session.

| Domain | Example endpoints |
| --- | --- |
| Auth | `POST /api/auth/login`, `POST /api/auth/register`, `GET /api/auth/me` |
| Posts | `GET /api/posts`, `POST /api/posts`, `POST /api/posts/:id/vote` |
| Comments | `GET /api/comments`, `POST /api/comments` |
| Communities | `GET /api/communities`, `POST /api/communities/:id/join` |
| Discovery | `GET /api/search` |
| Notifications | `GET /api/notifications` |
| Moderation | `POST /api/admin/reports` |
| Uploads | `POST /api/upload` |

The readiness check at `GET /health/ready` verifies the API's database and Redis dependencies.

## Quality Bar

Every pull request and push to `main` runs GitHub Actions that:

1. installs dependencies from the lockfile;
2. runs TypeScript checks and linting;
3. applies Prisma migrations to ephemeral PostgreSQL and Redis services;
4. runs the test suite; and
5. creates production builds.

Before opening a pull request, run:

```bash
pnpm turbo type-check
pnpm lint
pnpm test
pnpm build
```

## Deployment Notes

The included [`Dockerfile`](Dockerfile) produces a production API image. The web app is a Vite build and can be deployed to a static hosting provider with SPA fallback configured. Provision managed PostgreSQL and Redis, run Prisma migrations during deployment, and set the production values described in the Configuration section.

For user-generated uploads, configure the included Supabase Storage integration or another durable object store rather than relying on a container-local directory. Configure explicit frontend origins, secure secrets, and a strong `BETTER_AUTH_SECRET` before accepting traffic.

For production data handling, including the server-only Supabase RLS policy and backup/restore commands, see [`docs/data-operations.md`](docs/data-operations.md). Do not seed or reset a production database.

## License

Distributed under the [MIT License](LICENSE).
