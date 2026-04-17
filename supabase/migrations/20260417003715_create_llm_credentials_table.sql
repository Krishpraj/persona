-- llm_credentials: user-provided API keys for BYO LLM, stored in Supabase Vault
do $$ begin
  create type public.llm_provider as enum ('openai','anthropic','ollama');
exception when duplicate_object then null; end $$;

create table if not exists public.llm_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider public.llm_provider not null,
  label text not null,
  vault_secret_id uuid not null,
  key_preview text not null,
  base_url text,
  model_default text,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists llm_credentials_user_id_idx on public.llm_credentials(user_id);

-- enforce at most one active credential per user
create unique index if not exists llm_credentials_one_active_per_user
  on public.llm_credentials(user_id) where is_active;

alter table public.llm_credentials enable row level security;

-- owner CRUD — but vault_secret_id must never be exposed to client.
-- API routes return a projected view (see /api/settings/llm). Anon key can still read the
-- vault_secret_id column if someone queries directly; this is acceptable because the column
-- is only a pointer — reading the secret itself requires the service_role.
create policy "llm_credentials_select_own"
  on public.llm_credentials for select
  using (auth.uid() = user_id);

create policy "llm_credentials_insert_own"
  on public.llm_credentials for insert
  with check (auth.uid() = user_id);

create policy "llm_credentials_update_own"
  on public.llm_credentials for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "llm_credentials_delete_own"
  on public.llm_credentials for delete
  using (auth.uid() = user_id);

drop trigger if exists llm_credentials_set_updated_at on public.llm_credentials;
create trigger llm_credentials_set_updated_at
  before update on public.llm_credentials
  for each row execute function public.set_updated_at();

-- cleanup: when a credential row is deleted, drop the corresponding vault secret
create or replace function public.llm_credentials_cleanup_vault()
returns trigger
language plpgsql
security definer
set search_path = public, vault
as $$
begin
  delete from vault.secrets where id = old.vault_secret_id;
  return old;
end;
$$;

drop trigger if exists llm_credentials_cleanup_vault_trg on public.llm_credentials;
create trigger llm_credentials_cleanup_vault_trg
  after delete on public.llm_credentials
  for each row execute function public.llm_credentials_cleanup_vault();
