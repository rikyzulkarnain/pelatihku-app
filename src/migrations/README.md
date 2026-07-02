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
| 13 | `013-nutrition-macros.sql` | Add `carb_g` + `fat_g` to `nutrition_logs` (chat/voice meal logging) |
| 14 | `014-seed-exercises-extra.sql` | Seed 13 extra exercises (squat/hinge/core/leg varian + video URL) |
| 15 | `015-seed-exercises-extra.sql` | Seed 37 extra exercises (strength/push/pull/isolasi/cardio + kesuburan mobilitas) |

## After migrating: backfill embeddings

The seeded `exercises` and `knowledge_base` rows have `embedding = null`. Generate them
once (requires `GOOGLE_GEN_AI_API_KEY`).

**Cara termudah — script lokal** (pakai `SUPABASE_SERVICE_ROLE_KEY`, tanpa login):

```bash
node scripts/backfill-embeddings.mjs
```

**Alternatif — POST `/api/embeddings`** endpoint:

1. Login ke app (perlu authenticated session).
2. Buka browser console atau kirim POST request:
   ```bash
   curl -X POST https://pelatihku-app.vercel.app/api/embeddings \
     -H "Cookie: <your-session-cookie>"
   ```
   Atau dari browser console: `fetch('/api/embeddings', { method: 'POST' })`
3. Tunggu sampai selesai (bisa beberapa menit untuk semua exercises + knowledge).

Fungsi `embedExercises()` & `embedKnowledge()` di `src/features/ai/embedding.ts` akan:
- Baca rows dengan `embedding = null` saja.
- Call Gemini `gemini-embedding-2` (768-dim).
- Update vector in-place. Idempotent — re-run dengan aman.

## Auth note

Email confirmation: for local/dev, disable "Confirm email" in Supabase Auth settings so
sign-up immediately yields a session (the app routes straight into onboarding). The
`handle_new_user` trigger seeds `profiles` + `fitness_profiles` from `raw_user_meta_data`
(`name`, `avatar_url`) on every new `auth.users` row.
