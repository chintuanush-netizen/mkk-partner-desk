create table public.kgr_owners (email text primary key);
create table public.kgr_villas (
  no integer primary key,
  plot integer not null,
  facing text not null check (facing in ('EAST','WEST','NORTH','SOUTH')),
  sft integer not null,
  status text not null default 'available' check (status in ('available','hold','booked')),
  hold_until date,
  updated_at timestamptz not null default now()
);
create table public.kgr_settings (
  id integer primary key default 1 check (id = 1),
  rate numeric not null default 0,
  charges jsonb not null default '[]'::jsonb,
  note text not null default '',
  updated_at timestamptz not null default now()
);

create or replace function public.kgr_is_owner() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.kgr_owners o where lower(o.email) = lower(coalesce(auth.jwt() ->> 'email',''))) $$;
revoke all on function public.kgr_is_owner() from public;
grant execute on function public.kgr_is_owner() to anon, authenticated;

create or replace function public.kgr_touch() returns trigger
language plpgsql set search_path = ''
as $$ begin new.updated_at = now(); return new; end $$;
create trigger kgr_villas_touch before update on public.kgr_villas for each row execute function public.kgr_touch();
create trigger kgr_settings_touch before update on public.kgr_settings for each row execute function public.kgr_touch();

alter table public.kgr_owners enable row level security;
alter table public.kgr_villas enable row level security;
alter table public.kgr_settings enable row level security;

create policy "Anyone can read villas" on public.kgr_villas for select to anon, authenticated using (true);
create policy "Owners update villas" on public.kgr_villas for update to authenticated using ((select public.kgr_is_owner())) with check ((select public.kgr_is_owner()));
create policy "Anyone can read settings" on public.kgr_settings for select to anon, authenticated using (true);
create policy "Owners update settings" on public.kgr_settings for update to authenticated using ((select public.kgr_is_owner())) with check ((select public.kgr_is_owner()));

create or replace function public.kgr_block_non_owner_signup() returns trigger
language plpgsql security definer set search_path = ''
as $$ begin
  if not exists (select 1 from public.kgr_owners o where lower(o.email) = lower(new.email)) then
    raise exception 'Email is not an approved owner';
  end if;
  return new;
end $$;
revoke all on function public.kgr_block_non_owner_signup() from public, anon, authenticated;
create trigger kgr_owner_signup_only before insert on auth.users for each row execute function public.kgr_block_non_owner_signup();

alter publication supabase_realtime add table public.kgr_villas, public.kgr_settings;

insert into public.kgr_owners (email) values ('chintuanush@gmail.com');
insert into public.kgr_settings (id, rate) values (1, 8100);
insert into public.kgr_villas (no, plot, facing, sft, status) values
(15,267,'WEST',3962,'available'),
(17,267,'WEST',3962,'available'),
(26,267,'EAST',3978,'available'),
(27,267,'EAST',3978,'available'),
(33,267,'EAST',3978,'available'),
(35,267,'EAST',3978,'available'),
(45,267,'WEST',3962,'available'),
(46,240,'WEST',3440,'available'),
(59,300,'SOUTH',4196,'available'),
(87,267,'EAST',3962,'available'),
(116,293,'EAST',4252,'available'),
(140,287,'EAST',4018,'available'),
(141,287,'WEST',4352,'available'),
(142,267,'WEST',3962,'available'),
(143,267,'WEST',3962,'available'),
(145,267,'WEST',3962,'available'),
(146,267,'WEST',3962,'available'),
(152,267,'EAST',3978,'available'),
(173,333,'WEST',4662,'available'),
(174,267,'WEST',3962,'available'),
(186,267,'EAST',3978,'available'),
(194,267,'EAST',3978,'available'),
(195,267,'EAST',3978,'available'),
(198,311,'WEST',4375,'available'),
(208,451,'EAST',6314,'available'),
(211,267,'WEST',3962,'available'),
(226,267,'WEST',3962,'available'),
(236,267,'WEST',3962,'available'),
(237,267,'WEST',3962,'available'),
(240,267,'WEST',3962,'available'),
(242,267,'WEST',3962,'available'),
(244,267,'EAST',3978,'available'),
(245,267,'EAST',3978,'available'),
(246,267,'EAST',3978,'available'),
(248,267,'EAST',3978,'available'),
(252,237,'EAST',3454,'available'),
(254,329,'WEST',4545,'available'),
(256,329,'WEST',4545,'available'),
(260,324,'WEST',4545,'available');
