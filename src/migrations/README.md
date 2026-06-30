# PelatihKu — Database migrations

Run these against a fresh Supabase project, **in numeric order**, via the Supabase SQL
editor (or `supabase db` CLI). Each file is idempotent enough to run once on a clean DB.

| Order | File | Purpose |
|-------|------|---------|
| 1 | `001-extensions.sql` | Enable `pgvector` |
| 2 | `002-auth-profiles.sql` | `profiles` + `fitness_profiles` + signup/delete triggers + RLS |
| 3 | `003-exercises.sql` | Shared exercise library (+ `embedding`) |
| 4 | `004-programs.sql` | `programs`, `program_days`, `program_exercises` |
| 5 | `005-workout-logs.sql` | `workout_sessions`, `set_logs` (+ overload index) |
| 6 | `006-nutrition.sql` | `nutrition_targets`, `nutrition_logs` |
| 7 | `007-body-metrics.sql` | `bodyweight_logs` |
| 8 | `008-coach.sql` | `conversations`, `chat_messages`, `knowledge_base` (+ `embedding`) |
| 9 | `009-match-functions.sql` | `match_knowledge` + `match_exercises` pgvector RPCs |
| 10 | `010-seed-exercises.sql` | ~24 core exercises |
| 11 | `011-seed-knowledge.sql` | Coach RAG knowledge entries |
| 12 | `012-seed-fertility.sql` | Library demo videos + fertility/pelvic-floor movements (goal `kesuburan`) |

## After migrating: backfill embeddings

The seeded `exercises` and `knowledge_base` rows have `embedding = null`. Generate them
once (requires `GOOGLE_GEN_AI_API_KEY`) by calling the one-off server actions, e.g. from a
throwaway route or a server action trigger:

- `embedExercises()` — in `src/features/coach/embedding.ts`
- `embedKnowledge()` — in `src/features/coach/embedding.ts`

Both read rows where `embedding is null`, call Gemini `gemini-embedding-2` (768-dim), and
update in place. Re-run safely; already-embedded rows are skipped.

## Auth note

Email confirmation: for local/dev, disable "Confirm email" in Supabase Auth settings so
sign-up immediately yields a session (the app routes straight into onboarding). The
`handle_new_user` trigger seeds `profiles` + `fitness_profiles` from `raw_user_meta_data`
(`name`, `avatar_url`) on every new `auth.users` row.
