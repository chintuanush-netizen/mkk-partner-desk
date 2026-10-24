-- National number from what was typed: digits only, drop leading zeros and a repeated country code.
create or replace function public.mk_national(p_cc text, p_phone text) returns text
language plpgsql immutable set search_path = ''
as $$
declare d text := regexp_replace(coalesce(p_phone,''), '\D', '', 'g'); c text := regexp_replace(coalesce(p_cc,''), '\D', '', 'g');
begin
  d := regexp_replace(d, '^0+', '');
  if c <> '' and left(d, length(c)) = c and length(d) - length(c) >= 6 then
    if c <> '91' or length(d) = 12 then d := substr(d, length(c) + 1); end if;
  end if;
  return d;
end $$;

create or replace function public.mk_check_phone(p_cc text, p_phone text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := auth.uid(); v_phone text := public.mk_national(p_cc, p_phone); h bigint; owner_id uuid; is_admin boolean := public.kgr_is_owner();
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
        v_phone text; h bigint; v_id bigint; days int;
begin
  v_phone := public.mk_national(v_cc, d->>'phone');
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
