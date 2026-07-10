# Format Program Latihan & Data Latihan (Snapshot Saat Ini)

Dokumen ini merangkum **format program latihan** (cara program di-generate) dan
**seluruh data gerakan (exercise)** yang sudah ada, sebagai bahan untuk disusun ulang.

Sumber kebenaran (source of truth) di kode:

| Bagian | File |
| --- | --- |
| Skema tabel exercise | [`src/migrations/003-exercises.sql`](src/migrations/003-exercises.sql) |
| Skema tabel program | [`src/migrations/004-programs.sql`](src/migrations/004-programs.sql) |
| Logika penyusun program | [`src/features/program/generator.ts`](src/features/program/generator.ts) |
| Tipe TypeScript | [`src/types/program.d.ts`](src/types/program.d.ts) |
| Seed gerakan inti | [`src/migrations/010-seed-exercises.sql`](src/migrations/010-seed-exercises.sql) |
| Seed kesuburan | [`src/migrations/012-seed-fertility.sql`](src/migrations/012-seed-fertility.sql) |
| Seed tambahan #1 | [`src/migrations/014-seed-exercises-extra.sql`](src/migrations/014-seed-exercises-extra.sql) |
| Seed tambahan #2 (65 gerakan) | [`src/migrations/016-seed-exercises-extra.sql`](src/migrations/016-seed-exercises-extra.sql) |
| Referensi format lama | [`src/migrations/EXERCISES.md`](src/migrations/EXERCISES.md) |

**Total gerakan saat ini: 146** (25 dari seed 010 · 7 dari 012 · 13 dari 014 · 101 dari 016).

---

## BAGIAN 1 — FORMAT PROGRAM

### 1.1 Struktur data (skema DB)

Satu user punya **1 program aktif**. Program berisi beberapa **hari (program_days)**,
tiap hari berisi beberapa **gerakan (program_exercises)** yang mereferensikan
library `exercises`.

```
programs (1) ──< program_days (N) ──< program_exercises (N) >── exercises (library)
```

**`programs`**

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| `name` | text | mis. "Full Body — Turun Lemak" |
| `split_type` | text | `full_body` / `upper_lower` / `ppl` |
| `goal` | text | tujuan (lihat 1.2) |
| `frequency_per_week` | int | frekuensi latihan / minggu |
| `rep_low`, `rep_high` | int | rentang repetisi target |
| `set_low`, `set_high` | int | rentang set target |
| `includes_cardio` | bool | ada finisher kardio atau tidak |
| `is_active` | bool | satu aktif per user |
| `generated_meta` | jsonb | metadata generator (goal, level, bmi, dst.) |

**`program_days`** — `day_index`, `label` (mis. "Push"), `focus` (mis. "Dada, bahu, trisep").

**`program_exercises`** — `order_index`, `target_sets`, `target_rep_low`, `target_rep_high`,
`rest_seconds` (default 90), `notes`.

### 1.2 Tujuan (Goal) & parameter latihan

Referensi: NSCA *Essentials of S&C* (4th ed.), ACSM *Guidelines* (11th ed.), Schoenfeld et al.
`rest` dibedakan compound vs isolation; `cardio_minutes` = durasi finisher.
Kolom **Intensitas** menambahkan beban target (`%1RM` / `RIR` = reps-in-reserve) — parameter
yang paling menentukan hasil dan sebelumnya hilang (rep tanpa beban = tidak bermakna).

| Goal | Label | Rep | Set | Intensitas (%1RM · RIR) | Kardio | Rest compound | Rest isolation | Kardio (menit) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `turun_lemak` | Turun Lemak | 8–15 | 3–4 | 60–75% · RIR 1–2 | ✅ | 90s | 60s | 15–20 |
| `naik_massa` | Naik Massa | 6–12 | 3–5 | 67–80% · RIR 0–2 | ❌ | 120–180s | 90s | 10–15 |
| `toning` | Toning | 10–15 | 3–4 | 55–70% · RIR 1–3 | ✅ | 75s | 60s | 10–15 |
| `strength` | Strength | 3–6 | 4–6 | ≥85% (aksesori 70–80%) · RIR 1–3 | ❌ | 180–300s | 120s | 10–15 |
| `kebugaran_umum` | Kebugaran Umum | 10–12 | 2–3 | 60–70% · RIR 2–3 | ✅ | 90s | 60s | 15–20 |
| `kesuburan` | Persiapan Kehamilan | 8–12 | 2–3 | 50–65% · RIR 2–3 (hindari gagal/Valsalva) | ✅ | 90s | 60s | 20–30 |

> **Perubahan vs snapshot lama** (alasan di BAGIAN 4):
> `naik_massa` rest isolation 75s→**90s** & compound 120s→**120–180s** (Schoenfeld 2016: rest ≥2 mnt
> unggul untuk hipertrofi); `strength` rest naik ke rentang penuh **180–300s** (pemulihan neural
> untuk beban ≥85%). Kolom **Intensitas** wajib diisi generator, jika tidak "rep 3–6 untuk
> strength" tidak menjamin beban cukup berat.

### 1.3 Pemilihan split & struktur hari (per goal × frekuensi)

Frekuensi di-clamp ke **1–6** hari/minggu.

**Turun lemak & Kebugaran umum** — full body frekuensi tinggi + hari "Kondisi & Core":
- ≤3×: Full Body A/B/C
- 4×: FB A · FB B · **Kondisi & Core** · FB C
- 5×: FB A · FB B · **Kondisi & Core** · FB C · **Kondisi & Core 2**
- 6×: Upper/Lower — Upper A · Lower A · Kondisi · Upper B · Lower B · Kondisi 2

**Strength** — hari kekuatan murni (compound berat, tanpa isolasi lengan, istirahat penuh):
- ≤3×: Kekuatan Full A/B/C (full body)
- 4×: Kekuatan Bawah A · Kekuatan Atas A · Kekuatan Bawah B · Kekuatan Atas B
- 5×: + Teknik & Aksesori
- 6×: + Kekuatan Full

**Toning** — full body di frekuensi rendah, Upper/Lower + kondisi di frekuensi tinggi:
- ≤3×: Full Body A/B/C
- 4×: Upper A · Lower A · Upper B · Lower B
- 5×: Upper A · Lower A · Kondisi · Upper B · Lower B
- 6×: + Kondisi 2

**Naik massa (hipertrofi)** — progresi split klasik menurut frekuensi & level:
- ≤2×: Full Body
- 3×: pemula → Full Body; menengah/mahir → **PPL** (Push · Pull · Legs)
- 4×: Upper/Lower (Upper A · Lower A · Upper B · Lower B)
- 5–6×: pemula → Upper/Lower diperpanjang; menengah/mahir → **PPL** (5×: PPL + Upper + Lower; 6×: PPL ×2)

**Kesuburan** — desain khusus gender (full body, rotasi 3 hari):
- **Cewek:** Kekuatan & Core A · Tubuh Atas & Mobilitas · Glutes, Core & Kardio
- **Cowok:** Kekuatan Bawah · Kekuatan Atas · Full Body & Kardio
- Frekuensi >3 = rotasi diulang dengan penomoran.

### 1.4 Template hari (pola gerakan per hari)

Tiap hari = urutan **movement_pattern**; generator mengisi slot dengan gerakan nyata.

| Template | Pola gerakan |
| --- | --- |
| Full Body A | squat · push_horizontal · pull_horizontal · core |
| Full Body B | hinge · push_vertical · pull_vertical · core |
| Full Body C | squat · push_horizontal · pull_vertical · isolation_legs · core |
| Upper | push_horizontal · pull_horizontal · push_vertical · pull_vertical · isolation_biceps · isolation_triceps |
| Lower | squat · hinge · isolation_legs · calf · core |
| Push | push_horizontal · push_vertical · isolation_chest · isolation_triceps |
| Pull | pull_vertical · pull_horizontal · isolation_back · isolation_biceps |
| Legs | squat · hinge · isolation_legs · calf · core |
| Kondisi & Core | core · core · isolation_legs (+ kardio finisher di-boost) |
| Kekuatan Atas | push_horizontal · pull_horizontal · push_vertical · pull_vertical · core |
| Kekuatan Bawah | squat · hinge · isolation_legs · core |
| Kesuburan Pria Bawah | squat · hinge · isolation_legs · core · cardio |
| Kesuburan Pria Atas | push_horizontal · pull_horizontal · push_vertical · pull_vertical · core |
| Kesuburan Pria Full | squat · push_horizontal · pull_vertical · hinge · core · cardio |
| Kesuburan Wanita A | squat · hinge · push_horizontal · core · core |
| Kesuburan Wanita B | pull_horizontal · push_vertical · isolation_back · core · cardio |
| Kesuburan Wanita C | hinge · isolation_legs · push_horizontal · core · cardio |

### 1.5 Aturan pengisian gerakan (generator)

**Volume set (`target_sets`):**
- Pemula → `set_low`; Mahir → `set_high`; Menengah → rata-rata keduanya.
- Usia 55+ → ditahan maksimal di rata-rata (recovery).
- Isolation/core → maksimal 3 set.

**Repetisi:**
- Ikut rentang goal, KECUALI aksesori (isolation/core) saat goal `strength` → digeser ke 8–12.
- Remaja (<18) + `strength` → rep minimal 6 (hindari beban maksimal 3–5).

**Istirahat (`rest_seconds`):** `rest_compound`/`rest_isolation` per goal + bonus:
- Pemula +30s (belajar teknik), Usia 55+ +30s (recovery).

**Jumlah gerakan per hari (`maxPerDay`):**
- Pemula: 4 (kesuburan 5) · Mahir non-senior: 6 · lainnya: 5.

**Kardio finisher:** ditambahkan di goal yang `cardio: true` sebagai penutup berbasis
**menit** (bukan rep). Hari "Kondisi & Core" mendapat durasi +10 menit. Target deadline
ketat menaikkan durasi (1 bulan +10, 3 bulan +5). Dirotasi antar-hari.

**Pemilihan gerakan (`pickExercise`):** filter equipment yang diizinkan, hormati cedera,
utamakan level user (pemula tidak diberi gerakan mahir), rotasi variasi antar-hari,
prioritaskan slug preferensi goal (kesuburan: pelvic floor, napas diafragma, dll).

**Equipment yang diizinkan:**
- `gym_lengkap` → barbell, dumbbell, machine, bodyweight, cardio
- `dumbbell_saja` → dumbbell, bodyweight
- `di_rumah` (default) → bodyweight

**Mode low-impact** (hindari gerakan lompatan / high-impact) diaktifkan bila:
BMI ≥ 30, usia 55+, goal `kesuburan`, atau cedera `lutut`/`pergelangan_kaki`.

**Emphasis glutes** (cewek + goal toning/turun_lemak): tambah pola `hinge` di hari kaki.

---

## BAGIAN 2 — SKEMA GERAKAN (EXERCISE)

Semua gerakan masuk satu tabel `public.exercises`. Kolom penting:

| Kolom | Nilai valid |
| --- | --- |
| `muscle_group` | `legs` `chest` `back` `shoulders` `arms` `core` `full_body` |
| `movement_pattern` | `squat` `hinge` `push_horizontal` `push_vertical` `pull_horizontal` `pull_vertical` `isolation_biceps` `isolation_triceps` `isolation_chest` `isolation_back` `isolation_legs` `calf` `core` `cardio` |
| `category` | `compound` `isolation` `cardio` |
| `equipment` | `barbell` `dumbbell` `machine` `bodyweight` `cardio` |
| `level` | `pemula` `menengah` `mahir` |
| `injury_cautions` | `lutut` `punggung_bawah` `bahu` `siku` `pergelangan_tangan` `pergelangan_kaki` |

Kolom lain: `slug` (unik), `name`, `name_id`, `secondary_muscles[]`, `is_compound`,
`technique_steps[]`, `variation_group` (swap by equipment), `video_url`, `embedding` (auto).

**Aturan `variation_group`:** member group sama bisa di-swap generator lewat equipment
(`barbell → dumbbell → bodyweight`). Group compound utama sebaiknya punya varian bodyweight.

---

## BAGIAN 3 — KATALOG LENGKAP GERAKAN (146)

Dikelompokkan per `movement_pattern`. Kolom: **slug · nama · equipment · level ·
kategori · variation_group · secondary · injury_cautions · sumber seed**.
Langkah teknik (`technique_steps`) & `video_url` lengkap ada di file seed masing-masing.

### SQUAT (18)

| slug | nama | equip | level | kat | var_group | secondary | cautions | seed |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| barbell-back-squat | Barbell Back Squat | barbell | menengah | compound | squat | glutes,core | lutut,punggung_bawah | 010 |
| goblet-squat | Goblet Squat | dumbbell | pemula | compound | squat | glutes,core | lutut | 010 |
| bodyweight-squat | Bodyweight Squat | bodyweight | pemula | compound | squat | glutes | – | 010 |
| deep-squat-hold | Deep Squat Hold | bodyweight | pemula | compound | squat | glutes,core | lutut | 012 |
| bulgarian-split-squat | Bulgarian Split Squat | bodyweight | menengah | compound | squat | glutes,core | lutut | 014 |
| dumbbell-front-squat | Dumbbell Front Squat | dumbbell | menengah | compound | squat | glutes,core | lutut,punggung_bawah | 014 |
| squat-jump | Squat Jump | bodyweight | menengah | compound | squat | glutes,core | lutut,pergelangan_kaki | 014 |
| barbell-front-squat | Barbell Front Squat | barbell | menengah | compound | squat | glutes,core | lutut,pergelangan_tangan | 016 |
| leg-press | Leg Press | machine | pemula | compound | squat | glutes | lutut | 016 |
| hack-squat | Hack Squat | machine | menengah | compound | squat | glutes | lutut | 016 |
| box-squat | Box Squat | barbell | menengah | compound | squat | glutes,core | lutut,punggung_bawah | 016 |
| overhead-squat | Overhead Squat | barbell | mahir | compound | squat | shoulders,core | bahu,punggung_bawah,lutut | 016 |
| pistol-squat | Pistol Squat | bodyweight | mahir | compound | squat | glutes,core | lutut,pergelangan_kaki | 016 |
| wall-sit | Wall Sit | bodyweight | pemula | compound | squat | glutes | lutut | 016 |
| smith-machine-squat | Smith Machine Squat | machine | pemula | compound | squat | glutes | lutut,punggung_bawah | 016 |
| zercher-squat | Zercher Squat | barbell | mahir | compound | squat | core,arms | punggung_bawah,siku | 016 |
| box-jump | Box Jump | bodyweight | menengah | compound | squat | glutes,core | lutut,pergelangan_kaki | 016 |
| thruster | Thruster | barbell | mahir | compound | squat | legs,shoulders,core | bahu,lutut,punggung_bawah | 016 |

### HINGE (14)

| slug | nama | equip | level | kat | var_group | secondary | cautions | seed |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| barbell-rdl | Romanian Deadlift | barbell | menengah | compound | hinge | back,glutes | punggung_bawah | 010 |
| dumbbell-rdl | Dumbbell RDL | dumbbell | pemula | compound | hinge | glutes,back | punggung_bawah | 010 |
| glute-bridge | Glute Bridge | bodyweight | pemula | compound | hinge | glutes,core | – | 010 |
| hip-thrust | Hip Thrust | bodyweight | pemula | compound | hinge | glutes,core | punggung_bawah | 012 |
| single-leg-rdl | Single-leg RDL | bodyweight | menengah | compound | hinge | glutes,back | punggung_bawah | 014 |
| conventional-deadlift | Deadlift | barbell | menengah | compound | hinge | glutes,back,core | punggung_bawah | 016 |
| sumo-deadlift | Sumo Deadlift | barbell | menengah | compound | hinge | glutes,back,core | punggung_bawah | 016 |
| barbell-hip-thrust | Barbell Hip Thrust | barbell | menengah | compound | hinge | glutes,core | punggung_bawah | 016 |
| kettlebell-swing | Kettlebell Swing | dumbbell | menengah | compound | hinge | glutes,back,core | punggung_bawah | 016 |
| good-morning | Good Morning | barbell | menengah | compound | hinge | back,glutes | punggung_bawah | 016 |
| trap-bar-deadlift | Trap Bar Deadlift | barbell | menengah | compound | hinge | glutes,back,core | punggung_bawah | 016 |
| cable-pull-through | Cable Pull Through | machine | pemula | compound | hinge | glutes,back | punggung_bawah | 016 |
| single-leg-hip-thrust | Single Leg Hip Thrust | bodyweight | menengah | compound | hinge | glutes,core | punggung_bawah | 016 |
| dumbbell-snatch | Dumbbell Snatch | dumbbell | mahir | compound | hinge | legs,shoulders,back,core | punggung_bawah,bahu | 016 |

### PUSH_HORIZONTAL (12)

| slug | nama | equip | level | kat | var_group | secondary | cautions | seed |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| barbell-bench-press | Barbell Bench Press | barbell | menengah | compound | push_horizontal | shoulders,arms | bahu | 010 |
| dumbbell-bench-press | Dumbbell Bench Press | dumbbell | pemula | compound | push_horizontal | shoulders,arms | bahu | 010 |
| push-up | Push-up | bodyweight | pemula | compound | push_horizontal | shoulders,arms,core | pergelangan_tangan | 010 |
| incline-dumbbell-press | Incline Dumbbell Press | dumbbell | pemula | compound | push_horizontal | shoulders,arms | bahu | 016 |
| chest-press-machine | Machine Chest Press | machine | pemula | compound | push_horizontal | shoulders,arms | bahu | 016 |
| chest-dip | Chest Dip | bodyweight | menengah | compound | push_horizontal | arms,shoulders | bahu | 016 |
| close-grip-bench-press | Close Grip Bench Press | barbell | menengah | compound | push_horizontal | chest,shoulders | siku,bahu,pergelangan_tangan | 016 |
| incline-barbell-bench-press | Incline Barbell Bench Press | barbell | menengah | compound | push_horizontal | shoulders,arms | bahu | 016 |
| knee-push-up | Knee Push-Up | bodyweight | pemula | compound | push_horizontal | arms,shoulders,core | pergelangan_tangan | 016 |
| archer-push-up | Archer Push-Up | bodyweight | mahir | compound | push_horizontal | arms,shoulders,core | bahu,pergelangan_tangan | 016 |
| plyometric-push-up | Plyometric Push-Up | bodyweight | mahir | compound | push_horizontal | arms,shoulders,core | pergelangan_tangan,bahu | 016 |
| decline-push-up | Decline Push-Up | bodyweight | menengah | compound | push_horizontal | shoulders,arms,core | bahu,pergelangan_tangan | 016 |

### PUSH_VERTICAL (9)

| slug | nama | equip | level | kat | var_group | secondary | cautions | seed |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| barbell-overhead-press | Overhead Press | barbell | menengah | compound | push_vertical | arms,core | bahu | 010 |
| dumbbell-shoulder-press | Dumbbell Shoulder Press | dumbbell | pemula | compound | push_vertical | arms | bahu | 010 |
| pike-push-up | Pike Push-up | bodyweight | menengah | compound | push_vertical | arms | bahu,pergelangan_tangan | 010 |
| arnold-press | Arnold Press | dumbbell | menengah | compound | push_vertical | arms | bahu | 016 |
| machine-shoulder-press | Machine Shoulder Press | machine | pemula | compound | push_vertical | arms | bahu | 016 |
| dumbbell-lateral-raise | Lateral Raise | dumbbell | pemula | isolation | push_vertical | – | bahu | 016 |
| push-press | Push Press | barbell | mahir | compound | push_vertical | legs,arms,core | bahu,punggung_bawah | 016 |
| handstand-push-up | Handstand Push-Up | bodyweight | mahir | compound | push_vertical | arms,core | bahu,pergelangan_tangan | 016 |
| landmine-press | Landmine Press | barbell | menengah | compound | push_vertical | chest,core,arms | bahu | 016 |

### PULL_VERTICAL (5)

| slug | nama | equip | level | kat | var_group | secondary | cautions | seed |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| lat-pulldown | Lat Pulldown | machine | pemula | compound | pull_vertical | arms | – | 010 |
| pull-up | Pull-up | bodyweight | menengah | compound | pull_vertical | arms,core | bahu,siku | 010 |
| chin-up | Chin-Up | bodyweight | menengah | compound | pull_vertical | arms | bahu,siku | 016 |
| assisted-pull-up | Assisted Pull-Up | machine | pemula | compound | pull_vertical | arms | bahu | 016 |
| muscle-up | Muscle-Up | bodyweight | mahir | compound | pull_vertical | arms,chest,core | bahu,siku,pergelangan_tangan | 016 |

### PULL_HORIZONTAL (8)

| slug | nama | equip | level | kat | var_group | secondary | cautions | seed |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| barbell-row | Barbell Bent-over Row | barbell | menengah | compound | pull_horizontal | arms | punggung_bawah | 010 |
| dumbbell-row | Dumbbell One-arm Row | dumbbell | pemula | compound | pull_horizontal | arms | – | 010 |
| inverted-row | Inverted Row | bodyweight | pemula | compound | pull_horizontal | arms,core | – | 010 |
| renegade-row | Renegade Row | dumbbell | menengah | compound | pull_horizontal | arms,core | punggung_bawah | 014 |
| seated-cable-row | Seated Cable Row | machine | pemula | compound | pull_horizontal | arms,shoulders | punggung_bawah | 016 |
| t-bar-row | T-Bar Row | barbell | menengah | compound | pull_horizontal | arms,shoulders | punggung_bawah | 016 |
| chest-supported-row | Chest Supported Row | dumbbell | menengah | compound | pull_horizontal | arms,shoulders | bahu | 016 |
| pendlay-row | Pendlay Row | barbell | mahir | compound | pull_horizontal | arms,core | punggung_bawah | 016 |

### ISOLATION_BICEPS (7)

| slug | nama | equip | level | var_group | cautions | seed |
| --- | --- | --- | --- | --- | --- | --- |
| dumbbell-bicep-curl | Dumbbell Bicep Curl | dumbbell | pemula | isolation_biceps | siku | 010 |
| hammer-curl | Hammer Curl | dumbbell | pemula | isolation_biceps | siku | 016 |
| barbell-curl | Barbell Biceps Curl | barbell | pemula | isolation_biceps | siku | 016 |
| preacher-curl | Preacher Curl | machine | pemula | isolation_biceps | siku | 016 |
| incline-dumbbell-curl | Incline Dumbbell Curl | dumbbell | menengah | isolation_biceps | siku,bahu | 016 |
| concentration-curl | Concentration Curl | dumbbell | pemula | isolation_biceps | siku | 016 |
| cable-bicep-curl | Cable Bicep Curl | machine | pemula | isolation_biceps | siku | 016 |

### ISOLATION_TRICEPS (6)

| slug | nama | equip | level | var_group | cautions | seed |
| --- | --- | --- | --- | --- | --- | --- |
| triceps-dip-bench | Bench Triceps Dip | bodyweight | pemula | isolation_triceps | bahu | 010 |
| triceps-pushdown | Triceps Pushdown | machine | pemula | isolation_triceps | siku | 016 |
| overhead-triceps-extension | Overhead Triceps Extension | dumbbell | pemula | isolation_triceps | siku | 016 |
| skull-crusher | Skull Crusher | barbell | menengah | isolation_triceps | siku | 016 |
| dumbbell-kickback | Dumbbell Kickback | dumbbell | pemula | isolation_triceps | siku | 016 |
| diamond-push-up | Diamond Push-Up | bodyweight | menengah | isolation_triceps | pergelangan_tangan,siku | 016 |

### ISOLATION_CHEST (3)

| slug | nama | equip | level | var_group | cautions | seed |
| --- | --- | --- | --- | --- | --- | --- |
| dumbbell-chest-fly | Dumbbell Chest Fly | dumbbell | pemula | isolation_chest | bahu | 010 |
| cable-crossover | Cable Crossover | machine | menengah | isolation_chest | bahu | 016 |
| pec-deck-fly | Pec Deck Fly | machine | pemula | isolation_chest | bahu | 016 |

### ISOLATION_BACK (5)

| slug | nama | equip | level | var_group | secondary | cautions | seed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| dumbbell-rear-delt-fly | Rear Delt Fly | dumbbell | pemula | isolation_back | shoulders | – | 010 |
| face-pull | Face Pull | machine | pemula | isolation_back | back | bahu | 016 |
| dumbbell-shrug | Dumbbell Shrug | dumbbell | pemula | isolation_back | shoulders | – | 016 |
| straight-arm-pulldown | Straight Arm Pulldown | machine | menengah | isolation_back | core | bahu | 016 |
| reverse-pec-deck | Reverse Pec Deck | machine | pemula | isolation_back | back | bahu | 016 |

### ISOLATION_LEGS (13)

| slug | nama | equip | level | kat | var_group | secondary | cautions | seed |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| walking-lunge | Walking Lunge | bodyweight | pemula | compound | isolation_legs | glutes | lutut | 010 |
| reverse-lunge | Reverse Lunge | bodyweight | pemula | compound | isolation_legs | glutes | lutut | 014 |
| step-up | Step-up | bodyweight | pemula | compound | isolation_legs | glutes | lutut | 014 |
| nordic-hamstring-curl | Nordic Hamstring Curl | bodyweight | mahir | isolation | isolation_legs | core | lutut | 016 |
| leg-extension | Leg Extension | machine | pemula | isolation | isolation_legs | – | lutut | 016 |
| lying-leg-curl | Lying Leg Curl | machine | pemula | isolation | isolation_legs | – | lutut | 016 |
| hip-abduction-machine | Hip Abduction Machine | machine | pemula | isolation | isolation_legs | glutes | – | 016 |
| lateral-lunge | Lateral Lunge | bodyweight | menengah | compound | isolation_legs | glutes | lutut | 016 |
| curtsy-lunge | Curtsy Lunge | bodyweight | menengah | compound | isolation_legs | glutes | lutut | 016 |
| jump-lunge | Jump Lunge | bodyweight | mahir | compound | isolation_legs | glutes,core | lutut,pergelangan_kaki | 016 |
| hip-adduction-machine | Hip Adduction Machine | machine | pemula | isolation | isolation_legs | – | – | 016 |
| seated-leg-curl | Seated Leg Curl | machine | pemula | isolation | isolation_legs | – | lutut | 016 |
| sissy-squat | Sissy Squat | bodyweight | mahir | isolation | isolation_legs | core | lutut | 016 |

### CALF (4)

| slug | nama | equip | level | var_group | cautions | seed |
| --- | --- | --- | --- | --- | --- | --- |
| calf-raise | Standing Calf Raise | bodyweight | pemula | calf | – | 010 |
| seated-calf-raise | Seated Calf Raise | machine | pemula | calf | pergelangan_kaki | 016 |
| standing-calf-raise-machine | Standing Calf Raise Machine | machine | pemula | calf | pergelangan_kaki | 016 |
| single-leg-calf-raise | Single Leg Calf Raise | bodyweight | menengah | calf | pergelangan_kaki | 016 |

### CORE (28)

| slug | nama | equip | level | kat | secondary | cautions | seed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| plank | Plank | bodyweight | pemula | isolation | – | – | 010 |
| pelvic-floor-kegel | Pelvic Floor (Kegel) | bodyweight | pemula | isolation | – | – | 012 |
| bird-dog | Bird Dog | bodyweight | pemula | isolation | back,glutes | – | 012 |
| dead-bug | Dead Bug | bodyweight | pemula | isolation | – | – | 012 |
| cat-cow | Cat-Cow | bodyweight | pemula | isolation | back | – | 012 |
| side-plank | Side Plank | bodyweight | pemula | isolation | shoulders | bahu | 014 |
| superman | Superman | bodyweight | pemula | isolation | back,glutes | punggung_bawah | 014 |
| plank-shoulder-tap | Plank Shoulder Tap | bodyweight | pemula | isolation | shoulders | bahu,pergelangan_tangan | 014 |
| bear-crawl-hold | Bear Crawl Hold | bodyweight | pemula | isolation | shoulders | pergelangan_tangan | 014 |
| suitcase-hold | Suitcase Hold | dumbbell | pemula | isolation | – | punggung_bawah | 014 |
| copenhagen-side-plank | Copenhagen Side Plank | bodyweight | mahir | isolation | glutes | lutut | 014 |
| glute-bridge-march | Glute Bridge March | bodyweight | pemula | isolation | glutes | punggung_bawah | 016 |
| diaphragmatic-breathing | Diaphragmatic Breathing | bodyweight | pemula | isolation | – | – | 016 |
| world-greatest-stretch | Worlds Greatest Stretch | bodyweight | pemula | isolation | legs,core | – | 016 |
| crunch | Crunch | bodyweight | pemula | isolation | – | – | 016 |
| bicycle-crunch | Bicycle Crunch | bodyweight | pemula | isolation | – | punggung_bawah | 016 |
| russian-twist | Russian Twist | bodyweight | pemula | isolation | – | punggung_bawah | 016 |
| hanging-knee-raise | Hanging Knee Raise | bodyweight | menengah | isolation | arms | bahu | 016 |
| hanging-leg-raise | Hanging Leg Raise | bodyweight | mahir | isolation | arms | bahu,punggung_bawah | 016 |
| hollow-body-hold | Hollow Body Hold | bodyweight | menengah | isolation | – | punggung_bawah | 016 |
| v-up | V-Up | bodyweight | menengah | isolation | – | punggung_bawah | 016 |
| ab-wheel-rollout | Ab Wheel Rollout | bodyweight | menengah | isolation | shoulders,back | punggung_bawah,bahu | 016 |
| dragon-flag | Dragon Flag | bodyweight | mahir | isolation | back | punggung_bawah,bahu | 016 |
| pallof-press | Pallof Press | machine | pemula | isolation | shoulders | – | 016 |
| cable-woodchop | Cable Woodchop | machine | menengah | isolation | shoulders | punggung_bawah | 016 |
| l-sit | L-Sit | bodyweight | mahir | isolation | arms,shoulders | bahu,pergelangan_tangan | 016 |
| turkish-get-up | Turkish Get-Up | dumbbell | mahir | compound | core,shoulders,legs | bahu,punggung_bawah | 016 |
| farmer-carry | Farmer Carry | dumbbell | pemula | compound | core,back,arms | punggung_bawah | 016 |

### CARDIO (14)

| slug | nama | equip | level | secondary | cautions | seed |
| --- | --- | --- | --- | --- | --- | --- |
| jump-rope | Jump Rope / Lari | bodyweight | pemula | – | lutut | 010 |
| brisk-walk | Brisk Walk / Incline Walk | bodyweight | pemula | – | – | 012 |
| burpee | Burpee | bodyweight | menengah | legs,chest,core | punggung_bawah,pergelangan_tangan | 016 |
| mountain-climber | Mountain Climber | bodyweight | pemula | core,shoulders | pergelangan_tangan | 016 |
| jumping-jack | Jumping Jack | bodyweight | pemula | legs | pergelangan_kaki | 016 |
| rowing-machine | Rowing Machine | cardio | pemula | back,legs,arms | punggung_bawah | 016 |
| stationary-bike | Stationary Bike | cardio | pemula | glutes | – | 016 |
| elliptical-trainer | Elliptical Trainer | cardio | pemula | legs | – | 016 |
| treadmill-run | Treadmill Run | cardio | pemula | – | lutut,pergelangan_kaki | 016 |
| stair-climber | Stair Climber | cardio | pemula | glutes | lutut | 016 |
| high-knees | High Knees | bodyweight | pemula | legs,core | lutut,pergelangan_kaki | 016 |
| assault-bike | Assault Bike | cardio | menengah | legs,arms | – | 016 |
| shadow-boxing | Shadow Boxing | bodyweight | pemula | shoulders,core,arms | bahu | 016 |
| sprint-interval | Sprint Interval | cardio | mahir | legs | lutut,pergelangan_kaki | 016 |

---

## BAGIAN 4 — PENYESUAIAN STANDAR PAKAR (Personal Trainer / Dokter)

Hasil audit parameter di atas terhadap pedoman **NSCA, ACSM, WHO, dan ACOG**.
Verdict singkat: **kerangka goal-based sudah benar dan aman** (rep/set/rest per goal, gating
level, low-impact, split logis). Namun ada **prinsip inti yang hilang** — tanpa ini sebuah
program tidak dianggap "dirancang oleh PT" oleh standar profesi. Diurut dari paling kritis.

### 4.1 Progressive overload & periodisasi

Koreksi audit: mekanisme progresi **sudah ada** dan tidak perlu dibangun dari nol —
- [`overload.ts`](src/features/workout/overload.ts) `suggestNextSet`: double-progression per sesi
  (naikkan beban hanya jika semua set tembus rep atas; jika belum, tahan beban).
- [`progression.ts`](src/features/program/progression.ts): promosi level tiap 4–6 minggu berbasis
  kepatuhan ≥70% + tren volume, lalu regenerasi program.

Yang **masih kurang**:
- ✅ **Jangkar RIR** (autoregulasi) — kini ditambahkan (kolom `target_rir_*`), `suggestNextSet`
  bisa dikembangkan membaca RIR ini alih-alih hanya rep atas.
- ⬜ **Deload eksplisit** tiap 4–6 minggu (volume/intensitas −40–50% seminggu, khusus menengah/mahir)
  — belum ada; kandidat berikutnya (butuh `week_index` di siklus program).

### 4.2 Volume & frekuensi per otot per minggu (bukan hanya per sesi)

Aturan lama menghitung set **per hari**; hasil hipertrofi ditentukan **set per otot per minggu**.

- **Target volume (Schoenfeld):** ~**10–20 set/otot/minggu** untuk hipertrofi; ≥10 set ambang efektif.
  Strength cukup 6–10 set berat; pemula 8–12; kebugaran umum 6–10.
- **Frekuensi ≥2×/otot/minggu** mengungguli 1× pada volume sama. **Konsekuensi:** template **PPL 1×**
  (naik_massa 3×/mahir) melanggar ini — tiap otot cuma kena 1×/minggu. Untuk ≤4 hari, **Upper/Lower
  lebih baik daripada PPL**; PPL hanya untuk ≥5–6 hari (2× rotasi). Generator sebaiknya validasi
  frekuensi-per-otot, bukan hanya set-per-hari.

### 4.3 Warm-up & cool-down

Koreksi audit: warm-up **sudah ada** sebagai catatan di gerakan pertama tiap hari
([generator.ts](src/features/program/generator.ts): "Awali pemanasan 5-10 menit"). Peningkatan
opsional (belum dikerjakan): jadikan **slot terstruktur** (gerakan mobilitas nyata seperti `cat-cow`,
`world-greatest-stretch`, `bird-dog`) yang tak dihitung ke volume, plus slot pendinginan di akhir.

### 4.4 Kardio vs target WHO (turun_lemak & kebugaran)

WHO: **150–300 mnt/mgg intensitas sedang** (atau 75–150 mnt berat) + 2×/mgg penguatan otot.
Finisher 15–20 mnt × 3–5 hari = 45–100 mnt → **di bawah ambang WHO** untuk turun lemak yang berarti.

- Tampilkan **target kardio mingguan** (mis. "menuju 150→300 mnt/mgg"), bukan hanya menit/sesi.
- Untuk turun_lemak, izinkan **sesi kardio terpisah** (mis. brisk-walk NEAT/LISS) di luar finisher.

### 4.5 Kesuburan / Persiapan Kehamilan — penyesuaian keselamatan (ACOG)

Desain khusus gender + pelvic floor + low-impact **sudah tepat**. Tambahan kaidah ACOG:

- **Hindari posisi telentang (supine) lama** setelah trimester 1 (kompresi vena cava). Batasi/ganti
  `glute-bridge`, `hip-thrust`, `dead-bug`, `single-leg-hip-thrust` → versi incline/miring.
- **Hindari fleksi+rotasi tulang belakang** (risiko diastasis recti): drop `russian-twist`,
  `bicycle-crunch`, `v-up`, `crunch` untuk goal ini → utamakan **anti-rotasi** (`pallof-press`,
  `bird-dog`, `side-plank` ringan, `farmer-carry`).
- **Larang Valsalva & beban mendekati gagal** (RIR ≥2, sudah masuk 1.2); **hindari risiko jatuh/keseimbangan**
  (`single-leg-rdl`, `bulgarian-split-squat` tanpa pegangan) — perluas mode low-impact agar juga
  memfilter `balance/fall-risk`, bukan hanya lompatan.
- **Catatan istilah:** "kesuburan" (pra-konsepsi) berbeda dari "kehamilan". Untuk **pria**, latihan
  moderat mendukung kualitas sperma tetapi **panas skrotum berkepanjangan menurunkannya** — beri
  catatan pada `stationary-bike` (batasi durasi sepeda statis). Untuk **wanita**, hindari volume/energi
  defisit ekstrem (dapat mengganggu ovulasi). Sebaiknya beri **disclaimer medis + saran konsultasi
  dokter/ob-gyn** sebelum program dijalankan.

### 4.6 Catatan minor

- **"Toning"** bukan konsep fisiologis tersendiri (= turun lemak + hipertrofi ringan). Boleh dipertahankan
  sebagai label UX, tetapi parameternya benar diperlakukan sama seperti kombinasi keduanya.
- **`target_sets` isolation/core dibatasi 3** — sudah sesuai (aksesori tak perlu volume berat).
- **Gating level sudah baik** (deadlift/squat barbel = menengah; pemula tak diberi gerakan mahir).

### 4.7 Ringkasan tindakan untuk generator

| # | Perubahan | Status |
| --- | --- | --- |
| 1 | Kolom **Intensitas (%1RM + RIR)** di tiap gerakan (params → generator → DB → UI sesi) | ✅ **selesai** (migrasi 017) |
| 2 | Filter keselamatan kehamilan: fleksi+rotasi tulang belakang, risiko jatuh (Valsalva via RIR≥2) | ✅ **selesai** (`isPregnancyUnsafe`) |
| 3 | Rest hipertrofi (isolasi 75→90s) & strength (isolasi 90→120s) dinaikkan | ✅ **selesai** |
| 4 | **Deload** eksplisit tiap 4–6 minggu (butuh `week_index` siklus) | ⬜ belum |
| 5 | Frekuensi ≥2×/otot/minggu: naik_massa 3×/mgg kini **Full Body semua level** (PPL hanya 5–6 hari) | ✅ **selesai** |
| 6 | Slot **warm-up/cool-down terstruktur** (kini masih berupa catatan) | ⬜ opsional |
| 7 | **Target kardio mingguan** selaras WHO (150–300 mnt) di UI program | ✅ **selesai** |
| 8 | Disclaimer medis untuk goal `kesuburan` (konsultasi dokter/ob-gyn) | ✅ **selesai** |
| 9 | Gerakan **hold isometrik ditarget DETIK** (Plank 3×30-60 dtk, bukan "rep") — praktik pelatih | ✅ **selesai** ([hold-exercises.ts](src/constants/hold-exercises.ts)) |
| 10 | **Rotasi variasi ber-seed** — tie-break kandidat digilir per generasi, semua isi bank latihan kebagian (dulu alfabetis → plank dkk tak pernah muncul) | ✅ **selesai** |

### 4.8 Fitur penggantian latihan (custom & AI) — migrasi 018

Menjawab keluhan "bank latihan banyak tapi tidak semua muncul di program":

- **Custom:** user bisa mengganti gerakan slot mana pun dari halaman *Program → Atur*,
  dibatasi **kategori (movement_pattern) yang sama** & aman untuk alat/cedera/tujuannya.
- **Rekomendasi AI:** agent mempelajari **track record** (sesi selesai + riwayat set per
  kategori) sebelum menyarankan 1–3 pengganti beralasan ([override.ts](src/features/program/override.ts)).
- **Sementara & ber-riwayat:** penggantian berlaku **hanya untuk satu tanggal**
  (`exercise_overrides.override_date`, unik per slot+tanggal) — program asli tidak
  berubah; sesi pada tanggal itu otomatis memakai pengganti; semua tersimpan sebagai
  riwayat per tanggal.

> Sumber: WHO *Physical activity fact sheet* (2024, 150–300 mnt/mgg); ACOG FAQ119 *Exercise During
> Pregnancy* (2024, supine/Valsalva/fall-risk); NSCA *Essentials of S&C*; ACSM *Guidelines* (11th ed.);
> Schoenfeld et al. (rentang rep 6–15 setara untuk hipertrofi bila set disamakan; rest ≥2 mnt unggul).

---

## Ringkasan hitung

| movement_pattern | jumlah |
| --- | --- |
| squat | 18 |
| hinge | 14 |
| push_horizontal | 12 |
| push_vertical | 9 |
| pull_vertical | 5 |
| pull_horizontal | 8 |
| isolation_biceps | 7 |
| isolation_triceps | 6 |
| isolation_chest | 3 |
| isolation_back | 5 |
| isolation_legs | 13 |
| calf | 4 |
| core | 28 |
| cardio | 14 |
| **TOTAL** | **146** |

> Langkah teknik (`technique_steps`) dan `video_url` per gerakan tidak dimuat di tabel ini
> agar ringkas — ambil dari file seed asli bila diperlukan saat menyusun ulang.
