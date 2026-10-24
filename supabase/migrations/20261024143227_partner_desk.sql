-- ---------- Partners (enrolment) ----------
create sequence public.mk_member_no_seq start 1;

create table public.mk_partners (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','suspended')),
  member_no integer unique,
  full_name text not null,
  mobile text not null,
  city text,
  experience text,
  areas text,
  cp_type text,
  firm_name text,
  rera text,
  segments text[] not null default '{}',
  buyers text[] not null default '{}',
  team_size text,
  closings text,
  pan text,
  gstin text,
  source text,
  notes text,
  reject_reason text,
  submitted_at timestamptz not null default now(),
  approved_at timestamptz,
  updated_at timestamptz not null default now()
);

-- ---------- Leads ----------
create table public.mk_leads (
  id bigint generated always as identity primary key,
  project text not null default 'KGR Fortune Anandam Villas',
  partner_id uuid references public.mk_partners(user_id) on delete set null,
  client_cc text not null default '+91',
  client_phone text not null,
  client_name text not null,
  client_email text,
  budget text,
  villas text[] not null default '{}',
  visit_date date,
  notes text,
  approval text not null default 'pending' check (approval in ('pending','approved','rejected','released')),
  stage text not null default 'registered' check (stage in ('registered','contacted','site_visit','negotiation','eoi','cheque','booked','lost','lost_other')),
  reject_reason text,
  registered_at timestamptz not null default now(),
  approved_at timestamptz,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);
create index mk_leads_phone_idx on public.mk_leads (client_cc, client_phone);
create index mk_leads_partner_idx on public.mk_leads (partner_id);

create table public.mk_lead_events (
  id bigint generated always as identity primary key,
  lead_id bigint not null references public.mk_leads(id) on delete cascade,
  at timestamptz not null default now(),
  actor uuid,
  actor_role text,
  action text not null,
  detail text
);
create index mk_lead_events_lead_idx on public.mk_lead_events (lead_id);

create table public.mk_dupe_attempts (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  partner_id uuid,
  client_cc text,
  client_phone text,
  holder_lead_id bigint references public.mk_leads(id) on delete set null
);

create table public.mk_settings (
  id integer primary key default 1 check (id = 1),
  protection_days integer not null default 60,
  extension_days integer not null default 30
);
insert into public.mk_settings (id) values (1);

-- ---------- Access rules ----------
alter table public.mk_partners enable row level security;
alter table public.mk_leads enable row level security;
alter table public.mk_lead_events enable row level security;
alter table public.mk_dupe_attempts enable row level security;
alter table public.mk_settings enable row level security;

create policy "Own profile or admin" on public.mk_partners for select to authenticated
  using (user_id = (select auth.uid()) or (select public.kgr_is_owner()));
create policy "Own leads or admin" on public.mk_leads for select to authenticated
  using (partner_id = (select auth.uid()) or (select public.kgr_is_owner()));
create policy "Events of visible leads" on public.mk_lead_events for select to authenticated
  using (exists (select 1 from public.mk_leads l where l.id = lead_id and (l.partner_id = (select auth.uid()) or (select public.kgr_is_owner()))));
create policy "Admins read duplicate attempts" on public.mk_dupe_attempts for select to authenticated
  using ((select public.kgr_is_owner()));
create policy "Signed-in read settings" on public.mk_settings for select to authenticated using (true);
-- No direct writes anywhere: every change goes through the functions below.

-- ---------- Helpers ----------
create or replace function public.mk_norm_phone(p text) returns text
language sql immutable set search_path = ''
as $$ select regexp_replace(coalesce(p,''), '\D', '', 'g') $$;

create or replace function public.mk_log(p_lead bigint, p_action text, p_detail text) returns void
language sql security definer set search_path = ''
as $$ insert into public.mk_lead_events (lead_id, actor, actor_role, action, detail)
      values (p_lead, auth.uid(), case when public.kgr_is_owner() then 'admin' else 'partner' end, p_action, p_detail) $$;
revoke all on function public.mk_log(bigint,text,text) from public, anon, authenticated;

-- The lead that currently holds a number (pending review, or approved and still protected).
create or replace function public.mk_holder(p_cc text, p_phone text) returns bigint
language sql stable security definer set search_path = ''
as $$
  select l.id from public.mk_leads l
  where l.client_cc = p_cc and l.client_phone = p_phone
    and (l.approval = 'pending'
         or (l.approval = 'approved' and l.stage not in ('lost','lost_other')
             and (l.stage = 'booked' or l.expires_at is null or l.expires_at > now())))
  order by l.registered_at limit 1
$$;
revoke all on function public.mk_holder(text,text) from public, anon, authenticated;

-- Who am I? admin / partner status / none
create or replace function public.mk_whoami() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare p public.mk_partners;
begin
  if auth.uid() is null then return jsonb_build_object('role','anon'); end if;
  if public.kgr_is_owner() then return jsonb_build_object('role','admin'); end if;
  select * into p from public.mk_partners where user_id = auth.uid();
  if not found then return jsonb_build_object('role','new'); end if;
  return jsonb_build_object('role','partner','status',p.status,'member_no',p.member_no,'name',p.full_name,'reject_reason',p.reject_reason);
end $$;

-- ---------- Partner: enrolment ----------
create or replace function public.mk_submit_enrolment(d jsonb) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := auth.uid(); v_email text; v_mobile text; v_pan text; existing text;
begin
  if v_uid is null then raise exception 'Log in first'; end if;
  if public.kgr_is_owner() then raise exception 'Admins do not enrol as partners'; end if;
  select status into existing from public.mk_partners where user_id = v_uid;
  if existing in ('approved','pending','suspended') then raise exception 'Your enrolment is already %', existing; end if;
  select email into v_email from auth.users where id = v_uid;
  v_mobile := right(public.mk_norm_phone(d->>'mobile'), 10);
  v_pan := upper(nullif(trim(d->>'pan'),''));
  if coalesce(trim(d->>'full_name'),'') = '' then raise exception 'Enter your full name'; end if;
  if v_mobile !~ '^[6-9][0-9]{9}$' then raise exception 'Enter a 10-digit Indian mobile number'; end if;
  if v_pan is null or v_pan !~ '^[A-Z]{5}[0-9]{4}[A-Z]$' then raise exception 'PAN should look like ABCDE1234F'; end if;
  if coalesce((d->>'terms')::boolean,false) is not true then raise exception 'Accept the partner terms to enrol'; end if;
  insert into public.mk_partners as p (user_id, email, status, full_name, mobile, city, experience, areas, cp_type, firm_name, rera, segments, buyers, team_size, closings, pan, gstin, source, notes, submitted_at, reject_reason)
  values (v_uid, v_email, 'pending', trim(d->>'full_name'), v_mobile, d->>'city', d->>'experience', d->>'areas', d->>'cp_type', nullif(trim(d->>'firm_name'),''), nullif(upper(trim(d->>'rera')),''),
          coalesce(array(select jsonb_array_elements_text(d->'segments')),'{}'), coalesce(array(select jsonb_array_elements_text(d->'buyers')),'{}'),
          d->>'team_size', d->>'closings', v_pan, nullif(upper(trim(d->>'gstin')),''), d->>'source', d->>'notes', now(), null)
  on conflict (user_id) do update set status='pending', full_name=excluded.full_name, mobile=excluded.mobile, city=excluded.city, experience=excluded.experience, areas=excluded.areas,
     cp_type=excluded.cp_type, firm_name=excluded.firm_name, rera=excluded.rera, segments=excluded.segments, buyers=excluded.buyers, team_size=excluded.team_size, closings=excluded.closings,
     pan=excluded.pan, gstin=excluded.gstin, source=excluded.source, notes=excluded.notes, submitted_at=now(), reject_reason=null, updated_at=now();
  return jsonb_build_object('ok',true);
end $$;

-- ---------- Partner: leads (replaced by the phone-normalising migration) ----------
create or replace function public.mk_check_phone(p_cc text, p_phone text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := auth.uid(); v_phone text := public.mk_norm_phone(p_phone); h bigint; owner_id uuid; is_admin boolean := public.kgr_is_owner();
begin
  if not is_admin and not exists (select 1 from public.mk_partners where user_id = v_uid and status = 'approved') then raise exception 'Your partner account is not active'; end if;
  h := public.mk_holder(p_cc, v_phone);
  if h is null then return jsonb_build_object('status','free'); end if;
  select partner_id into owner_id from public.mk_leads where id = h;
  if owner_id = v_uid then return jsonb_build_object('status','yours','lead_id',h); end if;
  if not is_admin then insert into public.mk_dupe_attempts (partner_id, client_cc, client_phone, holder_lead_id) values (v_uid, p_cc, v_phone, h); end if;
  return jsonb_build_object('status','taken');
end $$;

create or replace function public.mk_register_lead(d jsonb) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := auth.uid(); is_admin boolean := public.kgr_is_owner(); v_cc text := coalesce(nullif(d->>'cc',''),'+91');
        v_phone text := public.mk_norm_phone(d->>'phone'); h bigint; v_id bigint; days int;
begin
  if not is_admin and not exists (select 1 from public.mk_partners where user_id = v_uid and status = 'approved') then raise exception 'Your partner account is not active'; end if;
  if v_cc = '+91' and v_phone !~ '^[6-9][0-9]{9}$' then raise exception 'Enter a 10-digit Indian mobile number starting 6 to 9'; end if;
  if length(v_phone) < 6 or length(v_phone) > 14 then raise exception 'Check the phone number'; end if;
  if coalesce(trim(d->>'name'),'') = '' then raise exception 'Enter the client name'; end if;
  perform pg_advisory_xact_lock(hashtext(v_cc || v_phone));
  h := public.mk_holder(v_cc, v_phone);
  if h is not null then
    if not is_admin then insert into public.mk_dupe_attempts (partner_id, client_cc, client_phone, holder_lead_id) values (v_uid, v_cc, v_phone, h); end if;
    return jsonb_build_object('ok',false,'reason','taken');
  end if;
  select protection_days into days from public.mk_settings where id = 1;
  insert into public.mk_leads (partner_id, client_cc, client_phone, client_name, client_email, budget, villas, visit_date, notes, approval, approved_at, expires_at)
  values (case when is_admin then null else v_uid end, v_cc, v_phone, trim(d->>'name'), nullif(trim(d->>'email'),''), nullif(d->>'budget',''),
          coalesce(array(select jsonb_array_elements_text(d->'villas')),'{}'), nullif(d->>'visit_date','')::date, nullif(trim(d->>'notes'),''),
          case when is_admin then 'approved' else 'pending' end, case when is_admin then now() end, case when is_admin then now() + make_interval(days => days) end)
  returning id into v_id;
  perform public.mk_log(v_id, 'registered', case when is_admin then 'Direct Milke Khareedo lead' else null end);
  return jsonb_build_object('ok',true,'id',v_id);
end $$;

create or replace function public.mk_partner_stage(p_lead bigint, p_stage text) returns void
language plpgsql security definer set search_path = ''
as $$
declare l public.mk_leads;
begin
  select * into l from public.mk_leads where id = p_lead and partner_id = auth.uid();
  if not found then raise exception 'Lead not found'; end if;
  if l.approval <> 'approved' then raise exception 'You can update a lead once it is approved'; end if;
  if l.expires_at is not null and l.expires_at < now() and l.stage <> 'booked' then raise exception 'This lead''s protection has expired'; end if;
  if p_stage not in ('contacted','negotiation','lost') then raise exception 'Site visits, EOI, cheques and bookings are confirmed by the Milke Khareedo team'; end if;
  if l.stage in ('site_visit','eoi','cheque','booked','lost_other') then raise exception 'This lead is already past that stage'; end if;
  update public.mk_leads set stage = p_stage, updated_at = now() where id = p_lead;
  perform public.mk_log(p_lead, 'stage', p_stage);
end $$;

-- ---------- Admin actions ----------
create or replace function public.mk_admin_lead(p_lead bigint, p_action text, p_value text default null) returns void
language plpgsql security definer set search_path = ''
as $$
declare l public.mk_leads; s public.mk_settings;
begin
  if not public.kgr_is_owner() then raise exception 'Admins only'; end if;
  select * into l from public.mk_leads where id = p_lead for update;
  if not found then raise exception 'Lead not found'; end if;
  select * into s from public.mk_settings where id = 1;
  if p_action = 'approve' then
    if l.approval = 'approved' then return; end if;
    if exists (select 1 from public.mk_leads x where x.id <> l.id and x.client_cc = l.client_cc and x.client_phone = l.client_phone and x.approval = 'approved'
               and x.stage not in ('lost','lost_other') and (x.stage = 'booked' or x.expires_at > now())) then
      raise exception 'This number is already protected for another lead';
    end if;
    update public.mk_leads set approval='approved', approved_at=now(), expires_at = l.registered_at + make_interval(days => s.protection_days), reject_reason=null, updated_at=now() where id=p_lead;
    perform public.mk_log(p_lead,'approved', s.protection_days || ' days from registration');
  elsif p_action = 'reject' then
    update public.mk_leads set approval='rejected', reject_reason=p_value, updated_at=now() where id=p_lead;
    perform public.mk_log(p_lead,'rejected', p_value);
  elsif p_action = 'release' then
    update public.mk_leads set approval='released', updated_at=now() where id=p_lead;
    perform public.mk_log(p_lead,'released', p_value);
  elsif p_action = 'extend' then
    update public.mk_leads set expires_at = greatest(coalesce(l.expires_at, now()), now()) + make_interval(days => coalesce(nullif(p_value,'')::int, s.extension_days)), updated_at=now() where id=p_lead;
    perform public.mk_log(p_lead,'extended', coalesce(nullif(p_value,''), s.extension_days::text) || ' days');
  elsif p_action = 'stage' then
    if p_value not in ('registered','contacted','site_visit','negotiation','eoi','cheque','booked','lost','lost_other') then raise exception 'Unknown stage'; end if;
    update public.mk_leads set stage=p_value, updated_at=now() where id=p_lead;
    perform public.mk_log(p_lead,'stage', p_value);
  elsif p_action = 'reassign' then
    if not exists (select 1 from public.mk_partners where user_id = p_value::uuid and status='approved') then raise exception 'Pick an approved partner'; end if;
    update public.mk_leads set partner_id = p_value::uuid, updated_at=now() where id=p_lead;
    perform public.mk_log(p_lead,'reassigned', p_value);
  elsif p_action = 'note' then
    perform public.mk_log(p_lead,'note', p_value);
  else raise exception 'Unknown action';
  end if;
end $$;

create or replace function public.mk_admin_partner(p_user uuid, p_action text, p_reason text default null) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.kgr_is_owner() then raise exception 'Admins only'; end if;
  if p_action = 'approve' then
    update public.mk_partners set status='approved', approved_at=coalesce(approved_at, now()), member_no=coalesce(member_no, nextval('public.mk_member_no_seq')), reject_reason=null, updated_at=now() where user_id=p_user;
  elsif p_action = 'reject' then
    update public.mk_partners set status='rejected', reject_reason=p_reason, updated_at=now() where user_id=p_user;
  elsif p_action = 'suspend' then
    update public.mk_partners set status='suspended', reject_reason=p_reason, updated_at=now() where user_id=p_user;
  else raise exception 'Unknown action';
  end if;
end $$;

create or replace function public.mk_admin_settings(p_protection int, p_extension int) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.kgr_is_owner() then raise exception 'Admins only'; end if;
  if p_protection < 1 or p_protection > 365 or p_extension < 1 or p_extension > 365 then raise exception 'Use between 1 and 365 days'; end if;
  update public.mk_settings set protection_days=p_protection, extension_days=p_extension where id=1;
end $$;

-- Only signed-in people may call the public functions.
revoke all on function public.mk_whoami() from public, anon;
revoke all on function public.mk_submit_enrolment(jsonb) from public, anon;
revoke all on function public.mk_check_phone(text,text) from public, anon;
revoke all on function public.mk_register_lead(jsonb) from public, anon;
revoke all on function public.mk_partner_stage(bigint,text) from public, anon;
revoke all on function public.mk_admin_lead(bigint,text,text) from public, anon;
revoke all on function public.mk_admin_partner(uuid,text,text) from public, anon;
revoke all on function public.mk_admin_settings(int,int) from public, anon;
grant execute on function public.mk_whoami(), public.mk_submit_enrolment(jsonb), public.mk_check_phone(text,text), public.mk_register_lead(jsonb),
  public.mk_partner_stage(bigint,text), public.mk_admin_lead(bigint,text,text), public.mk_admin_partner(uuid,text,text), public.mk_admin_settings(int,int) to authenticated;
