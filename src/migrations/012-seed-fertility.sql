-- Fertility / hormone-prep additions.
-- 1) Fill demo video_url on the existing library from the curated sources
--    (YouTube playlist, Trainest, Darebee) — mapped per category, "disesuaikan".
-- 2) Seed low-impact / pelvic-floor / mobility movements used by the
--    "kesuburan" (persiapan kehamilan & hormon) program for cowok & cewek.
-- New rows keep embedding = null; re-run embedExercises() to backfill.

-- ── Allow the new "kesuburan" goal at the DB level ────────────────────
-- 002 created fitness_profiles.goal with a CHECK that predates this goal.
alter table public.fitness_profiles drop constraint if exists fitness_profiles_goal_check;
alter table public.fitness_profiles add constraint fitness_profiles_goal_check
  check (goal in
    ('turun_lemak', 'naik_massa', 'toning', 'strength', 'kebugaran_umum', 'kesuburan'));

-- ── Library demo videos ───────────────────────────────────────────────
-- Compound lifts (barbel/dumbbell/mesin, non-punggung) -> YouTube playlist.
update public.exercises
  set video_url = 'https://www.youtube.com/playlist?list=PLTKs8Gq_NDch4ELREZvYzlNq12d6X3ZA7'
  where equipment in ('barbell', 'dumbbell', 'machine')
    and muscle_group <> 'back';

-- Back work -> Trainest back library.
update public.exercises
  set video_url = 'https://trainest.com/exercise/back'
  where muscle_group = 'back';

-- Bodyweight / cardio (yang belum ada video) -> Darebee library.
update public.exercises
  set video_url = 'https://darebee.com/library.html'
  where equipment in ('bodyweight', 'cardio')
    and video_url is null;

-- ── Fertility-focused movements ───────────────────────────────────────
insert into public.exercises
  (slug, name, name_id, muscle_group, secondary_muscles, movement_pattern, category, equipment, level, is_compound, technique_steps, injury_cautions, variation_group, video_url)
values
-- Low-impact cardio (lebih ramah kesuburan daripada lompat tali; swap-able dgn jump-rope).
('brisk-walk', 'Brisk Walk / Incline Walk', 'Jalan Cepat', 'full_body', '{}', 'cardio', 'cardio', 'bodyweight', 'pemula', false,
  ARRAY['Jalan cepat di treadmill (boleh menanjak) atau luar ruangan.','Jaga intensitas sedang — masih bisa berbicara satu kalimat.','Lakukan 20–30 menit sebagai penutup, jaga napas teratur.'], '{}', 'cardio',
  'https://darebee.com/library.html'),

-- Pelvic floor / Kegel — inti persiapan kehamilan untuk cewek (& bagus untuk cowok).
('pelvic-floor-kegel', 'Pelvic Floor (Kegel)', 'Senam Otot Dasar Panggul', 'core', '{}', 'core', 'isolation', 'bodyweight', 'pemula', false,
  ARRAY['Kencangkan otot dasar panggul seperti menahan buang air kecil.','Tahan 3–5 detik tanpa menahan napas atau mengencangkan perut/glutes.','Lepaskan perlahan, ulangi 10–15 kali.'], '{}', 'core',
  'https://darebee.com/library.html'),

-- Bird Dog — stabilitas core & punggung, aman untuk kehamilan.
('bird-dog', 'Bird Dog', 'Bird Dog', 'core', '{back,glutes}', 'core', 'isolation', 'bodyweight', 'pemula', false,
  ARRAY['Posisi merangkak, tangan di bawah bahu, lutut di bawah pinggul.','Luruskan tangan kanan & kaki kiri sejajar lantai, kunci core.','Tahan sejenak, kembali, ganti sisi. Jaga panggul tetap rata.'], '{}', 'core',
  'https://darebee.com/library.html'),

-- Dead Bug — kontrol core tanpa tekanan tulang belakang.
('dead-bug', 'Dead Bug', 'Dead Bug', 'core', '{}', 'core', 'isolation', 'bodyweight', 'pemula', false,
  ARRAY['Telentang, tangan lurus ke atas, lutut & pinggul menekuk 90 derajat.','Turunkan tangan kanan & kaki kiri perlahan ke arah lantai.','Kembali ke awal, ganti sisi. Punggung bawah tetap menempel lantai.'], '{}', 'core',
  'https://darebee.com/library.html'),

-- Cat-Cow — mobilitas tulang belakang & pereda stres.
('cat-cow', 'Cat-Cow', 'Mobilitas Tulang Belakang', 'core', '{back}', 'core', 'isolation', 'bodyweight', 'pemula', false,
  ARRAY['Posisi merangkak netral.','Tarik napas, lengkungkan punggung ke bawah & angkat dada (cow).','Buang napas, bungkukkan punggung ke atas & tundukkan kepala (cat). Ulangi mengikuti napas.'], '{}', 'core',
  'https://darebee.com/library.html'),

-- Hip Thrust — penguatan glutes/pelvis, swap-able dengan hinge (glute bridge/RDL).
('hip-thrust', 'Hip Thrust', 'Hip Thrust', 'legs', '{glutes,core}', 'hinge', 'compound', 'bodyweight', 'pemula', true,
  ARRAY['Sandarkan punggung atas di bench, lutut menekuk, kaki rata di lantai.','Dorong pinggul ke atas hingga badan sejajar dari bahu ke lutut.','Remas glutes di puncak, turun perlahan terkontrol.'], '{punggung_bawah}', 'hinge',
  'https://www.youtube.com/playlist?list=PLTKs8Gq_NDch4ELREZvYzlNq12d6X3ZA7'),

-- Deep Squat Hold — mobilitas pinggul, persiapan postur & kehamilan.
('deep-squat-hold', 'Deep Squat Hold', 'Tahan Jongkok Dalam', 'legs', '{glutes,core}', 'squat', 'compound', 'bodyweight', 'pemula', true,
  ARRAY['Jongkok dalam dengan tumit tetap menempel lantai, dada tegak.','Dorong lutut keluar pakai siku, tahan 20–40 detik bernapas tenang.','Berdiri perlahan; gunakan pegangan bila perlu keseimbangan.'], '{lutut}', 'squat',
  'https://darebee.com/library.html');
