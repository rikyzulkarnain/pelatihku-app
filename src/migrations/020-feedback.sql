-- Masukan pengguna: saran fitur & laporan bug. Dibaca admin lewat service-role
-- (bypass RLS); pengguna hanya boleh menulis & melihat masukannya sendiri.
create table public.feedback (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null default 'saran'
    check (type in ('saran', 'bug', 'lainnya')),
  message text not null check (char_length(message) between 3 and 4000),
  -- Halaman/konteks tempat masukan dikirim (mis. "/program"), bantu admin menelusuri.
  page text,
  status text not null default 'baru'
    check (status in ('baru', 'diproses', 'selesai')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index feedback_created_at_idx on public.feedback (created_at desc);
create index feedback_status_idx on public.feedback (status);

alter table public.feedback enable row level security;

-- Pengguna: kirim & lihat masukannya sendiri. Perubahan status ditangani admin
-- lewat service-role client (melewati RLS), jadi tak perlu policy update di sini.
create policy "insert own feedback" on public.feedback
  for insert with check (auth.uid() = user_id);

create policy "read own feedback" on public.feedback
  for select using (auth.uid() = user_id);
