-- nodes: individual graph elements on an agent's canvas
create table if not exists public.agent_nodes (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'knowledge',
  position_x double precision not null default 0,
  position_y double precision not null default 0,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agent_nodes_agent_id_idx on public.agent_nodes(agent_id);

-- edges: connections between nodes
create table if not exists public.agent_edges (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_node_id uuid not null references public.agent_nodes(id) on delete cascade,
  target_node_id uuid not null references public.agent_nodes(id) on delete cascade,
  label text,
  created_at timestamptz not null default now()
);

create index if not exists agent_edges_agent_id_idx on public.agent_edges(agent_id);
create unique index if not exists agent_edges_unique_pair
  on public.agent_edges(agent_id, source_node_id, target_node_id);

alter table public.agent_nodes enable row level security;
alter table public.agent_edges enable row level security;

-- owner policies for nodes
create policy "agent_nodes_select_own"
  on public.agent_nodes for select
  using (auth.uid() = user_id);

create policy "agent_nodes_insert_own"
  on public.agent_nodes for insert
  with check (auth.uid() = user_id);

create policy "agent_nodes_update_own"
  on public.agent_nodes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "agent_nodes_delete_own"
  on public.agent_nodes for delete
  using (auth.uid() = user_id);

-- anonymous read for nodes of published agents
create policy "agent_nodes_select_public_published"
  on public.agent_nodes for select
  to anon
  using (
    exists (
      select 1 from public.agents a
      where a.id = agent_nodes.agent_id and a.is_published = true
    )
  );

-- owner policies for edges
create policy "agent_edges_select_own"
  on public.agent_edges for select
  using (auth.uid() = user_id);

create policy "agent_edges_insert_own"
  on public.agent_edges for insert
  with check (auth.uid() = user_id);

create policy "agent_edges_update_own"
  on public.agent_edges for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "agent_edges_delete_own"
  on public.agent_edges for delete
  using (auth.uid() = user_id);

create policy "agent_edges_select_public_published"
  on public.agent_edges for select
  to anon
  using (
    exists (
      select 1 from public.agents a
      where a.id = agent_edges.agent_id and a.is_published = true
    )
  );

drop trigger if exists agent_nodes_set_updated_at on public.agent_nodes;
create trigger agent_nodes_set_updated_at
  before update on public.agent_nodes
  for each row execute function public.set_updated_at();
