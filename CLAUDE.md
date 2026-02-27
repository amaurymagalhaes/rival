# Secure Blog Platform — Development Guide

## TDD Methodology (Mandatory)

Every change follows **Red-Green-Refactor**:

1. **RED**: Write a failing test first — the feature/fix doesn't exist yet
2. **GREEN**: Write the minimum code to make the test pass
3. **REFACTOR**: Clean up while keeping tests green

This applies to **all change types**:

- **New backend service/module**: Write `*.spec.ts` unit tests before creating the service
- **New API endpoint**: Write `*.integration.spec.ts` before implementing the controller/service
- **New frontend component**: Write `*.test.tsx` before creating the component
- **Bug fix**: Write a test that reproduces the bug first, then fix it
- **Refactor**: Ensure existing tests pass before and after
- **E2E flow**: Write `*.spec.ts` Playwright test before verifying/fixing the flow

Never write implementation code without a failing test driving it.

## Stack

- **Backend**: NestJS, Prisma, PostgreSQL (Neon)
- **Frontend**: Next.js 15 (App Router, Server Components, Server Actions)
- **Testing**: Jest (backend + frontend), Playwright (E2E)
- **Monorepo**: pnpm workspaces

## Test Commands

```bash
pnpm --filter api test          # Backend unit + integration
pnpm --filter web test          # Frontend component tests
npx playwright test             # E2E tests
```

## Plans

See `plans/` for phased implementation details.
