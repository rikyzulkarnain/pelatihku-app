-- Coach RAG over the shared knowledge base.
create or replace function match_knowledge (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  category text,
  title text,
  content text,
  similarity float
)
language sql stable
as $$
  select
    kb.id,
    kb.category,
    kb.title,
    kb.content,
    1 - (kb.embedding <=> query_embedding) as similarity
  from knowledge_base kb
  where kb.embedding is not null
    and 1 - (kb.embedding <=> query_embedding) > match_threshold
  order by kb.embedding <=> query_embedding
  limit match_count;
$$;

-- Semantic search in the Exercise Library screen.
create or replace function match_exercises (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  name text,
  muscle_group text,
  equipment text,
  level text,
  similarity float
)
language sql stable
as $$
  select
    e.id,
    e.name,
    e.muscle_group,
    e.equipment,
    e.level,
    1 - (e.embedding <=> query_embedding) as similarity
  from exercises e
  where e.embedding is not null
    and 1 - (e.embedding <=> query_embedding) > match_threshold
  order by e.embedding <=> query_embedding
  limit match_count;
$$;
