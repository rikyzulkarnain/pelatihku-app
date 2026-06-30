-- Enable pgvector for semantic search (exercises + coach knowledge base).
create extension if not exists vector;
-- gen_random_uuid() is available by default on Supabase Postgres.
