# Secure Blog Platform — Implementation Plan Overview

## Project Summary

Build a production-ready blog platform with user authentication, blog CRUD, public feed, likes, and comments. NestJS backend + Next.js 15 frontend + PostgreSQL (Prisma).

## Final Architecture Decisions (Resolved via 3 rounds of debate)

| Decision | Resolution | Rationale |
|----------|-----------|-----------|
| JWT Storage | httpOnly cookies via Next.js Server Action proxy | Security (15% weight). Browser never talks to NestJS directly. Cookies stay same-origin on Vercel. |
| Pagination | Cursor-based (`take + 1` pattern) | Less code than offset + COUNT(*), O(1) performance, "Load More" UX |
| Slug Generation | Clean slug first, nanoid(6) suffix on P2002 collision | Clean URLs by default, race-condition-free via DB constraint |
| State Management | Server Components + Server Actions + useOptimistic | Zero client-side libraries. Native Next.js 15 paradigm. |
| Auth Guard | Global JwtAuthGuard + @Public() decorator opt-out | Default-secure: every new endpoint is protected unless explicitly public |
| Monorepo | Simple pnpm workspaces, NO Turborepo | 2 apps don't justify Turborepo overhead |
| Testing | TDD: ~18 tests (Jest + Playwright), tests written FIRST | Red-Green-Refactor cycle; tests drive design and prove engineering maturity |
| Rate Limiting | @nestjs/throttler (guaranteed bonus) | 3 lines of config for guaranteed 5% bonus points |
| Refresh Tokens | SKIP | Bonus feature, 1-2h implementation for 0% core grade impact |
| CSS | Tailwind CSS + shadcn/ui | Architecture over aesthetics, minimal CSS time |
| IDs | CUIDs | URL-friendly, sortable, collision-resistant |
| bcrypt | 12 rounds | Free security upgrade over default 10 |
| BullMQ/Redis | SKIP (unless time remains) | Requires Redis infrastructure, terrible ROI for assessment |
| Pino Logging | Nice-to-have in Phase 4 | Low effort if time permits |

## Phase Overview

| Phase | Focus | Time | Key Deliverables |
|-------|-------|------|-----------------|
| [Phase 1](./phase-1-foundation.md) | Foundation & Skeleton Deploy | 1.5h | Monorepo, Prisma schema, DB provisioned, deploy skeleton |
| [Phase 2](./phase-2-auth-blog.md) | Auth & Blog CRUD | 2.5h | Full auth flow, blog CRUD, public blog view, tests |
| [Phase 3](./phase-3-feed-social.md) | Feed & Social Features | 2.0h | Public feed, likes (optimistic UI), comments, rate limiting |
| [Phase 4](./phase-4-polish-deploy.md) | Polish, Deploy, README | 1.5h | Final deployment, error states, responsiveness, README |
| [Phase 5](./phase-5-cortex-one.md) | Cortex One | 1.0h | Platform function (separate deliverable) |
| Buffer | Unknowns | 1.5h | Deployment debugging, overruns, optional Pino logging |

**Total: 8.5h active + 1.5h buffer = 10h max**

## Tech Stack

- **Backend**: NestJS 11, TypeScript (strict), Prisma 6, PostgreSQL
- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Auth**: JWT (24h expiry), bcrypt (12 rounds), httpOnly cookies via BFF proxy
- **Database**: Neon (serverless PostgreSQL)
- **Deployment**: Vercel (frontend), Railway (backend), Neon (database)
- **Testing**: Jest (backend + frontend), Playwright (E2E)

## Evaluation Weight Mapping

| Criteria | Weight | Primary Phase |
|----------|--------|--------------|
| Backend Architecture | 25% | Phase 2 + 3 |
| Prisma & DB Modeling | 20% | Phase 1 |
| Frontend Architecture & UX | 25% | Phase 2 + 3 |
| Security Practices | 15% | Phase 2 (auth, guards, cookies) |
| Feed/Like/Comment | 10% | Phase 3 |
| Advanced Concepts (Bonus) | 5% | Phase 3 (rate limiting) + Phase 4 (Pino) |

## Monorepo Structure

```
hyperblog-blog/
├── apps/
│   ├── api/          # NestJS backend (13 endpoints)
│   └── web/          # Next.js 15 frontend (App Router)
├── packages/
│   └── shared/       # Shared TypeScript types
├── pnpm-workspace.yaml
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## Data Flow (BFF Proxy Pattern)

```
Browser → Next.js Server (same origin) → NestJS API (server-to-server)
         [httpOnly cookie]               [Bearer token]
```

- Browser NEVER talks to NestJS directly
- Cookies stay same-origin (Vercel domain)
- NestJS is a pure stateless REST API with Bearer auth
- `API_URL` env var is server-only (not NEXT_PUBLIC_)

## Risk Mitigations

| Risk | Mitigation |
|------|-----------|
| Server Action proxy too complex | Fall back to localStorage + Bearer if blocked >30 min |
| Cursor pagination frontend issues | "Load More" is well-documented; offset is 15-min fallback |
| Railway deployment fails | Render or Fly.io as backup providers |
| Phase 2 runs over (auth complexity) | Time-box auth backend to 45 min, simplify if needed |
| Cortex One platform confusing | Timebox exploration to 15 min, build simplest useful function |

## TDD Methodology

Every feature follows the **Red-Green-Refactor** cycle:

1. **RED**: Write a failing test that describes the expected behavior
2. **GREEN**: Write the minimum implementation to make the test pass
3. **REFACTOR**: Clean up the code while keeping tests green

Within each phase, the workflow is:
- Set up test file with all test cases (initially failing)
- Implement feature code slice-by-slice until each test passes
- Refactor before moving to the next feature

This means test infrastructure (helpers, factories, configs) is set up in Phase 1, and every subsequent feature in Phases 2-4 starts with its test file.

## Commit Strategy

Minimum 8 commits, one per logical unit:
1. Initial monorepo setup + Prisma schema + test infrastructure
2. Auth tests + auth module (backend)
3. Auth flow (frontend)
4. Blog tests + blog CRUD (backend + frontend)
5. Feed tests + feed endpoint + feed page
6. Like tests + like system + optimistic UI
7. Comment system
8. Polish, rate limiting, README
