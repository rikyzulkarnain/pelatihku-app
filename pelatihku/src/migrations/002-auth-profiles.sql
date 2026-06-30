-- ============================================================
-- Identity row (mirrors cafe-realtime-wpu profiles)
-- ============================================================
create table public.profiles (
  id uuid not null references auth.users on delete cascade,
  name text,
  avatar_url text,
  coach_persona text not null default 'suportif'
    check (coach_persona in ('tegas', 'suportif', 'santai')),
  onboarding_completed boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (id)
);

alter table public.profiles enable row level security;

create policy "own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- ============================================================
-- Onboarding answers + derived nutrition figures (1:1 with user)
-- ============================================================
create table public.fitness_profiles (
  user_id uuid not null references auth.users on delete cascade,
  gender text check (gender in ('cowok', 'cewek', 'rahasia')),
  age int check (age between 12 and 100),
  weight_kg numeric(5, 2) check (weight_kg > 0),
  height_cm numeric(5, 2) check (height_cm > 0),
  goal text check (goal in
    ('turun_lemak', 'naik_massa', 'toning', 'strength', 'kebugaran_umum')),
  experience_level text check (experience_level in ('pemula', 'menengah', 'mahir')),
  training_frequency int check (training_frequency between 2 and 6),
  equipment text check (equipment in ('gym_lengkap', 'dumbbell_saja', 'rumah_tanpa_alat')),
  injuries text[] default '{}',
  target_deadline date,
  -- derived (computed at onboarding finish, recomputed on weight/goal edit)
  tdee int,
  daily_calorie_target int,
  daily_protein_target_g int,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id)
);

alter table public.fitness_profiles enable row level security;

create policy "own fitness profile" on public.fitness_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- Seed BOTH rows from raw_user_meta_data on signup
-- ============================================================
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (new.id,
          new.raw_user_meta_data ->> 'name',
          new.raw_user_meta_data ->> 'avatar_url');

  insert into public.fitness_profiles (user_id)
  values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create function public.handle_delete_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  delete from public.profiles where id = old.id; -- cascade clears fitness too
  return old;
end;
$$;

create trigger on_auth_user_deleted
  after delete on auth.users
  for each row execute procedure public.handle_delete_user();
