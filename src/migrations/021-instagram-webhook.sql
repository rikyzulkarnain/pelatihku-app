-- Antrian event webhook Instagram (komentar, mention, dsb) + catatan balasan.
-- Dikonsumsi bot eksternal (Hermes) lewat /api/instagram/events dan
-- /api/instagram/reply, keduanya diautentikasi HERMES_API_KEY — BUKAN sesi
-- pengguna. Karena itu tabel di sini tidak punya user_id dan tidak punya policy
-- RLS sama sekali: hanya service-role client (server) yang boleh menyentuhnya.

create table public.instagram_events (
  id uuid default gen_random_uuid() primary key,
  -- Kunci idempoten. Meta mengirim ulang event yang sama kalau server balas
  -- non-2xx, jadi unique di sini yang mencegah bot membalas dua kali.
  event_key text not null unique,
  object text not null,
  field text,
  ig_account_id text,
  comment_id text,
  parent_id text,
  media_id text,
  from_id text,
  from_username text,
  message text,
  payload jsonb not null,
  status text not null default 'baru'
    check (status in ('baru', 'diproses', 'selesai', 'diabaikan')),
  -- Diisi bot kalau memutuskan skip (mis. komentar dari akun sendiri).
  note text,
  processed_at timestamp with time zone,
  received_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Bot menarik yang status 'baru' urut terlama dulu.
create index instagram_events_pending_idx
  on public.instagram_events (status, received_at);
create index instagram_events_comment_idx
  on public.instagram_events (comment_id);

alter table public.instagram_events enable row level security;

-- Catatan balasan yang sudah dikirim. Dua gunanya:
-- 1. comment_id unique = satu komentar tidak pernah dibalas dua kali (anti-spam).
-- 2. hitung balasan per jam untuk menahan diri di bawah limit 200/jam Instagram.
create table public.instagram_replies (
  id uuid default gen_random_uuid() primary key,
  comment_id text not null unique,
  message text not null,
  ig_reply_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index instagram_replies_created_at_idx
  on public.instagram_replies (created_at desc);

alter table public.instagram_replies enable row level security;
