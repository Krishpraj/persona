-- usage_events: per-call telemetry for agent chat runs and MCP tool invocations.
-- One row per event. `kind` is polymorphic so a single table backs both the
-- agent-history timeline and the MCP-call-history timeline on the dashboard.

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  agent_id uuid references public.agents(id) on delete set null,
  kind text not null check (kind in ('agent_run', 'mcp_call')),
  tool_name text,
  integration_id uuid references public.mcp_integrations(id) on delete set null,
  model text,
  status text not null default 'ok' check (status in ('ok', 'error')),
  duration_ms integer,
  input_tokens integer,
  output_tokens integer,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists usage_events_user_created_idx
  on public.usage_events (user_id, created_at desc);
create index if not exists usage_events_agent_created_idx
  on public.usage_events (agent_id, created_at desc);
create index if not exists usage_events_kind_idx
  on public.usage_events (kind);

alter table public.usage_events enable row level security;

-- Users can read their own telemetry; writes happen only via service_role
-- from the chat runner, so no insert policy is granted to authenticated users.
create policy "usage_events_select_own"
  on public.usage_events for select
  using (auth.uid() = user_id);
