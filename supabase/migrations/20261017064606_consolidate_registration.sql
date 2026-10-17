begin;
lock table public.registrations in access exclusive mode;
do $$ declare has_landing_rows boolean; begin
  if to_regclass('public.landing_registrations') is not null then
    execute 'lock table public.landing_registrations in access exclusive mode';
    execute 'select exists (select 1 from public.landing_registrations)' into has_landing_rows;
    if has_landing_rows then
      raise exception 'Landing registrations contain data; consolidate them before removing this table';
    end if;
  end if;
end $$;
alter table public.registrations rename to registration;
update public.registration set email = lower(btrim(email));
alter table public.registration
  add column people_count integer not null default 1 check (people_count between 1 and 100),
  add column ip_hash text,
  add constraint registration_email_normalized check (email = lower(btrim(email))),
  add constraint registration_email_unique unique (email);
create index registration_ip_created_idx on public.registration (ip_hash, created_at);
alter table public.registration enable row level security;
revoke all on public.registration from public, anon, authenticated;
grant all on public.registration to service_role;
drop table if exists public.landing_registrations;
drop table public.registration_attempts;
commit;
