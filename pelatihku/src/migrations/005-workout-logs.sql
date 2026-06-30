create table public.workout_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  program_id uuid references public.programs(id) on delete set null,
  program_day_id uuid references public.program_days(id) on delete set null,
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed', 'skipped')),
  started_at timestamp with time zone default timezone('utc'::text, now()) not null,
  completed_at timestamp with time zone,
  total_volume numeric default 0,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.workout_sessions enable row level security;

create policy "own sessions" on public.workout_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.set_logs (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.workout_sessions(id) on delete cascade not null,
  exercise_id uuid references public.exercises(id) not null,
  user_id uuid references auth.users(id) on delete cascade not null, -- denormalized for RLS
  set_index int not null,
  weight_kg numeric(6, 2) not null default 0,
  reps int not null,
  is_warmup boolean default false,
  rpe numeric(3, 1),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.set_logs enable row level security;

create policy "own set_logs" on public.set_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Supports the progressive-overload lookup (last logged sets for an exercise).
create index set_logs_user_exercise_idx
  on public.set_logs (user_id, exercise_id, created_at desc);
