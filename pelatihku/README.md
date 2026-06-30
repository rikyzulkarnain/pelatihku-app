# PelatihKu 🏋️

Mobile-first AI gym-coaching app — program generator, workout log with progressive
overload, exercise library, nutrition targets, progress charts, and a persona-aware AI
Coach. Built to match the `fina-app` (AI/embeddings) and `cafe-realtime-wpu` (auth
triggers) conventions.

## Stack

- **Next.js 16** (App Router, React 19, React Compiler, `proxy.ts` middleware)
- **Supabase** (Postgres + `pgvector` + RLS + auth triggers)
- **Google Gemini** (`@google/genai`) — embeddings (`gemini-embedding-2`) + chat
  (`gemini-2.5-flash`)
- **Tailwind 4**, `next-themes` (dark/light), Zustand, React Query, Zod, Recharts, Sonner
- Fonts: Archivo (headings) + Plus Jakarta Sans (body); lime accent `#C9FB3C`

## Getting started

1. **Install**

   ```bash
   npm install
   ```

2. **Environment** — copy `.env.example` to `.env.local` and fill in:

   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...   # anon/publishable key
   SUPABASE_SERVICE_ROLE_KEY=...              # for embedding backfill
   GOOGLE_GEN_AI_API_KEY=...                  # Gemini API key
   ```

3. **Database** — in the Supabase SQL editor, run the files in
   [`src/migrations/`](src/migrations/) **in order** (`001` → `011`). See
   [`src/migrations/README.md`](src/migrations/README.md). In Supabase Auth settings,
   disable "Confirm email" for a smooth dev sign-up flow.

4. **Run**

   ```bash
   npm run dev
   ```

5. **Backfill embeddings** (once, after seeding) — sign in, then:

   ```bash
   curl -X POST http://localhost:3000/api/embeddings --cookie "<your session cookies>"
   ```

   Or simply call `POST /api/embeddings` from the browser devtools while logged in. This
   embeds the seeded exercises + knowledge base so semantic search (Library) and the
   Coach's RAG work. The app still functions without this step (text-search fallback).

## App flow

`/` Welcome → `/register` or `/login` → `/onboarding` (10-question wizard) →
`/generating` (rule-based program generator) → `/home`. Bottom nav: Beranda / Latihan /
Coach / Nutrisi / Progres. Workout logging lives at `/session/[sessionId]`.

## Architecture

- `src/features/<domain>/` — server actions + domain logic (`"use server"`), mirroring
  fina-app. Pure logic (no DB/AI) in `generator.ts`, `nutrition/calc.ts`,
  `workout/overload.ts`.
- `src/lib/supabase/{client,server,proxy}.ts` — SSR Supabase clients; `src/proxy.ts` is
  the Next-16 middleware entry enforcing auth.
- `src/components/common/` — `PhoneShell`, `BottomNav`, `ThemeToggle`, and styled
  primitives.
- `src/app/(auth)` / `(onboarding)` / `(app)/(tabs)` — route groups with auth +
  onboarding gates in their layouts.

## Notes

- The **program generator** and **progressive-overload** suggestions are deterministic
  (rule-based) — the AI is used only for the Coach chat and embeddings.
- All user tables are protected by per-user RLS (`auth.uid() = user_id`); `exercises` and
  `knowledge_base` are shared read-only reference data.
- This app gives general fitness guidance and estimates, **not medical advice**.
