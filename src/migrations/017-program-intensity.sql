-- Add load-intensity prescription to generated program exercises.
-- Sebelumnya program hanya menyimpan rep/set/rest — tanpa BEBAN target, "3-6 rep
-- untuk strength" tidak menjamin intensitas cukup (NSCA/ACSM: intensitas = %1RM
-- adalah variabel penentu utama). Kita simpan rentang %1RM + RIR (reps-in-reserve)
-- sebagai jangkar beban untuk suggestNextSet & tampilan UI.
--
-- Semua kolom NULLABLE: bodyweight → %1RM null (pakai RIR saja); kardio finisher →
-- kedua-duanya null (bertarget menit). Program lama tetap valid tanpa backfill.
alter table public.program_exercises
  add column if not exists target_intensity_low  int,  -- %1RM batas bawah (mis. 67)
  add column if not exists target_intensity_high int,  -- %1RM batas atas  (mis. 80)
  add column if not exists target_rir_low        int,  -- reps-in-reserve batas bawah
  add column if not exists target_rir_high       int;  -- reps-in-reserve batas atas

comment on column public.program_exercises.target_intensity_low is
  '%1RM batas bawah; null untuk bodyweight/kardio (pakai RIR / menit).';
comment on column public.program_exercises.target_rir_low is
  'Reps-in-reserve target (proksimitas ke kegagalan); kesuburan dijaga >=2.';
