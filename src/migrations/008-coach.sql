create table public.conversations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  persona text not null default 'suportif'
    check (persona in ('tegas', 'suportif', 'santai')),
  title text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.conversations enable row level security;

create policy "own conversations" on public.conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.chat_messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null, -- denormalized for RLS
  role text not null check (role in ('user', 'model')),
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.chat_messages enable row level security;

create policy "own chat_messages" on public.chat_messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Shared knowledge base for coach RAG (technique, nutrition, recovery, programming, motivation).
create table public.knowledge_base (
  id uuid default gen_random_uuid() primary key,
  category text not null,
  title text not null,
  content text not null,
  tags text[] default '{}',
  embedding vector(768),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.knowledge_base enable row level security;

create policy "knowledge readable" on public.knowledge_base
  for select using (auth.role() = 'authenticated');
