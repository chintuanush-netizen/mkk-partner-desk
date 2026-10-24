drop trigger if exists kgr_owner_signup_only on auth.users;
drop function if exists public.kgr_block_non_owner_signup();

alter table public.kgr_owners add column if not exists user_id uuid unique references auth.users(id) on delete set null;
update public.kgr_owners o set user_id = u.id from auth.users u where lower(u.email) = lower(o.email) and u.email_confirmed_at is not null;

create or replace function public.kgr_is_owner() returns boolean
language sql stable security definer set search_path = ''
as $$ select auth.uid() is not null and exists (select 1 from public.kgr_owners o where o.user_id = auth.uid()) $$;
revoke all on function public.kgr_is_owner() from public, anon;
grant execute on function public.kgr_is_owner() to authenticated;
