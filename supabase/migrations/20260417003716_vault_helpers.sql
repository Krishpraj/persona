-- Public-schema wrappers so the Supabase JS client (PostgREST) can call vault
-- operations via rpc(). Only service_role should ever invoke these.
create or replace function public.create_vault_secret(
  new_secret text,
  new_name text,
  new_description text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  secret_id uuid;
begin
  -- restrict to service_role (postgres) even if accidentally granted to others
  if current_user not in ('postgres', 'supabase_admin', 'service_role') then
    raise exception 'create_vault_secret: not authorized';
  end if;
  secret_id := vault.create_secret(new_secret, new_name, new_description);
  return secret_id;
end;
$$;

revoke all on function public.create_vault_secret(text, text, text) from public, anon, authenticated;
grant execute on function public.create_vault_secret(text, text, text) to service_role;

create or replace function public.read_vault_secret(secret_id uuid)
returns text
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  raw text;
begin
  if current_user not in ('postgres', 'supabase_admin', 'service_role') then
    raise exception 'read_vault_secret: not authorized';
  end if;
  select decrypted_secret into raw from vault.decrypted_secrets where id = secret_id;
  return raw;
end;
$$;

revoke all on function public.read_vault_secret(uuid) from public, anon, authenticated;
grant execute on function public.read_vault_secret(uuid) to service_role;
