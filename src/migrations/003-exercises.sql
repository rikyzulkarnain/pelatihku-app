-- Shared, read-only exercise library (also feeds the program generator + coach RAG).
create table public.exercises (
  id uuid default gen_random_uuid() primary key,
  slug text unique not null,
  name text not null,
  name_id text,
  muscle_group text not null,           -- legs/chest/back/shoulders/arms/core/full_body
  secondary_muscles text[] default '{}',
  movement_pattern text not null,       -- squat/hinge/push_*/pull_*/isolation_*/calf/core/cardio
  category text not null,               -- compound/isolation/cardio
  equipment text not null,              -- barbell/dumbbell/machine/bodyweight/cardio
  level text not null,                  -- pemula/menengah/mahir
  is_compound boolean not null default false,
  technique_steps text[] not null default '{}',
  injury_cautions text[] default '{}',  -- same vocabulary as fitness_profiles.injuries
  variation_group text,                 -- swap key: same group = swappable by equipment
  default_unilateral boolean default false,
  video_url text,
  image_url text,
  embedding vector(768),                -- semantic search (library) + coach RAG
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.exercises enable row level security;

create policy "exercises readable" on public.exercises
  for select using (auth.role() = 'authenticated');
