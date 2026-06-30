-- Core exercise library. Each variation_group has barbell/dumbbell/bodyweight members
-- so the generator's equipment swap (barbell->dumbbell->bodyweight) always resolves.
-- injury_cautions use the same vocabulary as fitness_profiles.injuries.
-- embedding is left null and backfilled once by the embedExercises() server action.

insert into public.exercises
  (slug, name, name_id, muscle_group, secondary_muscles, movement_pattern, category, equipment, level, is_compound, technique_steps, injury_cautions, variation_group)
values
-- SQUAT
('barbell-back-squat', 'Barbell Back Squat', 'Squat Barbel', 'legs', '{glutes,core}', 'squat', 'compound', 'barbell', 'menengah', true,
  ARRAY['Letakkan barbel di atas trapezius, kaki selebar bahu.','Tarik napas, kunci core, turunkan pinggul hingga paha sejajar lantai.','Dorong lewat tumit untuk berdiri kembali, jaga punggung netral.'], '{lutut,punggung_bawah}', 'squat'),
('goblet-squat', 'Goblet Squat', 'Goblet Squat', 'legs', '{glutes,core}', 'squat', 'compound', 'dumbbell', 'pemula', true,
  ARRAY['Pegang satu dumbbell di depan dada dengan kedua tangan.','Turunkan pinggul lurus ke bawah, dada tetap tegak.','Dorong berdiri lewat tumit, remas glutes di atas.'], '{lutut}', 'squat'),
('bodyweight-squat', 'Bodyweight Squat', 'Squat Tanpa Beban', 'legs', '{glutes}', 'squat', 'compound', 'bodyweight', 'pemula', true,
  ARRAY['Berdiri kaki selebar bahu, tangan lurus ke depan untuk keseimbangan.','Turunkan pinggul ke belakang dan bawah seperti mau duduk.','Berdiri kembali dengan meremas glutes.'], '{}', 'squat'),
-- HINGE
('barbell-rdl', 'Romanian Deadlift', 'Romanian Deadlift', 'legs', '{back,glutes}', 'hinge', 'compound', 'barbell', 'menengah', true,
  ARRAY['Pegang barbel selebar bahu, lutut sedikit menekuk.','Dorong pinggul ke belakang, turunkan bar menyusuri paha.','Rasakan regangan hamstring, lalu dorong pinggul ke depan untuk berdiri.'], '{punggung_bawah}', 'hinge'),
('dumbbell-rdl', 'Dumbbell RDL', 'RDL Dumbbell', 'legs', '{glutes,back}', 'hinge', 'compound', 'dumbbell', 'pemula', true,
  ARRAY['Pegang dumbbell di depan paha, lutut sedikit menekuk.','Dorong pinggul ke belakang, jaga punggung lurus.','Berdiri kembali dengan meremas glutes dan hamstring.'], '{punggung_bawah}', 'hinge'),
('glute-bridge', 'Glute Bridge', 'Glute Bridge', 'legs', '{glutes,core}', 'hinge', 'compound', 'bodyweight', 'pemula', true,
  ARRAY['Berbaring telentang, lutut menekuk, kaki rata di lantai.','Angkat pinggul hingga badan lurus dari bahu ke lutut.','Remas glutes di puncak, lalu turun perlahan.'], '{}', 'hinge'),
-- HORIZONTAL PRESS
('barbell-bench-press', 'Barbell Bench Press', 'Bench Press Barbel', 'chest', '{shoulders,arms}', 'push_horizontal', 'compound', 'barbell', 'menengah', true,
  ARRAY['Berbaring di bench, pegang bar sedikit lebih lebar dari bahu.','Turunkan bar ke tengah dada dengan siku ~45 derajat.','Dorong bar lurus ke atas hingga lengan lurus.'], '{bahu}', 'push_horizontal'),
('dumbbell-bench-press', 'Dumbbell Bench Press', 'Bench Press Dumbbell', 'chest', '{shoulders,arms}', 'push_horizontal', 'compound', 'dumbbell', 'pemula', true,
  ARRAY['Berbaring di bench memegang dua dumbbell setinggi dada.','Dorong dumbbell ke atas hingga lengan lurus.','Turunkan perlahan ke samping dada.'], '{bahu}', 'push_horizontal'),
('push-up', 'Push-up', 'Push-up', 'chest', '{shoulders,arms,core}', 'push_horizontal', 'compound', 'bodyweight', 'pemula', true,
  ARRAY['Posisi plank, tangan sedikit lebih lebar dari bahu.','Turunkan dada mendekati lantai, siku ~45 derajat.','Dorong kembali ke atas, jaga badan lurus.'], '{pergelangan_tangan}', 'push_horizontal'),
-- VERTICAL PRESS
('barbell-overhead-press', 'Overhead Press', 'Overhead Press', 'shoulders', '{arms,core}', 'push_vertical', 'compound', 'barbell', 'menengah', true,
  ARRAY['Pegang barbel setinggi bahu, kaki selebar pinggul.','Kunci core, dorong bar lurus ke atas kepala.','Turunkan terkontrol kembali ke bahu.'], '{bahu}', 'push_vertical'),
('dumbbell-shoulder-press', 'Dumbbell Shoulder Press', 'Shoulder Press Dumbbell', 'shoulders', '{arms}', 'push_vertical', 'compound', 'dumbbell', 'pemula', true,
  ARRAY['Duduk/berdiri pegang dua dumbbell setinggi telinga.','Dorong ke atas hingga lengan hampir lurus.','Turunkan perlahan ke posisi awal.'], '{bahu}', 'push_vertical'),
('pike-push-up', 'Pike Push-up', 'Pike Push-up', 'shoulders', '{arms}', 'push_vertical', 'compound', 'bodyweight', 'menengah', true,
  ARRAY['Posisi V terbalik, pinggul tinggi, tangan & kaki di lantai.','Turunkan ubun-ubun mendekati lantai dengan menekuk siku.','Dorong kembali ke posisi V.'], '{bahu,pergelangan_tangan}', 'push_vertical'),
-- VERTICAL PULL
('lat-pulldown', 'Lat Pulldown', 'Lat Pulldown', 'back', '{arms}', 'pull_vertical', 'compound', 'machine', 'pemula', true,
  ARRAY['Duduk, pegang bar lebih lebar dari bahu.','Tarik bar ke dada bagian atas, remas tulang belikat.','Kembalikan perlahan hingga lengan lurus.'], '{}', 'pull_vertical'),
('pull-up', 'Pull-up', 'Pull-up', 'back', '{arms,core}', 'pull_vertical', 'compound', 'bodyweight', 'menengah', true,
  ARRAY['Gantung pada bar, telapak menghadap depan, lebih lebar dari bahu.','Tarik dagu melewati bar dengan meremas punggung.','Turun terkontrol hingga lengan lurus.'], '{bahu,siku}', 'pull_vertical'),
-- HORIZONTAL PULL
('barbell-row', 'Barbell Bent-over Row', 'Barbell Row', 'back', '{arms}', 'pull_horizontal', 'compound', 'barbell', 'menengah', true,
  ARRAY['Bungkuk dari pinggul ~45 derajat, punggung lurus.','Tarik bar ke perut bawah, remas tulang belikat.','Turunkan terkontrol.'], '{punggung_bawah}', 'pull_horizontal'),
('dumbbell-row', 'Dumbbell One-arm Row', 'Row Dumbbell Satu Tangan', 'back', '{arms}', 'pull_horizontal', 'compound', 'dumbbell', 'pemula', true,
  ARRAY['Satu lutut & tangan di bench, tangan lain memegang dumbbell.','Tarik dumbbell ke pinggul, siku dekat badan.','Turunkan perlahan hingga lengan lurus.'], '{}', 'pull_horizontal'),
('inverted-row', 'Inverted Row', 'Inverted Row', 'back', '{arms,core}', 'pull_horizontal', 'compound', 'bodyweight', 'pemula', true,
  ARRAY['Berbaring di bawah bar/meja kokoh, pegang selebar bahu.','Badan lurus, tarik dada ke arah bar.','Turun terkontrol, jaga core kencang.'], '{}', 'pull_horizontal'),
-- ISOLATION
('dumbbell-bicep-curl', 'Dumbbell Bicep Curl', 'Bicep Curl Dumbbell', 'arms', '{}', 'isolation_biceps', 'isolation', 'dumbbell', 'pemula', false,
  ARRAY['Berdiri pegang dumbbell di samping, telapak menghadap depan.','Tekuk siku mengangkat dumbbell ke bahu.','Turunkan perlahan tanpa ayunan.'], '{siku}', 'isolation_biceps'),
('triceps-dip-bench', 'Bench Triceps Dip', 'Dip Trisep Bench', 'arms', '{shoulders}', 'isolation_triceps', 'isolation', 'bodyweight', 'pemula', false,
  ARRAY['Tangan di tepi bench, kaki menjulur ke depan.','Turunkan badan dengan menekuk siku ke belakang.','Dorong kembali ke atas hingga lengan lurus.'], '{bahu}', 'isolation_triceps'),
('dumbbell-chest-fly', 'Dumbbell Chest Fly', 'Chest Fly Dumbbell', 'chest', '{}', 'isolation_chest', 'isolation', 'dumbbell', 'pemula', false,
  ARRAY['Berbaring di bench pegang dua dumbbell di atas dada.','Buka lengan ke samping dengan siku sedikit menekuk.','Dekatkan kembali dumbbell di atas dada.'], '{bahu}', 'isolation_chest'),
('dumbbell-rear-delt-fly', 'Rear Delt Fly', 'Rear Delt Fly', 'back', '{shoulders}', 'isolation_back', 'isolation', 'dumbbell', 'pemula', false,
  ARRAY['Bungkuk dari pinggul, pegang dumbbell ringan menggantung.','Angkat lengan ke samping meremas belikat.','Turunkan perlahan terkontrol.'], '{}', 'isolation_back'),
('walking-lunge', 'Walking Lunge', 'Walking Lunge', 'legs', '{glutes}', 'isolation_legs', 'compound', 'bodyweight', 'pemula', true,
  ARRAY['Melangkah ke depan, turunkan lutut belakang mendekati lantai.','Jaga lutut depan sejajar mata kaki.','Dorong berdiri lalu lanjut langkah berikutnya.'], '{lutut}', 'isolation_legs'),
('calf-raise', 'Standing Calf Raise', 'Calf Raise', 'legs', '{}', 'calf', 'isolation', 'bodyweight', 'pemula', false,
  ARRAY['Berdiri tegak, jinjit setinggi mungkin.','Tahan sebentar di puncak meremas betis.','Turun perlahan di bawah level lantai bila bisa.'], '{}', 'calf'),
('plank', 'Plank', 'Plank', 'core', '{}', 'core', 'isolation', 'bodyweight', 'pemula', false,
  ARRAY['Bertumpu pada siku dan ujung kaki, badan lurus.','Kunci core dan glutes, jangan biarkan pinggul turun.','Tahan sesuai target waktu, napas teratur.'], '{}', 'core'),
-- CARDIO (finisher; bodyweight so it always survives equipment filter)
('jump-rope', 'Jump Rope / Lari', 'Lompat Tali / Lari', 'full_body', '{}', 'cardio', 'cardio', 'bodyweight', 'pemula', false,
  ARRAY['Pilih lompat tali atau lari ringan.','Jaga intensitas sedang, bisa diajak bicara.','Lakukan sesuai durasi target sebagai penutup sesi.'], '{lutut}', 'cardio');
