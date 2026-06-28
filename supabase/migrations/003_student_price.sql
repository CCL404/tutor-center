-- Add per-student price to session_students
alter table public.session_students
  add column if not exists price numeric(10,2);

-- Backfill existing records with session's price_per_student
update public.session_students ss
  set price = s.price_per_student
  from public.sessions s
  where ss.session_id = s.id and ss.price is null;

-- Grant on new column
grant all on public.session_students to anon, authenticated, service_role;
