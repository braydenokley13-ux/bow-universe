# BOW Universe

BOW Universe is a calm, research-first fictional sports-economy league for grades 5 through 8. It is built as one persistent Next.js app where students investigate league issues, publish projects, model policy proposals, vote, and review commissioner decisions across a fictional 12-team world.

## Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL
- NextAuth credentials auth
- Vercel-ready deployment shape

## Core Features

- League dashboard with active ruleset, season state, league metrics, and archive feed
- 12-team fictional league with team finance snapshots and cap tables
- Versioned rulesets with readable history and diffs
- Issues board with linked projects and proposals
- Project registry covering all four lanes inside one shared world
- Proposal workflow with structured rule diffs, sandbox modeling, voting, and commissioner decisions
- Admin console for issues, roles, voting windows, decisions, and season advancement
- Deterministic season simulation engine with threshold-based issue generation

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment template and adjust values if needed:

```bash
cp .env.example .env.local
```

3. Start PostgreSQL.

If you already have PostgreSQL running locally on port `5432`, create a database named `bow_universe`.

If you want to use the checked-in local cluster directory, you can start it with:

```bash
pg_ctl -D .postgres/data -l .postgres/logs/server.log -o "-c shared_memory_type=mmap -c dynamic_shared_memory_type=posix" start
```

4. Apply the schema:

```bash
set -a
source .env.local
set +a
npx prisma migrate deploy
```

5. Seed the universe:

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

## Seeded Logins

- Commissioner: `commissioner@bow.local` / `bowuniverse`
- Student: `riya-patel@bow.local` / `bowuniverse`

## Test And Validation Commands

```bash
npx vitest run
npm run build
set -a && source .env.local && set +a && npx prisma validate
```

## Deploying To Vercel

1. Create a PostgreSQL database on Neon, Vercel Postgres, or another Vercel-compatible provider.
2. Set these environment variables in Vercel:
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`
3. Run Prisma migrations as part of deployment or before the first production boot:

```bash
npx prisma migrate deploy
```

4. Seed only if you want the demo universe in production:

```bash
npm run prisma:seed
```

## Important Notes

- The app is intentionally not a video game and avoids arcade copy or player-ratings presentation.
- The four lanes are modeled as project types and lane tags inside one app.
- No unlock-code mechanics are included anywhere in the product.
