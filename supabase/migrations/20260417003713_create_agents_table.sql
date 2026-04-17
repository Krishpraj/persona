-- agents: a deployable graph/canvas inside a project (e.g. "tax agent")
create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  role text,
  description text,
  system_prompt text,
  is_published boolean not null default false,
  public_slug text unique,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agents_project_id_idx on public.agents(project_id);
create index if not exists agents_user_id_idx on public.agents(user_id);

alter table public.agents enable row level security;

-- owner has full control
create policy "agents_select_own"
  on public.agents for select
  using (auth.uid() = user_id);

create policy "agents_insert_own"
  on public.agents for insert
  with check (auth.uid() = user_id);

create policy "agents_update_own"
  on public.agents for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "agents_delete_own"
  on public.agents for delete
  using (auth.uid() = user_id);

-- anonymous can read when published (drives /a/<slug>)
create policy "agents_select_public_published"
  on public.agents for select
  to anon
  using (is_published = true);

drop trigger if exists agents_set_updated_at on public.agents;
create trigger agents_set_updated_at
  before update on public.agents
  for each row execute function public.set_updated_at();
