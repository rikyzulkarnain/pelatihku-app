-- Simpan gerakan ASLI sebuah slot program sebelum diubah PERMANEN oleh
-- "Generate Latihan Otomatis". Tanpa ini, perubahan permanen menimpa
-- exercise_id dan gerakan awal hilang — tidak bisa dikembalikan.
-- Null = slot belum pernah diubah permanen (masih gerakan aslinya).
alter table public.program_exercises
  add column if not exists baseline_exercise_id uuid references public.exercises(id);

comment on column public.program_exercises.baseline_exercise_id is
  'Gerakan asli sebelum diubah permanen oleh Generate Otomatis; untuk fitur "kembalikan ke latihan awal". Null = belum pernah diubah permanen.';
