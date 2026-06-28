create table public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  role text not null check (role in ('teacher', 'student')),
  max_uses int not null default 1,
  used_count int not null default 0,
  expires_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.invite_codes enable row level security;

create policy "Admin full access - invite_codes" on public.invite_codes
  for all using (auth.jwt() ->> 'role' = 'admin');

create policy "Anyone can read codes for validation" on public.invite_codes
  for select using (true);

grant all on public.invite_codes to anon, authenticated, service_role;
