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
-- ══ STRENGTH / NAIK MASSA — barbell & machine compound ══
('conventional-deadlift', 'Deadlift', 'Deadlift Konvensional',
 'legs', '{glutes,back,core}', 'hinge', 'compound', 'barbell', 'menengah', true,
 ARRAY['Berdiri kaki selebar pinggul, barbel di atas tengah telapak kaki.','Tekuk pinggul dan lutut, genggam bar selebar bahu, dada tegak punggung netral.','Dorong lantai dengan kaki sambil mengangkat bar rapat ke tubuh hingga berdiri tegak.','Turunkan bar terkontrol dengan pola hinge, jaga punggung tetap lurus.'],
 '{punggung_bawah}', 'hinge', 'https://www.youtube.com/watch?v=XxWcirHIwVo'),
('sumo-deadlift', 'Sumo Deadlift', 'Deadlift Sumo',
 'legs', '{glutes,back,core}', 'hinge', 'compound', 'barbell', 'menengah', true,
 ARRAY['Ambil kuda-kuda lebar, ujung kaki mengarah keluar, tangan menggenggam bar di dalam kaki.','Turunkan pinggul, dada tegak, punggung netral, bahu di atas bar.','Dorong lantai dan buka pinggul untuk mengangkat bar hingga berdiri tegak.','Turunkan bar terkontrol menjaga punggung lurus.'],
 '{punggung_bawah}', 'hinge', 'https://www.youtube.com/watch?v=JbY72Him34Q'),
('barbell-front-squat', 'Barbell Front Squat', 'Front Squat Barbel',
 'legs', '{glutes,core}', 'squat', 'compound', 'barbell', 'menengah', true,
 ARRAY['Letakkan bar di depan bahu, siku tinggi sejajar lantai.','Berdiri kaki selebar bahu, jaga dada dan siku tetap terangkat.','Turun jongkok dengan mendorong pinggul ke belakang hingga paha sejajar lantai.','Dorong lantai untuk kembali berdiri, tumit tetap menapak.'],
 '{lutut,pergelangan_tangan}', 'squat', 'https://www.youtube.com/watch?v=v-mQm_droHg'),
('barbell-hip-thrust', 'Barbell Hip Thrust', 'Hip Thrust Barbel',
 'legs', '{glutes,core}', 'hinge', 'compound', 'barbell', 'menengah', true,
 ARRAY['Sandarkan punggung atas pada bangku, bar berlapis busa di lipatan pinggul.','Tekuk lutut, telapak kaki menapak penuh selebar pinggul.','Dorong pinggul ke atas hingga badan sejajar dari lutut ke bahu, remas glutes.','Turunkan pinggul terkontrol tanpa melengkungkan punggung bawah.'],
 '{punggung_bawah}', 'hinge', 'https://www.youtube.com/watch?v=SEdqd1n0cvg'),
('leg-press', 'Leg Press', 'Leg Press',
 'legs', '{glutes}', 'squat', 'compound', 'machine', 'pemula', true,
 ARRAY['Duduk di mesin, telapak kaki di platform selebar bahu.','Lepas pengaman, turunkan platform hingga lutut membentuk sekitar 90 derajat.','Dorong platform menjauh tanpa mengunci lutut sepenuhnya.','Jaga punggung bawah menempel pada sandaran sepanjang gerakan.'],
 '{lutut}', 'squat', 'https://www.youtube.com/watch?v=K5n2vg3oZa4'),
('hack-squat', 'Hack Squat', 'Hack Squat',
 'legs', '{glutes}', 'squat', 'compound', 'machine', 'menengah', true,
 ARRAY['Posisikan bahu di bawah bantalan, punggung menempel sandaran.','Kaki selebar bahu di platform, lepas pengaman.','Turun jongkok terkontrol hingga paha sejajar lantai.','Dorong kembali ke atas melalui tumit tanpa mengunci lutut keras.'],
 '{lutut}', 'squat', 'https://www.youtube.com/watch?v=rYgNArpwE7E'),
-- ══ PUSH ══
('incline-dumbbell-press', 'Incline Dumbbell Press', 'Incline Dumbbell Press',
 'chest', '{shoulders,arms}', 'push_horizontal', 'compound', 'dumbbell', 'pemula', true,
 ARRAY['Atur bangku pada kemiringan sekitar 30 derajat.','Pegang dumbbell setinggi dada, pergelangan tangan lurus.','Dorong dumbbell ke atas hingga lengan hampir lurus.','Turunkan terkontrol hingga terasa regangan di dada.'],
 '{bahu}', 'push_horizontal', 'https://www.youtube.com/watch?v=IP4oeKh1Sd4'),
('chest-press-machine', 'Machine Chest Press', 'Chest Press Mesin',
 'chest', '{shoulders,arms}', 'push_horizontal', 'compound', 'machine', 'pemula', true,
 ARRAY['Atur tinggi kursi agar pegangan sejajar tengah dada.','Punggung menempel sandaran, genggam pegangan.','Dorong pegangan ke depan hingga lengan hampir lurus.','Kembalikan terkontrol tanpa membenturkan beban.'],
 '{bahu}', 'push_horizontal', 'https://www.youtube.com/watch?v=sqNwDkUU_Ps'),
('chest-dip', 'Chest Dip', 'Dip Dada',
 'chest', '{arms,shoulders}', 'push_horizontal', 'compound', 'bodyweight', 'menengah', true,
 ARRAY['Naik ke palang paralel, lengan lurus menopang tubuh.','Condongkan badan sedikit ke depan untuk menargetkan dada.','Turun terkontrol hingga siku sekitar 90 derajat.','Dorong kembali ke atas hingga lengan lurus.'],
 '{bahu}', 'push_horizontal', 'https://www.youtube.com/watch?v=yN6Q1UI_xkE'),
('arnold-press', 'Arnold Press', 'Arnold Press',
 'shoulders', '{arms}', 'push_vertical', 'compound', 'dumbbell', 'menengah', true,
 ARRAY['Duduk tegak, mulai dengan dumbbell di depan bahu telapak menghadap tubuh.','Saat mendorong ke atas, putar pergelangan sehingga telapak menghadap depan.','Luruskan lengan di atas kepala tanpa mengunci keras.','Turunkan sambil memutar kembali ke posisi awal.'],
 '{bahu}', 'push_vertical', 'https://www.youtube.com/watch?v=ris9tKqMwgU'),
('machine-shoulder-press', 'Machine Shoulder Press', 'Shoulder Press Mesin',
 'shoulders', '{arms}', 'push_vertical', 'compound', 'machine', 'pemula', true,
 ARRAY['Atur kursi agar pegangan setinggi bahu.','Punggung menempel sandaran, genggam pegangan.','Dorong ke atas hingga lengan hampir lurus.','Turunkan terkontrol hingga setinggi bahu.'],
 '{bahu}', 'push_vertical', 'https://www.youtube.com/watch?v=3R14MnZbcpw'),
-- ══ PULL ══
('seated-cable-row', 'Seated Cable Row', 'Seated Cable Row',
 'back', '{arms,shoulders}', 'pull_horizontal', 'compound', 'machine', 'pemula', true,
 ARRAY['Duduk dengan lutut sedikit menekuk, pegang gagang, dada tegak.','Tarik gagang ke arah perut sambil meremas tulang belikat.','Jaga punggung tetap netral, jangan mengayun.','Ulur lengan kembali terkontrol menjaga postur tegak.'],
 '{punggung_bawah}', 'pull_horizontal', 'https://www.youtube.com/watch?v=vwHG9Jfu4sw'),
('t-bar-row', 'T-Bar Row', 'T-Bar Row',
 'back', '{arms,shoulders}', 'pull_horizontal', 'compound', 'barbell', 'menengah', true,
 ARRAY['Berdiri mengangkang bar, pinggul menekuk sekitar 45 derajat, punggung netral.','Genggam gagang, tarik bar ke arah dada bawah.','Remas punggung di puncak gerakan.','Turunkan terkontrol menjaga punggung tetap lurus.'],
 '{punggung_bawah}', 'pull_horizontal', 'https://www.youtube.com/watch?v=TyLoy3n_a10'),
('chin-up', 'Chin-Up', 'Chin-Up',
 'back', '{arms}', 'pull_vertical', 'compound', 'bodyweight', 'menengah', true,
 ARRAY['Gantung pada palang dengan pegangan selebar bahu telapak menghadap tubuh.','Tarik tubuh ke atas hingga dagu melewati palang.','Remas otot punggung dan bisep di puncak.','Turun terkontrol hingga lengan lurus penuh.'],
 '{bahu,siku}', 'pull_vertical', 'https://www.youtube.com/watch?v=e1YSApl-QcM'),
('face-pull', 'Face Pull', 'Face Pull',
 'shoulders', '{back}', 'isolation_back', 'isolation', 'machine', 'pemula', false,
 ARRAY['Atur katrol setinggi wajah dengan tali.','Tarik tali ke arah wajah, siku tinggi dan melebar.','Remas rear delt dan otot punggung atas.','Kembalikan terkontrol tanpa mengangkat bahu.'],
 '{bahu}', 'isolation_back', 'https://www.youtube.com/watch?v=eTCBSFlCJ_s'),
('dumbbell-shrug', 'Dumbbell Shrug', 'Shrug Dumbbell',
 'back', '{shoulders}', 'isolation_back', 'isolation', 'dumbbell', 'pemula', false,
 ARRAY['Berdiri tegak memegang dumbbell di samping tubuh.','Angkat bahu lurus ke atas ke arah telinga.','Tahan sebentar di puncak lalu turunkan terkontrol.','Hindari memutar bahu.'],
 '{}', 'isolation_back', 'https://www.youtube.com/watch?v=cJRVVxmytaM'),
-- ══ TONING / NAIK MASSA — isolasi lengan, kaki, dada, bahu, betis ══
('hammer-curl', 'Hammer Curl', 'Hammer Curl',
 'arms', '{}', 'isolation_biceps', 'isolation', 'dumbbell', 'pemula', false,
 ARRAY['Berdiri memegang dumbbell dengan telapak saling menghadap.','Tekuk siku mengangkat dumbbell menjaga pergelangan netral.','Remas bisep di puncak.','Turunkan terkontrol tanpa mengayun badan.'],
 '{siku}', 'isolation_biceps', 'https://www.youtube.com/watch?v=OPqe0kCxmR8'),
('barbell-curl', 'Barbell Biceps Curl', 'Barbell Curl',
 'arms', '{}', 'isolation_biceps', 'isolation', 'barbell', 'pemula', false,
 ARRAY['Berdiri memegang barbel selebar bahu, telapak menghadap depan.','Tekuk siku mengangkat bar ke arah dada.','Jaga siku tetap dekat tubuh, jangan mengayun.','Turunkan terkontrol hingga lengan lurus.'],
 '{siku}', 'isolation_biceps', 'https://www.youtube.com/watch?v=ZQWL7omZh94'),
('triceps-pushdown', 'Triceps Pushdown', 'Triceps Pushdown',
 'arms', '{}', 'isolation_triceps', 'isolation', 'machine', 'pemula', false,
 ARRAY['Berdiri menghadap katrol tinggi, genggam gagang.','Jaga siku menempel di sisi tubuh.','Luruskan lengan ke bawah hingga penuh, remas trisep.','Kembalikan terkontrol tanpa menggerakkan siku.'],
 '{siku}', 'isolation_triceps', 'https://www.youtube.com/watch?v=-zLyUAo1gMw'),
('overhead-triceps-extension', 'Overhead Triceps Extension', 'Overhead Triceps Extension',
 'arms', '{}', 'isolation_triceps', 'isolation', 'dumbbell', 'pemula', false,
 ARRAY['Pegang satu dumbbell dengan dua tangan di atas kepala.','Jaga siku mengarah ke depan dan dekat kepala.','Turunkan dumbbell ke belakang kepala dengan menekuk siku.','Luruskan kembali lengan ke atas, remas trisep.'],
 '{siku}', 'isolation_triceps', 'https://www.youtube.com/watch?v=fYqswDVbJDg'),
('skull-crusher', 'Skull Crusher', 'Skull Crusher',
 'arms', '{}', 'isolation_triceps', 'isolation', 'barbell', 'menengah', false,
 ARRAY['Berbaring di bangku, pegang barbel di atas dada lengan lurus.','Tekuk siku menurunkan bar ke arah dahi.','Jaga lengan atas tetap diam.','Luruskan kembali lengan ke posisi awal.'],
 '{siku}', 'isolation_triceps', 'https://www.youtube.com/watch?v=RavQHfFxbdA'),
('leg-extension', 'Leg Extension', 'Leg Extension',
 'legs', '{}', 'isolation_legs', 'isolation', 'machine', 'pemula', false,
 ARRAY['Duduk di mesin, sandaran kaki di atas pergelangan.','Luruskan lutut mengangkat beban hingga kaki hampir lurus.','Remas paha depan di puncak.','Turunkan terkontrol tanpa membanting beban.'],
 '{lutut}', 'isolation_legs', 'https://www.youtube.com/watch?v=swZQC689o9U'),
('lying-leg-curl', 'Lying Leg Curl', 'Lying Leg Curl',
 'legs', '{}', 'isolation_legs', 'isolation', 'machine', 'pemula', false,
 ARRAY['Telungkup di mesin, bantalan di atas tumit belakang.','Tekuk lutut menarik tumit ke arah bokong.','Remas hamstring di puncak.','Turunkan terkontrol.'],
 '{lutut}', 'isolation_legs', 'https://www.youtube.com/watch?v=q1cKTmaeQWo'),
('hip-abduction-machine', 'Hip Abduction Machine', 'Hip Abduction Mesin',
 'legs', '{glutes}', 'isolation_legs', 'isolation', 'machine', 'pemula', false,
 ARRAY['Duduk di mesin, sisi luar paha menempel bantalan.','Buka kedua kaki melawan tahanan.','Tahan sebentar di posisi terbuka.','Kembalikan terkontrol.'],
 '{}', 'isolation_legs', 'https://www.youtube.com/watch?v=h9BqUMqK-SY'),
('cable-crossover', 'Cable Crossover', 'Cable Crossover',
 'chest', '{shoulders}', 'isolation_chest', 'isolation', 'machine', 'menengah', false,
 ARRAY['Atur katrol tinggi, pegang gagang di kedua sisi, melangkah ke depan.','Sedikit condong ke depan, siku agak menekuk.','Bawa kedua tangan ke tengah di depan dada.','Kembalikan terkontrol merasakan regangan dada.'],
 '{bahu}', 'isolation_chest', 'https://www.youtube.com/watch?v=JUDTGZh4rhg'),
('dumbbell-lateral-raise', 'Lateral Raise', 'Lateral Raise',
 'shoulders', '{}', 'push_vertical', 'isolation', 'dumbbell', 'pemula', false,
 ARRAY['Berdiri memegang dumbbell di samping tubuh.','Angkat lengan ke samping hingga setinggi bahu, siku sedikit menekuk.','Jaga bahu tetap turun, jangan mengangkat trapezius.','Turunkan terkontrol.'],
 '{bahu}', 'push_vertical', 'https://www.youtube.com/watch?v=PzsMitRdI_8'),
('seated-calf-raise', 'Seated Calf Raise', 'Seated Calf Raise',
 'legs', '{}', 'calf', 'isolation', 'machine', 'pemula', false,
 ARRAY['Duduk dengan bantalan di atas paha, ujung kaki di pijakan.','Turunkan tumit hingga terasa regangan betis.','Angkat tumit setinggi mungkin, remas betis.','Turunkan terkontrol.'],
 '{pergelangan_kaki}', 'calf', 'https://www.youtube.com/watch?v=6O5hh1rBtx8'),
-- ══ TURUN LEMAK / KEBUGARAN UMUM — cardio & conditioning ══
('burpee', 'Burpee', 'Burpee',
 'full_body', '{legs,chest,core}', 'cardio', 'cardio', 'bodyweight', 'menengah', false,
 ARRAY['Mulai berdiri, lalu jongkok dan letakkan telapak tangan di lantai.','Lempar kaki ke belakang ke posisi plank.','Tarik kaki kembali ke jongkok.','Lompat tegak ke atas, ulangi berirama.'],
 '{punggung_bawah,pergelangan_tangan}', 'cardio', 'https://www.youtube.com/watch?v=G2hv_NYhM-A'),
('mountain-climber', 'Mountain Climber', 'Mountain Climber',
 'full_body', '{core,shoulders}', 'cardio', 'cardio', 'bodyweight', 'pemula', false,
 ARRAY['Mulai posisi plank tinggi, tubuh lurus.','Tarik satu lutut ke arah dada.','Ganti kaki dengan cepat seperti berlari di tempat.','Jaga pinggul tetap rendah dan inti aktif.'],
 '{pergelangan_tangan}', 'cardio', 'https://www.youtube.com/watch?v=cnyTQDSE884'),
('jumping-jack', 'Jumping Jack', 'Jumping Jack',
 'full_body', '{legs}', 'cardio', 'cardio', 'bodyweight', 'pemula', false,
 ARRAY['Berdiri tegak, kaki rapat, tangan di samping.','Lompat membuka kaki sambil mengangkat tangan ke atas kepala.','Lompat kembali ke posisi awal.','Pertahankan irama yang stabil.'],
 '{pergelangan_kaki}', 'cardio', 'https://www.youtube.com/watch?v=XR0xeuK5zBU'),
('kettlebell-swing', 'Kettlebell Swing', 'Kettlebell Swing',
 'full_body', '{glutes,back,core}', 'hinge', 'compound', 'dumbbell', 'menengah', true,
 ARRAY['Berdiri kaki selebar bahu, beban di depan, pola hinge pinggul.','Ayun beban ke belakang di antara kaki.','Dorong pinggul ke depan eksplosif mengayun beban setinggi dada.','Biarkan beban turun kembali dengan hinge, jaga punggung netral.'],
 '{punggung_bawah}', 'hinge', 'https://www.youtube.com/watch?v=sSESeQAir2M'),
('rowing-machine', 'Rowing Machine', 'Mesin Rowing',
 'full_body', '{back,legs,arms}', 'cardio', 'cardio', 'cardio', 'pemula', false,
 ARRAY['Duduk, ikat kaki, pegang gagang, mulai posisi catch lutut menekuk.','Dorong dengan kaki lebih dulu.','Lanjutkan dengan mencondong badan sedikit dan tarik gagang ke tulang rusuk bawah.','Kembali dengan urutan terbalik: lengan, badan, lalu lutut.'],
 '{punggung_bawah}', 'cardio', 'https://www.youtube.com/watch?v=ZN0J6qKCIrI'),
('stationary-bike', 'Stationary Bike', 'Sepeda Statis',
 'legs', '{glutes}', 'cardio', 'cardio', 'cardio', 'pemula', false,
 ARRAY['Atur tinggi sadel agar lutut sedikit menekuk saat pedal terbawah.','Pegang setang dengan rileks, punggung netral.','Kayuh dengan irama stabil sesuai intensitas target.','Jaga pergerakan lutut lurus ke depan.'],
 '{}', 'cardio', 'https://www.youtube.com/watch?v=gWosN1CY4bg'),
('elliptical-trainer', 'Elliptical Trainer', 'Elliptical',
 'full_body', '{legs}', 'cardio', 'cardio', 'cardio', 'pemula', false,
 ARRAY['Berdiri tegak, telapak kaki penuh di pijakan, pegang pegangan.','Gerakkan kaki dengan pola elips halus.','Libatkan tangan mendorong dan menarik pegangan.','Jaga postur tegak, inti aktif.'],
 '{}', 'cardio', 'https://www.youtube.com/watch?v=EesEvYohy5o'),
-- ══ KESUBURAN / MOBILITAS & PEMULIHAN — intensitas ringan, aktivasi inti & panggul ══
('glute-bridge-march', 'Glute Bridge March', 'Glute Bridge March',
 'core', '{glutes}', 'core', 'isolation', 'bodyweight', 'pemula', false,
 ARRAY['Berbaring telentang, lutut menekuk, telapak menapak lantai.','Angkat pinggul membentuk garis lurus bahu ke lutut.','Sambil pinggul tetap terangkat, angkat satu lutut ke arah dada bergantian.','Jaga pinggul stabil tidak miring, inti aktif.'],
 '{punggung_bawah}', 'core', 'https://www.youtube.com/watch?v=KsYwYl13IDc'),
('diaphragmatic-breathing', 'Diaphragmatic Breathing', 'Napas Diafragma',
 'core', '{}', 'core', 'isolation', 'bodyweight', 'pemula', false,
 ARRAY['Berbaring atau duduk nyaman, satu tangan di dada satu di perut.','Tarik napas lewat hidung mengembangkan perut, dada tetap diam.','Hembuskan perlahan lewat mulut mengempiskan perut.','Ulangi ritmis untuk relaksasi dan aktivasi inti dalam.'],
 '{}', 'core', 'https://www.youtube.com/watch?v=9jpchJcKivk'),
('world-greatest-stretch', 'Worlds Greatest Stretch', 'Peregangan Dinamis Menyeluruh',
 'full_body', '{legs,core}', 'core', 'isolation', 'bodyweight', 'pemula', false,
 ARRAY['Mulai posisi lunge depan dengan kaki depan menapak penuh.','Letakkan tangan di dalam kaki depan, turunkan siku ke arah lantai.','Putar dada membuka ke atas mengangkat satu tangan ke langit.','Kembali dan ganti sisi, gerakan halus terkontrol.'],
 '{}', 'core', 'https://www.youtube.com/watch?v=-CiWQ2IvY34')
on conflict (slug) do nothing;
