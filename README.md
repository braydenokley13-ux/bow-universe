# BOW Universe

BOW Universe is a research-first fictional sports-economy league for grades 5 through 8. Students investigate league issues, build projects across four lanes, draft formal proposal memos, respond to feedback, join research challenges, and publish work inside one persistent Next.js app.

## Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL
- NextAuth credentials auth
- Vercel-ready deployment shape

## Core Product Areas

- Student mission control with recommended next actions, feedback queue, voting windows, and challenge activity
- Beginner-friendly project studio with autosave, repair links, and lane-specific coaching
- Formal proposal memo workflow with rule diffs, sandbox modeling, voting, and commissioner decisions
- Commissioner-managed invites plus student self-signup with reusable class codes
- League newsroom combining commissioner-written stories with auto-generated league activity
- Student research challenges with challenge entries, milestone scoring, and spotlight bonuses
- Research archive and publication queue for internal and external readiness

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment template:

```bash
cp .env.example .env.local
```

3. Start the bundled local PostgreSQL cluster:

```bash
npm run db:start
```

4. Apply database migrations:

```bash
set -a
source .env.local
set +a
npx prisma migrate deploy
```

5. Seed the demo universe:

```bash
set -a
source .env.local
set +a
npm run prisma:seed
```

6. Start the app:

```bash
npm run dev
```

## Useful Local Commands

```bash
npm run db:status
npm run db:stop
npm run prisma:generate
npm run prisma:validate
npm run check
```

`npm run check` runs lint, tests, production build, and Prisma schema validation in one pass.

## Demo Access

- Commissioner: `commissioner@bow.local` / `bowuniverse`
- Returning student: `riya-patel@bow.local` / `bowuniverse`
- Fresh student: `taylor-west@bow.local` / `bowuniverse`

Students can also sign up from `/signup` with a commissioner-created class code.

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string used by Prisma
- `NEXTAUTH_SECRET`: secret for credentials auth sessions
- `NEXTAUTH_URL`: canonical app URL used for auth and invite links
- `NEXT_SERVER_ACTION_ORIGINS`: comma-separated allowed origins for Next.js server actions; include local hosts and any deployed domains that submit forms back to the app

## Deployment Notes

1. Create a PostgreSQL database on Neon, Vercel Postgres, or another PostgreSQL provider.
2. Set `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, and `NEXT_SERVER_ACTION_ORIGINS` in Vercel.
3. Run migrations during deploy or before first production boot:

```bash
npx prisma migrate deploy
```

4. Seed only if you want the demo universe in production:

```bash
npm run prisma:seed
```

For Vercel previews, include the preview domain in `NEXT_SERVER_ACTION_ORIGINS` if form posts need to come from more than the canonical `NEXTAUTH_URL`.

## Notes

- Project lanes are project work. Formal proposal memos live in `/proposals`.
- The app is intentionally research-first and avoids arcade-style presentation.
- The checked-in `.postgres` directory is the standard local development database for this repo.
