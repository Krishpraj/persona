-- project_data_sources: promote the data surface from agent-scoped node graph to
-- project-scoped *data sources* of three kinds: doc, nodegraph, csv. Each project
-- also auto-gets exactly one built-in "project-knowledge" MCP that every agent in
-- the project inherits.

-- ---------------------------------------------------------------------------
-- 1. data_sources container
-- ---------------------------------------------------------------------------

create table if not exists public.data_sources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('doc','nodegraph','csv')),
  name text not null,
  data jsonb not null default '{}'::jsonb,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists data_sources_project_id_idx on public.data_sources(project_id);
create index if not exists data_sources_user_id_idx on public.data_sources(user_id);

alter table public.data_sources enable row level security;

create policy "data_sources_select_own"
  on public.data_sources for select
  using (auth.uid() = user_id);

create policy "data_sources_insert_own"
  on public.data_sources for insert
  with check (auth.uid() = user_id);

create policy "data_sources_update_own"
  on public.data_sources for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "data_sources_delete_own"
  on public.data_sources for delete
  using (auth.uid() = user_id);

-- anon can read a project's data sources when any agent in the project is published
create policy "data_sources_select_public_published"
  on public.data_sources for select
  to anon
  using (
    exists (
      select 1 from public.agents a
      where a.project_id = data_sources.project_id and a.is_published = true
    )
  );

drop trigger if exists data_sources_set_updated_at on public.data_sources;
create trigger data_sources_set_updated_at
  before update on public.data_sources
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. data_source_nodes / data_source_edges (only for kind='nodegraph')
-- ---------------------------------------------------------------------------

create table if not exists public.data_source_nodes (
  id uuid primary key default gen_random_uuid(),
  data_source_id uuid not null references public.data_sources(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'knowledge',
  position_x double precision not null default 0,
  position_y double precision not null default 0,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists data_source_nodes_ds_id_idx on public.data_source_nodes(data_source_id);

create table if not exists public.data_source_edges (
  id uuid primary key default gen_random_uuid(),
  data_source_id uuid not null references public.data_sources(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_node_id uuid not null references public.data_source_nodes(id) on delete cascade,
  target_node_id uuid not null references public.data_source_nodes(id) on delete cascade,
  label text,
  created_at timestamptz not null default now()
);

create index if not exists data_source_edges_ds_id_idx on public.data_source_edges(data_source_id);
create unique index if not exists data_source_edges_unique_pair
  on public.data_source_edges(data_source_id, source_node_id, target_node_id);

alter table public.data_source_nodes enable row level security;
alter table public.data_source_edges enable row level security;

-- Guard: node/edge rows only permitted on nodegraph data sources
create or replace function public.data_source_nodes_guard_kind()
returns trigger
language plpgsql
as $$
declare k text;
begin
  select kind into k from public.data_sources where id = new.data_source_id;
  if k is null then
    raise exception 'data_source % not found', new.data_source_id;
  end if;
  if k <> 'nodegraph' then
    raise exception 'data_source % is kind=% (nodegraph required)', new.data_source_id, k;
  end if;
  return new;
end;
$$;

drop trigger if exists data_source_nodes_guard_kind_trg on public.data_source_nodes;
create trigger data_source_nodes_guard_kind_trg
  before insert or update on public.data_source_nodes
  for each row execute function public.data_source_nodes_guard_kind();

drop trigger if exists data_source_edges_guard_kind_trg on public.data_source_edges;
create trigger data_source_edges_guard_kind_trg
  before insert or update on public.data_source_edges
  for each row execute function public.data_source_nodes_guard_kind();

-- owner policies: nodes
create policy "data_source_nodes_select_own"
  on public.data_source_nodes for select
  using (auth.uid() = user_id);

create policy "data_source_nodes_insert_own"
  on public.data_source_nodes for insert
  with check (auth.uid() = user_id);

create policy "data_source_nodes_update_own"
  on public.data_source_nodes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "data_source_nodes_delete_own"
  on public.data_source_nodes for delete
  using (auth.uid() = user_id);

create policy "data_source_nodes_select_public_published"
  on public.data_source_nodes for select
  to anon
  using (
    exists (
      select 1
      from public.data_sources ds
      join public.agents a on a.project_id = ds.project_id
      where ds.id = data_source_nodes.data_source_id and a.is_published = true
    )
  );

-- owner policies: edges
create policy "data_source_edges_select_own"
  on public.data_source_edges for select
  using (auth.uid() = user_id);

create policy "data_source_edges_insert_own"
  on public.data_source_edges for insert
  with check (auth.uid() = user_id);

create policy "data_source_edges_update_own"
  on public.data_source_edges for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "data_source_edges_delete_own"
  on public.data_source_edges for delete
  using (auth.uid() = user_id);

create policy "data_source_edges_select_public_published"
  on public.data_source_edges for select
  to anon
  using (
    exists (
      select 1
      from public.data_sources ds
      join public.agents a on a.project_id = ds.project_id
      where ds.id = data_source_edges.data_source_id and a.is_published = true
    )
  );

drop trigger if exists data_source_nodes_set_updated_at on public.data_source_nodes;
create trigger data_source_nodes_set_updated_at
  before update on public.data_source_nodes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. Backfill from agent_nodes/agent_edges
--
-- Every agent with nodes becomes its own 'nodegraph' data source under the
-- agent's project. Node/edge row IDs are preserved; only the parent FK changes.
-- ---------------------------------------------------------------------------

-- map agent_id -> new data_source_id for agents that had nodes
create temporary table if not exists _ds_backfill_map (
  agent_id uuid primary key,
  data_source_id uuid not null
) on commit drop;

insert into _ds_backfill_map (agent_id, data_source_id)
select a.id, gen_random_uuid()
from public.agents a
where exists (select 1 from public.agent_nodes an where an.agent_id = a.id)
   or exists (select 1 from public.agent_edges ae where ae.agent_id = a.id);

insert into public.data_sources (id, project_id, user_id, kind, name, data, position, created_at, updated_at)
select m.data_source_id,
       a.project_id,
       a.user_id,
       'nodegraph',
       coalesce(a.name, 'Graph') || ' (graph)',
       '{}'::jsonb,
       0,
       a.created_at,
       a.updated_at
from _ds_backfill_map m
join public.agents a on a.id = m.agent_id;

insert into public.data_source_nodes (id, data_source_id, user_id, type, position_x, position_y, data, created_at, updated_at)
select an.id, m.data_source_id, an.user_id, an.type, an.position_x, an.position_y, an.data, an.created_at, an.updated_at
from public.agent_nodes an
join _ds_backfill_map m on m.agent_id = an.agent_id;

insert into public.data_source_edges (id, data_source_id, user_id, source_node_id, target_node_id, label, created_at)
select ae.id, m.data_source_id, ae.user_id, ae.source_node_id, ae.target_node_id, ae.label, ae.created_at
from public.agent_edges ae
join _ds_backfill_map m on m.agent_id = ae.agent_id;

drop table public.agent_edges;
drop table public.agent_nodes;

-- ---------------------------------------------------------------------------
-- 4. Storage bucket: project-data-assets
-- Keys: <user_id>/<project_id>/<data_source_id>/<filename>
-- Also rewrite any existing agent-node-assets objects into the new bucket by
-- mapping <user>/<agent_id>/... -> <user>/<project_id>/<new_ds_id>/...
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('project-data-assets', 'project-data-assets', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "project_data_assets_public_read" on storage.objects;
create policy "project_data_assets_public_read"
  on storage.objects for select
  using (bucket_id = 'project-data-assets');

drop policy if exists "project_data_assets_insert_own" on storage.objects;
create policy "project_data_assets_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'project-data-assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "project_data_assets_update_own" on storage.objects;
create policy "project_data_assets_update_own"
  on storage.objects for update
  using (
    bucket_id = 'project-data-assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "project_data_assets_delete_own" on storage.objects;
create policy "project_data_assets_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'project-data-assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Move existing objects from agent-node-assets to project-data-assets.
-- Old path: <user>/<agent_id>/<filename>
-- New path: <user>/<project_id>/<data_source_id>/<filename>
do $$
declare
  r record;
  parts text[];
  u text;
  agent_id uuid;
  proj uuid;
  ds_id uuid;
  new_name text;
begin
  for r in
    select id, name from storage.objects where bucket_id = 'agent-node-assets'
  loop
    parts := string_to_array(r.name, '/');
    if array_length(parts, 1) < 3 then
      continue;
    end if;
    u := parts[1];
    begin
      agent_id := parts[2]::uuid;
    exception when others then
      continue;
    end;
    select a.project_id into proj from public.agents a where a.id = agent_id;
    if proj is null then continue; end if;
    select m.data_source_id into ds_id from _ds_backfill_map m where m.agent_id = agent_id;
    if ds_id is null then continue; end if;
    new_name := u || '/' || proj::text || '/' || ds_id::text
              || '/' || array_to_string(parts[3:array_length(parts,1)], '/');
    update storage.objects
      set bucket_id = 'project-data-assets', name = new_name
      where id = r.id;
  end loop;
end $$;

-- Rewrite any storage_path / imagePath jsonb values captured in the migrated nodes
update public.data_source_nodes n
set data = jsonb_set(
  n.data,
  '{imagePath}',
  to_jsonb(
    regexp_replace(
      n.data->>'imagePath',
      '^([^/]+)/([^/]+)/(.+)$',
      '\1/' || (select a.project_id::text
                from public.agents a join _ds_backfill_map m on m.agent_id = a.id
                where m.data_source_id = n.data_source_id limit 1)
      || '/' || n.data_source_id::text || '/\3'
    )
  )
)
where n.type = 'image' and (n.data ? 'imagePath') and nullif(n.data->>'imagePath','') is not null;

-- ---------------------------------------------------------------------------
-- 5. MCP refactor: one project-knowledge MCP per project
-- ---------------------------------------------------------------------------

-- purge old generic templates and their vault secrets (trigger handles vault cleanup)
delete from public.mcp_integrations where template_id in ('custom-sse','custom-http');

-- vault_secret_id can now be null for built-in MCPs
alter table public.mcp_integrations alter column vault_secret_id drop not null;

-- project_id column (nullable so future user-level MCPs still fit)
alter table public.mcp_integrations
  add column if not exists project_id uuid references public.projects(id) on delete cascade;

create index if not exists mcp_integrations_project_id_idx on public.mcp_integrations(project_id);

-- exactly one project-knowledge MCP per project
create unique index if not exists mcp_integrations_project_knowledge_unique
  on public.mcp_integrations(project_id)
  where template_id = 'project-knowledge';

-- seed: one row per existing project
insert into public.mcp_integrations (user_id, project_id, template_id, label, vault_secret_id, config, is_active)
select p.user_id, p.id, 'project-knowledge', coalesce(p.name, 'Project') || ' knowledge', null, '{}'::jsonb, true
from public.projects p
on conflict do nothing;

-- trigger: auto-seed a project-knowledge MCP when a project is created
create or replace function public.projects_seed_knowledge_mcp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.mcp_integrations (user_id, project_id, template_id, label, vault_secret_id, config, is_active)
  values (new.user_id, new.id, 'project-knowledge', coalesce(new.name, 'Project') || ' knowledge', null, '{}'::jsonb, true);
  return new;
end;
$$;

drop trigger if exists projects_seed_knowledge_mcp_trg on public.projects;
create trigger projects_seed_knowledge_mcp_trg
  after insert on public.projects
  for each row execute function public.projects_seed_knowledge_mcp();

-- agents: backfill so each existing agent includes its project's knowledge MCP
update public.agents a
set mcp_integration_ids = array(
  select distinct e.iid
  from unnest(
    a.mcp_integration_ids ||
    array(select m.id from public.mcp_integrations m
          where m.project_id = a.project_id and m.template_id = 'project-knowledge')
  ) as e(iid)
);

-- trigger: auto-attach the project-knowledge MCP to every new agent
create or replace function public.agents_attach_knowledge_mcp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare mcp_id uuid;
begin
  select id into mcp_id
  from public.mcp_integrations
  where project_id = new.project_id and template_id = 'project-knowledge'
  limit 1;
  if mcp_id is not null and not (new.mcp_integration_ids @> array[mcp_id]) then
    update public.agents
    set mcp_integration_ids = new.mcp_integration_ids || array[mcp_id]
    where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists agents_attach_knowledge_mcp_trg on public.agents;
create trigger agents_attach_knowledge_mcp_trg
  after insert on public.agents
  for each row execute function public.agents_attach_knowledge_mcp();
