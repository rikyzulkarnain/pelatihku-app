-- Penggantian latihan SEMENTARA per tanggal (custom pilihan user / rekomendasi AI).
-- Program asli TIDAK berubah — override hanya berlaku pada `override_date`;
-- sesi pada tanggal itu memakai gerakan pengganti, tanggal lain kembali normal.
-- Riwayat penggantian = isi tabel ini (per tanggal), tidak pernah dihapus otomatis.
create table public.exercise_overrides (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  program_exercise_id uuid references public.program_exercises(id) on delete cascade not null,
  replacement_exercise_id uuid references public.exercises(id) not null,
  override_date date not null,                      -- berlaku HANYA tanggal ini
  source text not null check (source in ('custom', 'ai')),
  reason text,                                      -- alasan AI / catatan user
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (program_exercise_id, override_date)       -- satu pengganti per slot per tanggal
);

alter table public.exercise_overrides enable row level security;

create policy "own exercise_overrides" on public.exercise_overrides
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index exercise_overrides_user_date_idx
  on public.exercise_overrides (user_id, override_date desc);
