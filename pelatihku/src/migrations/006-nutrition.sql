-- Target history (a new row whenever profile changes the computed targets).
create table public.nutrition_targets (
  user_id uuid references auth.users(id) on delete cascade not null,
  effective_date date not null default current_date,
  calorie_target int not null,
  protein_target_g int not null,
  tdee int not null,
  goal text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, effective_date)
);

alter table public.nutrition_targets enable row level security;

create policy "own nutrition_targets" on public.nutrition_targets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Protein/calorie intake log.
create table public.nutrition_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  log_date date not null default current_date,
  food_name text not null,
  protein_g numeric(6, 2) not null default 0,
  calories int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.nutrition_logs enable row level security;

create policy "own nutrition_logs" on public.nutrition_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index nutrition_logs_user_date_idx
  on public.nutrition_logs (user_id, log_date);
