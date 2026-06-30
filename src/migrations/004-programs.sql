-- Generated weekly program (one active per user).
create table public.programs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  split_type text not null,             -- full_body/upper_lower/ppl
  goal text not null,
  frequency_per_week int not null,
  rep_low int not null,
  rep_high int not null,
  set_low int not null,
  set_high int not null,
  includes_cardio boolean not null default false,
  is_active boolean not null default true,
  generated_meta jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.programs enable row level security;

create policy "own programs" on public.programs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.program_days (
  id uuid default gen_random_uuid() primary key,
  program_id uuid references public.programs(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null, -- denormalized for RLS
  day_index int not null,
  label text not null,
  focus text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.program_days enable row level security;

create policy "own program_days" on public.program_days
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.program_exercises (
  id uuid default gen_random_uuid() primary key,
  program_day_id uuid references public.program_days(id) on delete cascade not null,
  exercise_id uuid references public.exercises(id) not null,
  user_id uuid references auth.users(id) on delete cascade not null, -- denormalized for RLS
  order_index int not null,
  target_sets int not null,
  target_rep_low int not null,
  target_rep_high int not null,
  rest_seconds int default 90,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.program_exercises enable row level security;

create policy "own program_exercises" on public.program_exercises
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
