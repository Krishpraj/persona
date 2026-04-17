-- mcp_integrations: per-user MCP server connections. Secrets stored in Supabase Vault
-- as a single JSON bundle per integration. Non-secret config fields live in `config` jsonb.

create table if not exists public.mcp_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template_id text not null,
  label text not null,
  vault_secret_id uuid not null,
  config jsonb not null default '{}'::jsonb,
  secret_preview text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mcp_integrations_user_id_idx on public.mcp_integrations(user_id);

alter table public.mcp_integrations enable row level security;

-- vault_secret_id is a pointer only; reading the secret itself requires service_role.
create policy "mcp_integrations_select_own"
  on public.mcp_integrations for select
  using (auth.uid() = user_id);

create policy "mcp_integrations_insert_own"
  on public.mcp_integrations for insert
  with check (auth.uid() = user_id);

create policy "mcp_integrations_update_own"
  on public.mcp_integrations for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "mcp_integrations_delete_own"
  on public.mcp_integrations for delete
  using (auth.uid() = user_id);

drop trigger if exists mcp_integrations_set_updated_at on public.mcp_integrations;
create trigger mcp_integrations_set_updated_at
  before update on public.mcp_integrations
  for each row execute function public.set_updated_at();

-- cleanup: drop the Vault secret when the integration row is deleted
create or replace function public.mcp_integrations_cleanup_vault()
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

drop trigger if exists mcp_integrations_cleanup_vault_trg on public.mcp_integrations;
create trigger mcp_integrations_cleanup_vault_trg
  after delete on public.mcp_integrations
  for each row execute function public.mcp_integrations_cleanup_vault();

-- agents can reference a set of integrations the user has granted this agent access to.
-- No FK — Postgres arrays can't FK. The loader enforces user_id match for defense in depth.
alter table public.agents
  add column if not exists mcp_integration_ids uuid[] not null default '{}'::uuid[];
