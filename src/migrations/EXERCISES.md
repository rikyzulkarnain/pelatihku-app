# Exercise library — referensi format & data existing

Panduan untuk menambah exercise baru lewat migration (`014-seed-*.sql`, dst).
Cek daftar existing di bawah **sebelum** menyiapkan data agar tidak ada `slug` /
`variation_group` yang terduplikasi. Semua kolom insert ke satu table:
[`public.exercises`](003-exercises.sql) — relasi lain (`program_exercises`,
`set_logs`) otomatis nyambung lewat FK `exercise_id`, tidak perlu diisi manual.

---

## 1. Format SQL

```sql
insert into public.exercises
  (slug, name, name_id, muscle_group, secondary_muscles, movement_pattern,
   category, equipment, level, is_compound, technique_steps, injury_cautions,
   variation_group, video_url)
values
('slug-unik', 'English Name', 'Nama Indonesia',
  'muscle_group',            -- WAJIB
  '{secondary,muscles}',     -- text[], boleh '{}'
  'movement_pattern',        -- WAJIB
  'category',                -- WAJIB
  'equipment',               -- WAJIB
  'level',                   -- WAJIB
  true,                      -- is_compound (boolean)
  ARRAY['Langkah 1.','Langkah 2.','Langkah 3.'],  -- technique_steps (WAJIB, boleh '{}')
  '{lutut,punggung_bawah}',  -- injury_cautions, boleh '{}'
  'variation_group',
  'https://video-url');
```

Kolom yang **tidak diisi**: `id` (auto uuid), `embedding` (biarkan null → jalankan
`embedExercises()` setelah migrate), `created_at` (default now).

### Vocabulary valid (harus konsisten)

| Kolom               | Nilai valid                                                                                                                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `muscle_group`      | `legs` `chest` `back` `shoulders` `arms` `core` `full_body`                                                                                                                                           |
| `secondary_muscles` | `glutes` `core` `back` `shoulders` `arms` … (text array)                                                                                                                                              |
| `movement_pattern`  | `squat` `hinge` `push_horizontal` `push_vertical` `pull_horizontal` `pull_vertical` `isolation_biceps` `isolation_triceps` `isolation_chest` `isolation_back` `isolation_legs` `calf` `core` `cardio` |
| `category`          | `compound` `isolation` `cardio`                                                                                                                                                                       |
| `equipment`         | `barbell` `dumbbell` `machine` `bodyweight` `cardio`                                                                                                                                                  |
| `level`             | `pemula` `menengah` `mahir`                                                                                                                                                                           |
| `injury_cautions`   | `lutut` `punggung_bawah` `bahu` `siku` `pergelangan_tangan` `pergelangan_kaki` (sama dgn `fitness_profiles.injuries`)                                                                                 |

**Aturan `variation_group`:** member dengan group sama = bisa di-swap oleh generator
lewat equipment (`barbell → dumbbell → bodyweight`). Kalau bikin group baru untuk
gerakan compound utama, sediakan minimal varian bodyweight-nya juga.

**Konvensi `video_url`:** link video demo spesifik per gerakan (YouTube
`watch?v=…`, format seragam) — hasil scraping playlist "Exercise Database" +
channel demo resmi (NASM, PureGym, Renaissance Periodization, Hinge Health, dll).
Boleh `null`.

---

## 2. Data existing lengkap (JANGAN diduplikasi)

Semua kolom, persis seperti di seed. Sumber: [`010-seed-exercises.sql`](010-seed-exercises.sql)
(inti) & [`012-seed-fertility.sql`](012-seed-fertility.sql) (kesuburan). Cek `slug` &
`variation_group` di sini sebelum menambah data baru.

### 2a. Inti — dari `010-seed-exercises.sql`

```sql
insert into public.exercises
  (slug, name, name_id, muscle_group, secondary_muscles, movement_pattern, category, equipment, level, is_compound, technique_steps, injury_cautions, variation_group, video_url)
values
-- SQUAT
('barbell-back-squat', 'Barbell Back Squat', 'Squat Barbel', 'legs', '{glutes,core}', 'squat', 'compound', 'barbell', 'menengah', true,
  ARRAY['Letakkan barbel di atas trapezius, kaki selebar bahu.','Tarik napas, kunci core, turunkan pinggul hingga paha sejajar lantai.','Dorong lewat tumit untuk berdiri kembali, jaga punggung netral.'], '{lutut,punggung_bawah}', 'squat', 'https://www.youtube.com/watch?v=-bJIpOq-LWk'),
('goblet-squat', 'Goblet Squat', 'Goblet Squat', 'legs', '{glutes,core}', 'squat', 'compound', 'dumbbell', 'pemula', true,
  ARRAY['Pegang satu dumbbell di depan dada dengan kedua tangan.','Turunkan pinggul lurus ke bawah, dada tetap tegak.','Dorong berdiri lewat tumit, remas glutes di atas.'], '{lutut}', 'squat', 'https://www.youtube.com/watch?v=XO6Bxuny-b0'),
('bodyweight-squat', 'Bodyweight Squat', 'Squat Tanpa Beban', 'legs', '{glutes}', 'squat', 'compound', 'bodyweight', 'pemula', true,
  ARRAY['Berdiri kaki selebar bahu, tangan lurus ke depan untuk keseimbangan.','Turunkan pinggul ke belakang dan bawah seperti mau duduk.','Berdiri kembali dengan meremas glutes.'], '{}', 'squat', 'https://www.youtube.com/watch?v=l83R5PblSMA'),
-- HINGE
('barbell-rdl', 'Romanian Deadlift', 'Romanian Deadlift', 'legs', '{back,glutes}', 'hinge', 'compound', 'barbell', 'menengah', true,
  ARRAY['Pegang barbel selebar bahu, lutut sedikit menekuk.','Dorong pinggul ke belakang, turunkan bar menyusuri paha.','Rasakan regangan hamstring, lalu dorong pinggul ke depan untuk berdiri.'], '{punggung_bawah}', 'hinge', 'https://www.youtube.com/watch?v=xgusDooVfKU'),
('dumbbell-rdl', 'Dumbbell RDL', 'RDL Dumbbell', 'legs', '{glutes,back}', 'hinge', 'compound', 'dumbbell', 'pemula', true,
  ARRAY['Pegang dumbbell di depan paha, lutut sedikit menekuk.','Dorong pinggul ke belakang, jaga punggung lurus.','Berdiri kembali dengan meremas glutes dan hamstring.'], '{punggung_bawah}', 'hinge', 'https://www.youtube.com/watch?v=g8IpoTrdWwE'),
('glute-bridge', 'Glute Bridge', 'Glute Bridge', 'legs', '{glutes,core}', 'hinge', 'compound', 'bodyweight', 'pemula', true,
  ARRAY['Berbaring telentang, lutut menekuk, kaki rata di lantai.','Angkat pinggul hingga badan lurus dari bahu ke lutut.','Remas glutes di puncak, lalu turun perlahan.'], '{}', 'hinge', 'https://www.youtube.com/watch?v=PhTDzR0TpZs'),
-- HORIZONTAL PRESS
('barbell-bench-press', 'Barbell Bench Press', 'Bench Press Barbel', 'chest', '{shoulders,arms}', 'push_horizontal', 'compound', 'barbell', 'menengah', true,
  ARRAY['Berbaring di bench, pegang bar sedikit lebih lebar dari bahu.','Turunkan bar ke tengah dada dengan siku ~45 derajat.','Dorong bar lurus ke atas hingga lengan lurus.'], '{bahu}', 'push_horizontal', 'https://www.youtube.com/watch?v=CjHIKDQ4RQo'),
('dumbbell-bench-press', 'Dumbbell Bench Press', 'Bench Press Dumbbell', 'chest', '{shoulders,arms}', 'push_horizontal', 'compound', 'dumbbell', 'pemula', true,
  ARRAY['Berbaring di bench memegang dua dumbbell setinggi dada.','Dorong dumbbell ke atas hingga lengan lurus.','Turunkan perlahan ke samping dada.'], '{bahu}', 'push_horizontal', 'https://www.youtube.com/watch?v=ZFeGAcaWs0A'),
('push-up', 'Push-up', 'Push-up', 'chest', '{shoulders,arms,core}', 'push_horizontal', 'compound', 'bodyweight', 'pemula', true,
  ARRAY['Posisi plank, tangan sedikit lebih lebar dari bahu.','Turunkan dada mendekati lantai, siku ~45 derajat.','Dorong kembali ke atas, jaga badan lurus.'], '{pergelangan_tangan}', 'push_horizontal', 'https://www.youtube.com/watch?v=oTDAkXa7fc8'),
-- VERTICAL PRESS
('barbell-overhead-press', 'Overhead Press', 'Overhead Press', 'shoulders', '{arms,core}', 'push_vertical', 'compound', 'barbell', 'menengah', true,
  ARRAY['Pegang barbel setinggi bahu, kaki selebar pinggul.','Kunci core, dorong bar lurus ke atas kepala.','Turunkan terkontrol kembali ke bahu.'], '{bahu}', 'push_vertical', 'https://www.youtube.com/watch?v=cGnhixvC8uA'),
('dumbbell-shoulder-press', 'Dumbbell Shoulder Press', 'Shoulder Press Dumbbell', 'shoulders', '{arms}', 'push_vertical', 'compound', 'dumbbell', 'pemula', true,
  ARRAY['Duduk/berdiri pegang dua dumbbell setinggi telinga.','Dorong ke atas hingga lengan hampir lurus.','Turunkan perlahan ke posisi awal.'], '{bahu}', 'push_vertical', 'https://www.youtube.com/watch?v=0JfYxMRsUCQ'),
('pike-push-up', 'Pike Push-up', 'Pike Push-up', 'shoulders', '{arms}', 'push_vertical', 'compound', 'bodyweight', 'menengah', true,
  ARRAY['Posisi V terbalik, pinggul tinggi, tangan & kaki di lantai.','Turunkan ubun-ubun mendekati lantai dengan menekuk siku.','Dorong kembali ke posisi V.'], '{bahu,pergelangan_tangan}', 'push_vertical', 'https://www.youtube.com/watch?v=XckEEwa1BPI'),
-- VERTICAL PULL
('lat-pulldown', 'Lat Pulldown', 'Lat Pulldown', 'back', '{arms}', 'pull_vertical', 'compound', 'machine', 'pemula', true,
  ARRAY['Duduk, pegang bar lebih lebar dari bahu.','Tarik bar ke dada bagian atas, remas tulang belikat.','Kembalikan perlahan hingga lengan lurus.'], '{}', 'pull_vertical', 'https://www.youtube.com/watch?v=JGeRYIZdojU'),
('pull-up', 'Pull-up', 'Pull-up', 'back', '{arms,core}', 'pull_vertical', 'compound', 'bodyweight', 'menengah', true,
  ARRAY['Gantung pada bar, telapak menghadap depan, lebih lebar dari bahu.','Tarik dagu melewati bar dengan meremas punggung.','Turun terkontrol hingga lengan lurus.'], '{bahu,siku}', 'pull_vertical', 'https://www.youtube.com/watch?v=eGo4IYlbE5g'),
-- HORIZONTAL PULL
('barbell-row', 'Barbell Bent-over Row', 'Barbell Row', 'back', '{arms}', 'pull_horizontal', 'compound', 'barbell', 'menengah', true,
  ARRAY['Bungkuk dari pinggul ~45 derajat, punggung lurus.','Tarik bar ke perut bawah, remas tulang belikat.','Turunkan terkontrol.'], '{punggung_bawah}', 'pull_horizontal', 'https://www.youtube.com/watch?v=bm0_q9bR_HA'),
('dumbbell-row', 'Dumbbell One-arm Row', 'Row Dumbbell Satu Tangan', 'back', '{arms}', 'pull_horizontal', 'compound', 'dumbbell', 'pemula', true,
  ARRAY['Satu lutut & tangan di bench, tangan lain memegang dumbbell.','Tarik dumbbell ke pinggul, siku dekat badan.','Turunkan perlahan hingga lengan lurus.'], '{}', 'pull_horizontal', 'https://www.youtube.com/watch?v=2jNSoVNvs8A'),
('inverted-row', 'Inverted Row', 'Inverted Row', 'back', '{arms,core}', 'pull_horizontal', 'compound', 'bodyweight', 'pemula', true,
  ARRAY['Berbaring di bawah bar/meja kokoh, pegang selebar bahu.','Badan lurus, tarik dada ke arah bar.','Turun terkontrol, jaga core kencang.'], '{}', 'pull_horizontal', 'https://www.youtube.com/watch?v=KOaCM1HMwU0'),
-- ISOLATION
('dumbbell-bicep-curl', 'Dumbbell Bicep Curl', 'Bicep Curl Dumbbell', 'arms', '{}', 'isolation_biceps', 'isolation', 'dumbbell', 'pemula', false,
  ARRAY['Berdiri pegang dumbbell di samping, telapak menghadap depan.','Tekuk siku mengangkat dumbbell ke bahu.','Turunkan perlahan tanpa ayunan.'], '{siku}', 'isolation_biceps', 'https://www.youtube.com/watch?v=cBSD6mQIPQk'),
('triceps-dip-bench', 'Bench Triceps Dip', 'Dip Trisep Bench', 'arms', '{shoulders}', 'isolation_triceps', 'isolation', 'bodyweight', 'pemula', false,
  ARRAY['Tangan di tepi bench, kaki menjulur ke depan.','Turunkan badan dengan menekuk siku ke belakang.','Dorong kembali ke atas hingga lengan lurus.'], '{bahu}', 'isolation_triceps', 'https://www.youtube.com/watch?v=qhTci9okxls'),
('dumbbell-chest-fly', 'Dumbbell Chest Fly', 'Chest Fly Dumbbell', 'chest', '{}', 'isolation_chest', 'isolation', 'dumbbell', 'pemula', false,
  ARRAY['Berbaring di bench pegang dua dumbbell di atas dada.','Buka lengan ke samping dengan siku sedikit menekuk.','Dekatkan kembali dumbbell di atas dada.'], '{bahu}', 'isolation_chest', 'https://www.youtube.com/watch?v=Nhvz9EzdJ4U'),
('dumbbell-rear-delt-fly', 'Rear Delt Fly', 'Rear Delt Fly', 'back', '{shoulders}', 'isolation_back', 'isolation', 'dumbbell', 'pemula', false,
  ARRAY['Bungkuk dari pinggul, pegang dumbbell ringan menggantung.','Angkat lengan ke samping meremas belikat.','Turunkan perlahan terkontrol.'], '{}', 'isolation_back', 'https://www.youtube.com/watch?v=0GSu6Z-Oj7U'),
('walking-lunge', 'Walking Lunge', 'Walking Lunge', 'legs', '{glutes}', 'isolation_legs', 'compound', 'bodyweight', 'pemula', true,
  ARRAY['Melangkah ke depan, turunkan lutut belakang mendekati lantai.','Jaga lutut depan sejajar mata kaki.','Dorong berdiri lalu lanjut langkah berikutnya.'], '{lutut}', 'isolation_legs', 'https://www.youtube.com/watch?v=mAgbXQdd4LM'),
('calf-raise', 'Standing Calf Raise', 'Calf Raise', 'legs', '{}', 'calf', 'isolation', 'bodyweight', 'pemula', false,
  ARRAY['Berdiri tegak, jinjit setinggi mungkin.','Tahan sebentar di puncak meremas betis.','Turun perlahan di bawah level lantai bila bisa.'], '{}', 'calf', 'https://www.youtube.com/watch?v=eMTy3qylqnE'),
('plank', 'Plank', 'Plank', 'core', '{}', 'core', 'isolation', 'bodyweight', 'pemula', false,
  ARRAY['Bertumpu pada siku dan ujung kaki, badan lurus.','Kunci core dan glutes, jangan biarkan pinggul turun.','Tahan sesuai target waktu, napas teratur.'], '{}', 'core', 'https://www.youtube.com/watch?v=GN4rnwWHZ6E'),
-- CARDIO (finisher; bodyweight so it always survives equipment filter)
('jump-rope', 'Jump Rope / Lari', 'Lompat Tali / Lari', 'full_body', '{}', 'cardio', 'cardio', 'bodyweight', 'pemula', false,
  ARRAY['Pilih lompat tali atau lari ringan.','Jaga intensitas sedang, bisa diajak bicara.','Lakukan sesuai durasi target sebagai penutup sesi.'], '{lutut}', 'cardio', 'https://www.youtube.com/watch?v=nMHfZ-yrFjA');
```

### 2b. Kesuburan — dari `012-seed-fertility.sql`

> Catatan: seed ini juga menyisipkan `video_url` (kolom terakhir), jadi daftar kolomnya
> menambahkan `video_url` setelah `variation_group`.

```sql
insert into public.exercises
  (slug, name, name_id, muscle_group, secondary_muscles, movement_pattern, category, equipment, level, is_compound, technique_steps, injury_cautions, variation_group, video_url)
values
-- Low-impact cardio (lebih ramah kesuburan daripada lompat tali; swap-able dgn jump-rope).
('brisk-walk', 'Brisk Walk / Incline Walk', 'Jalan Cepat', 'full_body', '{}', 'cardio', 'cardio', 'bodyweight', 'pemula', false,
  ARRAY['Jalan cepat di treadmill (boleh menanjak) atau luar ruangan.','Jaga intensitas sedang — masih bisa berbicara satu kalimat.','Lakukan 20–30 menit sebagai penutup, jaga napas teratur.'], '{}', 'cardio',
  'https://www.youtube.com/watch?v=tVpUCkMLgms'),

-- Pelvic floor / Kegel — inti persiapan kehamilan untuk cewek (& bagus untuk cowok).
('pelvic-floor-kegel', 'Pelvic Floor (Kegel)', 'Senam Otot Dasar Panggul', 'core', '{}', 'core', 'isolation', 'bodyweight', 'pemula', false,
  ARRAY['Kencangkan otot dasar panggul seperti menahan buang air kecil.','Tahan 3–5 detik tanpa menahan napas atau mengencangkan perut/glutes.','Lepaskan perlahan, ulangi 10–15 kali.'], '{}', 'core',
  'https://www.youtube.com/watch?v=VfmWkHSOi7U'),

-- Bird Dog — stabilitas core & punggung, aman untuk kehamilan.
('bird-dog', 'Bird Dog', 'Bird Dog', 'core', '{back,glutes}', 'core', 'isolation', 'bodyweight', 'pemula', false,
  ARRAY['Posisi merangkak, tangan di bawah bahu, lutut di bawah pinggul.','Luruskan tangan kanan & kaki kiri sejajar lantai, kunci core.','Tahan sejenak, kembali, ganti sisi. Jaga panggul tetap rata.'], '{}', 'core',
  'https://www.youtube.com/watch?v=6KuHusUj7mk'),

-- Dead Bug — kontrol core tanpa tekanan tulang belakang.
('dead-bug', 'Dead Bug', 'Dead Bug', 'core', '{}', 'core', 'isolation', 'bodyweight', 'pemula', false,
  ARRAY['Telentang, tangan lurus ke atas, lutut & pinggul menekuk 90 derajat.','Turunkan tangan kanan & kaki kiri perlahan ke arah lantai.','Kembali ke awal, ganti sisi. Punggung bawah tetap menempel lantai.'], '{}', 'core',
  'https://www.youtube.com/watch?v=bxn9FBrt4-A'),

-- Cat-Cow — mobilitas tulang belakang & pereda stres.
('cat-cow', 'Cat-Cow', 'Mobilitas Tulang Belakang', 'core', '{back}', 'core', 'isolation', 'bodyweight', 'pemula', false,
  ARRAY['Posisi merangkak netral.','Tarik napas, lengkungkan punggung ke bawah & angkat dada (cow).','Buang napas, bungkukkan punggung ke atas & tundukkan kepala (cat). Ulangi mengikuti napas.'], '{}', 'core',
  'https://www.youtube.com/watch?v=xyNwxiuERXc'),

-- Hip Thrust — penguatan glutes/pelvis, swap-able dengan hinge (glute bridge/RDL).
('hip-thrust', 'Hip Thrust', 'Hip Thrust', 'legs', '{glutes,core}', 'hinge', 'compound', 'bodyweight', 'pemula', true,
  ARRAY['Sandarkan punggung atas di bench, lutut menekuk, kaki rata di lantai.','Dorong pinggul ke atas hingga badan sejajar dari bahu ke lutut.','Remas glutes di puncak, turun perlahan terkontrol.'], '{punggung_bawah}', 'hinge',
  'https://www.youtube.com/watch?v=EF7jXP17DPE'),

-- Deep Squat Hold — mobilitas pinggul, persiapan postur & kehamilan.
('deep-squat-hold', 'Deep Squat Hold', 'Tahan Jongkok Dalam', 'legs', '{glutes,core}', 'squat', 'compound', 'bodyweight', 'pemula', true,
  ARRAY['Jongkok dalam dengan tumit tetap menempel lantai, dada tegak.','Dorong lutut keluar pakai siku, tahan 20–40 detik bernapas tenang.','Berdiri perlahan; gunakan pegangan bila perlu keseimbangan.'], '{lutut}', 'squat',
  'https://www.youtube.com/watch?v=D3zYzIlbjXM');
```

### 2c. Ringkasan `slug` per `variation_group` (checklist cepat)

| variation_group     | slug (equipment)                                                                                                      |
| ------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `squat`             | barbell-back-squat (barbell) · goblet-squat (dumbbell) · bodyweight-squat (bodyweight) · deep-squat-hold (bodyweight) |
| `hinge`             | barbell-rdl (barbell) · dumbbell-rdl (dumbbell) · glute-bridge (bodyweight) · hip-thrust (bodyweight)                 |
| `push_horizontal`   | barbell-bench-press (barbell) · dumbbell-bench-press (dumbbell) · push-up (bodyweight)                                |
| `push_vertical`     | barbell-overhead-press (barbell) · dumbbell-shoulder-press (dumbbell) · pike-push-up (bodyweight)                     |
| `pull_vertical`     | lat-pulldown (machine) · pull-up (bodyweight)                                                                         |
| `pull_horizontal`   | barbell-row (barbell) · dumbbell-row (dumbbell) · inverted-row (bodyweight)                                           |
| `isolation_biceps`  | dumbbell-bicep-curl (dumbbell)                                                                                        |
| `isolation_triceps` | triceps-dip-bench (bodyweight)                                                                                        |
| `isolation_chest`   | dumbbell-chest-fly (dumbbell)                                                                                         |
| `isolation_back`    | dumbbell-rear-delt-fly (dumbbell)                                                                                     |
| `isolation_legs`    | walking-lunge (bodyweight)                                                                                            |
| `calf`              | calf-raise (bodyweight)                                                                                               |
| `core`              | plank · pelvic-floor-kegel · bird-dog · dead-bug · cat-cow (semua bodyweight)                                         |
| `cardio`            | jump-rope (bodyweight) · brisk-walk (bodyweight)                                                                      |

---

## 3. Setelah migrate

1. Tambahkan baris file baru ke tabel di [`README.md`](README.md).
2. Backfill `embedding` (butuh `GOOGLE_GEN_AI_API_KEY`) — jalankan dari root:
   `node scripts/backfill-embeddings.mjs` (atau POST `/api/embeddings` dengan
   session login). Row lama yang sudah ter-embed otomatis dilewati.
