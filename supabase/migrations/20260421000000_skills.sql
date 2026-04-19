-- skills: reusable instruction snippets an agent can be opted into. Each skill
-- is a markdown-style body with a short description; when an agent has a skill
-- attached, the runner appends it to the system prompt so the model applies it.

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text not null default '',
  instructions text not null default '',
  source text not null default 'inline' check (source in ('inline', 'uploaded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists skills_user_id_idx on public.skills(user_id);

alter table public.skills enable row level security;

create policy "skills_select_own"
  on public.skills for select
  using (auth.uid() = user_id);

create policy "skills_insert_own"
  on public.skills for insert
  with check (auth.uid() = user_id);

create policy "skills_update_own"
  on public.skills for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "skills_delete_own"
  on public.skills for delete
  using (auth.uid() = user_id);

drop trigger if exists skills_set_updated_at on public.skills;
create trigger skills_set_updated_at
  before update on public.skills
  for each row execute function public.set_updated_at();

-- agents: which skills this agent uses (parallel to mcp_integration_ids).
-- Added before the public policy since the policy references a.skill_ids.
alter table public.agents
  add column if not exists skill_ids uuid[] not null default '{}'::uuid[];

-- anon can read skills when any referencing agent is published, so public chat works
create policy "skills_select_public_published"
  on public.skills for select
  to anon
  using (
    exists (
      select 1
      from public.agents a
      where a.is_published = true
        and a.user_id = skills.user_id
        and a.skill_ids @> array[skills.id]
    )
  );
