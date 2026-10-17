-- Public clients must submit through the register Edge Function.
create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  email text not null check (char_length(email) <= 254),
  phone text not null check (char_length(phone) between 7 and 25),
  receipt_path text not null,
  consent_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending','confirmed','rejected')),
  created_at timestamptz not null default now()
);
alter table public.registrations enable row level security;
revoke all on public.registrations from anon, authenticated;
create table public.registration_attempts (
  id bigint generated always as identity primary key,
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index on public.registration_attempts (ip_hash, created_at);
alter table public.registration_attempts enable row level security;
revoke all on public.registration_attempts from anon, authenticated;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-receipts','payment-receipts',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
-- No public storage policies. Service-role access only; review receipts in the dashboard.
