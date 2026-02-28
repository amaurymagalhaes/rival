# Rival — Secure Blog Platform

A production-ready blogging platform with user authentication, a private dashboard, public feed, and social features (likes and comments).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS (TypeScript, strict mode) |
| ORM | Prisma 7 |
| Database | PostgreSQL (Neon) |
| Frontend | Next.js 16 (App Router, Server Components, Server Actions) |
| Auth | JWT with httpOnly cookies, bcrypt password hashing |
| Monorepo | pnpm workspaces |
| Testing | Jest (unit + component), Playwright (E2E) |
| Rate Limiting | @nestjs/throttler (60 req/min) |

## Features

- **Authentication** — Register, login, logout with JWT httpOnly cookies and bcrypt hashing
- **Blog CRUD** — Create, edit, delete posts with draft/published status and auto-generated slugs
- **Public Feed** — Cursor-based pagination, sorted by newest, with author info and engagement counts
- **Likes** — One-like-per-user with unique DB constraint and optimistic UI updates
- **Comments** — Threaded comments with author info, no page reload
- **Rate Limiting** — Global throttle guard (60 requests/minute) returning 429 on violation
- **Error Boundaries** — Graceful error handling with retry buttons on every route
- **Loading States** — Skeleton UIs matching page layouts for instant perceived performance
- **404 Handling** — Custom not-found pages for missing blog posts

## Architecture

```
rival-assessment/
├── apps/
│   ├── api/          # NestJS backend
│   │   ├── src/
│   │   │   ├── auth/       # JWT strategy, guards, register/login
│   │   │   ├── blog/       # CRUD, owner-only mutations
│   │   │   ├── feed/       # Public feed with cursor pagination
│   │   │   ├── like/       # Like/unlike with unique constraint
│   │   │   ├── comment/    # Comment CRUD
│   │   │   └── prisma/     # PrismaService (singleton)
│   │   └── prisma/
│   │       └── schema.prisma
│   └── web/          # Next.js 16 frontend
│       └── src/
│           ├── app/
│           │   ├── actions/    # Server Actions (BFF proxy)
│           │   ├── feed/       # Public feed page
│           │   ├── blogs/[slug]/ # Blog detail page
│           │   ├── dashboard/  # Authenticated dashboard
│           │   ├── login/
│           │   └── register/
│           ├── components/     # Reusable UI components
│           └── lib/            # Utilities, auth helpers
├── e2e/              # Playwright E2E tests
├── packages/         # Shared packages
└── plans/            # Implementation plans
```

### BFF Proxy Pattern

The browser never talks to NestJS directly. All data flows through Next.js Server Actions:

```
Browser → Next.js Server Actions → NestJS API → PostgreSQL
```

This keeps the API URL private, enables httpOnly cookie forwarding, and allows server-side data transformation before rendering.

## Development Methodology

All code follows **TDD Red-Green-Refactor**:

1. **Red** — Write a failing test first
2. **Green** — Implement the minimum code to pass
3. **Refactor** — Clean up while keeping tests green

The project includes 20+ tests across three levels:

- **Unit tests** — Service-level logic (auth, blog, feed, like services)
- **Component tests** — React component behavior (BlogCard, LikeButton, middleware)
- **E2E tests** — Full user journeys with Playwright (happy path, like flow)

## Setup

### Prerequisites

- Node.js >= 20
- pnpm
- PostgreSQL database (or a Neon connection string)

### Environment Variables

**apps/api/.env**
```
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret-key"
```

**apps/web/.env.local**
```
API_URL="http://localhost:4000"
```

### Install & Run

```bash
# Install dependencies
pnpm install

# Run database migrations
pnpm db:migrate

# Seed the database (optional)
pnpm --filter api prisma:seed

# Start both apps in development
pnpm dev
```

The API runs on `http://localhost:4000` and the web app on `http://localhost:3000`.

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | Public | Register a new user |
| POST | `/auth/login` | Public | Login, returns JWT in httpOnly cookie |
| GET | `/auth/me` | JWT | Get current authenticated user |
| GET | `/blogs` | JWT | List the current user's blogs |
| GET | `/blogs/:id` | JWT | Get a single blog by ID |
| POST | `/blogs` | JWT | Create a new blog |
| PATCH | `/blogs/:id` | JWT | Update a blog (owner only) |
| DELETE | `/blogs/:id` | JWT | Delete a blog (owner only) |
| GET | `/public/feed` | Public | Paginated feed of published blogs |
| GET | `/public/blogs/:slug` | Public | Get a published blog by slug |
| GET | `/public/blogs/:slug/comments` | Public | Get comments for a blog |
| POST | `/blogs/:id/like` | JWT | Like a blog |
| DELETE | `/blogs/:id/like` | JWT | Unlike a blog |
| POST | `/blogs/:id/comments` | JWT | Post a comment on a blog |

## Test Commands

```bash
# Backend unit tests
pnpm --filter api test

# Frontend component tests
pnpm --filter web test

# E2E tests (requires both apps running)
npx playwright test
```

## Tradeoffs Made

- **Server Actions as BFF** — Chose Next.js Server Actions over a standalone API client. This simplifies cookie handling and keeps the API URL server-side only, but couples the frontend more tightly to the data-fetching layer.
- **Cursor pagination over offset** — Better performance at scale (no row-skipping), but slightly more complex client-side logic for the "Load More" pattern.
- **Global JWT guard with @Public decorator** — Every route is protected by default; public routes are explicitly marked. Safer by default, but requires decorating every public endpoint.
- **httpOnly cookies over localStorage** — Prevents XSS token theft at the cost of CSRF considerations (mitigated by SameSite=Lax).
- **No separate API client layer** — Server Actions act as the abstraction. In a larger app, a dedicated API SDK would be cleaner.

## What I Would Improve

- **Refresh tokens** — Current JWTs expire without refresh. Adding a refresh token rotation scheme would improve UX.
- **Rich text editor** — Content is plain text. A markdown or WYSIWYG editor would greatly improve the writing experience.
- **Image uploads** — No image support currently. Would add S3/Cloudflare R2 integration.
- **Role-based access** — Currently binary (authenticated or not). Admin roles, moderation tools, and content flagging would be needed for production.
- **Caching layer** — Add Redis caching for the public feed and popular blog posts to reduce database load.
- **Structured logging** — Replace console output with Pino for structured JSON logs with correlation IDs.
- **CI/CD pipeline** — Add GitHub Actions for automated testing, linting, and deployment.

## Scaling to 1M Users

1. **Database** — Migrate to read replicas for feed queries. Add connection pooling (PgBouncer). Partition the likes and comments tables by blog_id for write scalability.

2. **Caching** — Put Redis in front of the public feed and blog detail endpoints. Use cache-aside with short TTLs (30-60s). Invalidate on write.

3. **CDN** — Serve the Next.js frontend from a CDN (Vercel Edge). Cache static pages and ISR for blog detail pages to eliminate server rendering on every request.

4. **API scaling** — Run multiple NestJS instances behind a load balancer. The app is stateless (JWT in cookies), so horizontal scaling is straightforward.

5. **Background jobs** — Move expensive operations (summary generation, notification emails, analytics) to a Redis-backed job queue (BullMQ) so they don't block HTTP responses.

6. **Search** — Add Elasticsearch or Meilisearch for full-text blog search instead of relying on SQL LIKE queries.

7. **Rate limiting** — Move from in-memory throttling to Redis-backed rate limiting that works across instances.
