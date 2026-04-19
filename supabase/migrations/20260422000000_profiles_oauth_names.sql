-- Populate profiles.first_name / last_name from OAuth user_metadata too.
-- Supabase stores provider fields on auth.users.raw_user_meta_data:
--   Google → given_name, family_name, name, full_name
--   GitHub → name (often "First Last"), user_name
-- Email/password signups still pass first_name / last_name via options.data.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  combined text;
  first_name text;
  last_name text;
begin
  -- prefer the explicit field, then Google's given_name, then derive from a
  -- combined "Full Name" field (GitHub uses `name`, some providers use `full_name`).
  combined := nullif(trim(coalesce(meta ->> 'full_name', meta ->> 'name', '')), '');

  first_name := coalesce(
    nullif(meta ->> 'first_name', ''),
    nullif(meta ->> 'given_name', ''),
    case when combined is not null then split_part(combined, ' ', 1) end
  );

  last_name := coalesce(
    nullif(meta ->> 'last_name', ''),
    nullif(meta ->> 'family_name', ''),
    case
      when combined is not null and position(' ' in combined) > 0
      then trim(substring(combined from position(' ' in combined) + 1))
    end
  );

  insert into public.profiles (id, first_name, last_name)
  values (new.id, first_name, last_name)
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Backfill existing rows whose names are NULL (e.g. OAuth users created before
-- this trigger update).
update public.profiles p
set
  first_name = coalesce(
    p.first_name,
    nullif(u.raw_user_meta_data ->> 'first_name', ''),
    nullif(u.raw_user_meta_data ->> 'given_name', ''),
    case
      when coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '') <> ''
      then split_part(
        trim(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name')),
        ' ',
        1
      )
    end
  ),
  last_name = coalesce(
    p.last_name,
    nullif(u.raw_user_meta_data ->> 'last_name', ''),
    nullif(u.raw_user_meta_data ->> 'family_name', ''),
    case
      when coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '') <> ''
        and position(' ' in trim(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'))) > 0
      then trim(
        substring(
          trim(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'))
          from position(' ' in trim(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'))) + 1
        )
      )
    end
  )
from auth.users u
where p.id = u.id
  and (p.first_name is null or p.last_name is null);
