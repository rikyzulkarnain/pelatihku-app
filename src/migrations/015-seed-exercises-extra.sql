-- ══════════════════════════════════════════════════════════════
-- 015 — Seed exercise BARU (melengkapi library existing, slug tidak duplikat).
-- Cek dulu slug/variation_group yang sudah ada di 010/012/014 (lihat EXERCISES.md)
-- agar tidak bentrok. Sumber video: hasil scraping (isi via browser-act, dll).
-- on conflict (slug) do nothing → aman kalau dijalankan ulang.
-- Setelah migrate: jalankan embedExercises() untuk backfill embedding.
-- ══════════════════════════════════════════════════════════════

-- Vocabulary valid (WAJIB konsisten):
--   muscle_group     : legs | chest | back | shoulders | arms | core | full_body
--   movement_pattern : squat | hinge | push_horizontal | push_vertical |
--                      pull_horizontal | pull_vertical | isolation_biceps |
--                      isolation_triceps | isolation_chest | isolation_back |
--                      isolation_legs | calf | core | cardio
--   category         : compound | isolation | cardio
--   equipment        : barbell | dumbbell | machine | bodyweight | cardio
--   level            : pemula | menengah | mahir
--   injury_cautions  : lutut | punggung_bawah | bahu | siku |
--                      pergelangan_tangan | pergelangan_kaki
-- Kolom yang TIDAK diisi: id (auto), embedding (null → backfill), created_at (default).

/* data lama — 45 gerakan existing (010 + 012 + 014). JANGAN pakai ulang slug ini.
   Format: slug (equipment · level · variation_group)

   SQUAT
     barbell-back-squat     (barbell    · menengah · squat)
     goblet-squat           (dumbbell   · pemula   · squat)
     bodyweight-squat       (bodyweight · pemula   · squat)
     deep-squat-hold        (bodyweight · pemula   · squat)   [012]
     bulgarian-split-squat  (bodyweight · menengah · squat)   [014]
     dumbbell-front-squat   (dumbbell   · menengah · squat)   [014]
     squat-jump             (bodyweight · menengah · squat)   [014]

   HINGE
     barbell-rdl            (barbell    · menengah · hinge)
     dumbbell-rdl           (dumbbell   · pemula   · hinge)
     glute-bridge           (bodyweight · pemula   · hinge)
     hip-thrust             (bodyweight · pemula   · hinge)   [012]
     single-leg-rdl         (bodyweight · menengah · hinge)   [014]

   PUSH_HORIZONTAL
     barbell-bench-press    (barbell    · menengah · push_horizontal)
     dumbbell-bench-press   (dumbbell   · pemula   · push_horizontal)
     push-up                (bodyweight · pemula   · push_horizontal)

   PUSH_VERTICAL
     barbell-overhead-press (barbell    · menengah · push_vertical)
     dumbbell-shoulder-press(dumbbell   · pemula   · push_vertical)
     pike-push-up           (bodyweight · menengah · push_vertical)

   PULL_VERTICAL
     lat-pulldown           (machine    · pemula   · pull_vertical)
     pull-up                (bodyweight · menengah · pull_vertical)

   PULL_HORIZONTAL
     barbell-row            (barbell    · menengah · pull_horizontal)
     dumbbell-row           (dumbbell   · pemula   · pull_horizontal)
     inverted-row           (bodyweight · pemula   · pull_horizontal)
     renegade-row           (dumbbell   · menengah · pull_horizontal) [014]

   ISOLATION_BICEPS
     dumbbell-bicep-curl    (dumbbell   · pemula   · isolation_biceps)
   ISOLATION_TRICEPS
     triceps-dip-bench      (bodyweight · pemula   · isolation_triceps)
   ISOLATION_CHEST
     dumbbell-chest-fly     (dumbbell   · pemula   · isolation_chest)
   ISOLATION_BACK
     dumbbell-rear-delt-fly (dumbbell   · pemula   · isolation_back)

   ISOLATION_LEGS
     walking-lunge          (bodyweight · pemula   · isolation_legs)
     reverse-lunge          (bodyweight · pemula   · isolation_legs)  [014]
     step-up                (bodyweight · pemula   · isolation_legs)  [014]

   CALF
     calf-raise             (bodyweight · pemula   · calf)

   CORE
     plank                  (bodyweight · pemula   · core)
     pelvic-floor-kegel     (bodyweight · pemula   · core)   [012]
     bird-dog               (bodyweight · pemula   · core)   [012]
     dead-bug               (bodyweight · pemula   · core)   [012]
     cat-cow                (bodyweight · pemula   · core)   [012]
     side-plank             (bodyweight · pemula   · core)   [014]
     superman               (bodyweight · pemula   · core)   [014]
     plank-shoulder-tap     (bodyweight · pemula   · core)   [014]
     bear-crawl-hold        (bodyweight · pemula   · core)   [014]
     suitcase-hold          (dumbbell   · pemula   · core)   [014]
     copenhagen-side-plank  (bodyweight · mahir    · core)   [014]

   CARDIO
     jump-rope              (bodyweight · pemula   · cardio)
     brisk-walk             (bodyweight · pemula   · cardio) [012]
*/

insert into public.exercises
  (slug, name, name_id, muscle_group, secondary_muscles, movement_pattern,
   category, equipment, level, is_compound, technique_steps, injury_cautions,
   variation_group, video_url)
values
-- ── TODO: isi gerakan baru di bawah (hapus contoh ini setelah diganti) ──
-- ('slug-unik-baru', 'English Name', 'Nama Indonesia',
--   'legs',                                          -- muscle_group
--   '{glutes,core}',                                 -- secondary_muscles (boleh '{}')
--   'squat',                                         -- movement_pattern
--   'compound',                                      -- category
--   'dumbbell',                                      -- equipment
--   'pemula',                                        -- level
--   true,                                            -- is_compound
--   ARRAY['Langkah 1.','Langkah 2.','Langkah 3.'],   -- technique_steps
--   '{lutut}',                                       -- injury_cautions (boleh '{}')
--   'squat',                                         -- variation_group
--   'https://www.youtube.com/watch?v=xxxx')          -- video_url (boleh null)

on conflict (slug) do nothing;
