-- ══════════════════════════════════════════════════════════════
-- 014 — Seed exercise BARU (melengkapi library existing, slug tidak duplikat).
-- Sumber video: playlist "Exercise Database" (YouTube), di-scrape via browser-act.
-- on conflict do nothing → aman kalau dijalankan ulang.
-- Setelah migrate: jalankan embedExercises() untuk backfill embedding.
-- ══════════════════════════════════════════════════════════════

insert into public.exercises
  (slug, name, name_id, muscle_group, secondary_muscles, movement_pattern, category, equipment, level, is_compound, technique_steps, injury_cautions, variation_group, video_url)
values
-- SQUAT (varian baru)
('bulgarian-split-squat', 'Bulgarian Split Squat', 'Bulgarian Split Squat', 'legs', '{glutes,core}', 'squat', 'compound', 'bodyweight', 'menengah', true,
  ARRAY['Letakkan punggung kaki belakang di atas bench, kaki depan melangkah ke depan.','Turunkan pinggul lurus ke bawah hingga paha depan hampir sejajar lantai.','Dorong lewat tumit kaki depan untuk berdiri, jaga torso tegak.'], '{lutut}', 'squat', 'https://www.youtube.com/watch?v=kOs5QaxiMIs'),
('dumbbell-front-squat', 'Dumbbell Front Squat', 'Front Squat Dumbbell', 'legs', '{glutes,core}', 'squat', 'compound', 'dumbbell', 'menengah', true,
  ARRAY['Pegang dua dumbbell di atas bahu, siku menghadap depan, kaki selebar bahu.','Turunkan pinggul ke bawah menjaga dada tegak dan tumit menempel.','Dorong berdiri lewat tumit, jaga core kencang.'], '{lutut,punggung_bawah}', 'squat', 'https://www.youtube.com/watch?v=my5-vCJVbZ8'),
('squat-jump', 'Squat Jump', 'Squat Lompat', 'legs', '{glutes,core}', 'squat', 'compound', 'bodyweight', 'menengah', true,
  ARRAY['Berdiri kaki selebar bahu, turun ke posisi setengah squat.','Meledak melompat ke atas setinggi mungkin, ayun lengan untuk momentum.','Mendarat lembut dengan lutut sedikit menekuk, langsung ulangi.'], '{lutut,pergelangan_kaki}', 'squat', 'https://www.youtube.com/watch?v=UkpuMW1W-EA'),
-- HINGE (varian baru)
('single-leg-rdl', 'Single-leg RDL', 'RDL Satu Kaki', 'legs', '{glutes,back}', 'hinge', 'compound', 'bodyweight', 'menengah', true,
  ARRAY['Berdiri satu kaki, lutut sedikit menekuk, kaki lain sedikit terangkat.','Dorong pinggul ke belakang, turunkan badan hingga sejajar lantai sambil kaki belakang terangkat.','Kembali berdiri dengan meremas glutes, jaga punggung netral.'], '{punggung_bawah}', 'hinge', 'https://www.youtube.com/watch?v=-fOwXw65bkk'),
-- ISOLATION LEGS (varian baru)
('reverse-lunge', 'Reverse Lunge', 'Reverse Lunge', 'legs', '{glutes}', 'isolation_legs', 'compound', 'bodyweight', 'pemula', true,
  ARRAY['Berdiri tegak, langkahkan satu kaki jauh ke belakang.','Turunkan lutut belakang mendekati lantai, lutut depan sejajar mata kaki.','Dorong lewat tumit depan untuk kembali berdiri, ganti kaki.'], '{lutut}', 'isolation_legs', 'https://www.youtube.com/watch?v=buMowZfqFSw'),
('step-up', 'Step-up', 'Naik Bangku', 'legs', '{glutes}', 'isolation_legs', 'compound', 'bodyweight', 'pemula', true,
  ARRAY['Berdiri menghadap bench/box kokoh, letakkan satu kaki penuh di atasnya.','Dorong lewat tumit kaki atas untuk naik hingga berdiri tegak.','Turun perlahan terkontrol, lalu ganti kaki.'], '{lutut}', 'isolation_legs', 'https://www.youtube.com/watch?v=Y8IkohkDlyU'),
-- PULL HORIZONTAL (varian baru)
('renegade-row', 'Renegade Row', 'Renegade Row', 'back', '{arms,core}', 'pull_horizontal', 'compound', 'dumbbell', 'menengah', true,
  ARRAY['Posisi plank tinggi memegang dua dumbbell, kaki agak lebar untuk stabilitas.','Tarik satu dumbbell ke pinggul menjaga pinggul tetap rata.','Turunkan terkontrol, ganti sisi bergantian.'], '{punggung_bawah}', 'pull_horizontal', 'https://www.youtube.com/watch?v=NbPR41CW8MQ'),
-- CORE (gerakan baru)
('side-plank', 'Side Plank', 'Plank Samping', 'core', '{shoulders}', 'core', 'isolation', 'bodyweight', 'pemula', false,
  ARRAY['Berbaring miring, tumpu pada satu siku tepat di bawah bahu.','Angkat pinggul hingga badan lurus dari kepala ke kaki.','Tahan sesuai target, kunci core, lalu ganti sisi.'], '{bahu}', 'core', 'https://www.youtube.com/watch?v=WUFXF0qlM1o'),
('superman', 'Superman', 'Superman', 'core', '{back,glutes}', 'core', 'isolation', 'bodyweight', 'pemula', false,
  ARRAY['Telungkup, tangan lurus ke depan, kaki lurus ke belakang.','Angkat lengan, dada, dan kaki dari lantai bersamaan meremas punggung & glutes.','Tahan sejenak di atas, lalu turun perlahan terkontrol.'], '{punggung_bawah}', 'core', 'https://www.youtube.com/watch?v=1Sv7L-Qv9fo'),
('plank-shoulder-tap', 'Plank Shoulder Tap', 'Plank Tepuk Bahu', 'core', '{shoulders}', 'core', 'isolation', 'bodyweight', 'pemula', false,
  ARRAY['Mulai dari posisi plank tinggi, tangan di bawah bahu, badan lurus.','Tepuk bahu berlawanan dengan satu tangan tanpa menggoyang pinggul.','Kembalikan tangan, ganti sisi bergantian, jaga core kencang.'], '{bahu,pergelangan_tangan}', 'core', 'https://www.youtube.com/watch?v=OY_TJCRKSeI'),
('bear-crawl-hold', 'Bear Crawl Hold', 'Tahan Merangkak Beruang', 'core', '{shoulders}', 'core', 'isolation', 'bodyweight', 'pemula', false,
  ARRAY['Posisi merangkak, tangan di bawah bahu, lutut di bawah pinggul.','Angkat lutut beberapa cm dari lantai, jaga punggung rata.','Tahan posisi sambil bernapas teratur, kunci core.'], '{pergelangan_tangan}', 'core', 'https://www.youtube.com/watch?v=0xpNPGqNtCI'),
('suitcase-hold', 'Suitcase Hold', 'Suitcase Hold', 'core', '{}', 'core', 'isolation', 'dumbbell', 'pemula', false,
  ARRAY['Berdiri tegak memegang satu dumbbell di sisi tubuh seperti menjinjing koper.','Kunci core dan jaga bahu sejajar, jangan miring ke samping.','Tahan sesuai target waktu, lalu ganti sisi.'], '{punggung_bawah}', 'core', 'https://www.youtube.com/watch?v=mI55MER9XVw'),
('copenhagen-side-plank', 'Copenhagen Side Plank', 'Copenhagen Side Plank', 'core', '{glutes}', 'core', 'isolation', 'bodyweight', 'mahir', false,
  ARRAY['Posisi side plank dengan kaki atas bertumpu di bench, kaki bawah menggantung.','Angkat pinggul dan kaki bawah hingga badan lurus, remas otot paha dalam.','Tahan sesuai target, turun perlahan, lalu ganti sisi.'], '{lutut}', 'core', 'https://www.youtube.com/watch?v=nrBdhp-hWT0')
on conflict (slug) do nothing;
