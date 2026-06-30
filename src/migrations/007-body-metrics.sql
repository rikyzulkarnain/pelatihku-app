-- One weigh-in per day (upsert on conflict).
create table public.bodyweight_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  log_date date not null default current_date,
  weight_kg numeric(5, 2) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, log_date)
);

alter table public.bodyweight_logs enable row level security;

create policy "own bodyweight_logs" on public.bodyweight_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
