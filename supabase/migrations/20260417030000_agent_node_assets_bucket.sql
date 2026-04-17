-- agent-node-assets: public-read storage bucket used by image/file nodes
-- inside the agent editor. Objects are namespaced as
--   <user_id>/<agent_id>/<filename>
-- so RLS can enforce owner-only writes using storage.foldername().

insert into storage.buckets (id, name, public)
values ('agent-node-assets', 'agent-node-assets', true)
on conflict (id) do update set public = excluded.public;

-- public read (bucket is public, but we still want an explicit policy so it
-- shows up in the dashboard and the intent is obvious)
drop policy if exists "agent_node_assets_public_read" on storage.objects;
create policy "agent_node_assets_public_read"
  on storage.objects for select
  using (bucket_id = 'agent-node-assets');

drop policy if exists "agent_node_assets_insert_own" on storage.objects;
create policy "agent_node_assets_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'agent-node-assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "agent_node_assets_update_own" on storage.objects;
create policy "agent_node_assets_update_own"
  on storage.objects for update
  using (
    bucket_id = 'agent-node-assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "agent_node_assets_delete_own" on storage.objects;
create policy "agent_node_assets_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'agent-node-assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
