-- Tutor Center - Complete Schema Migration
-- Run this in Supabase SQL Editor

-- 0. EXTENSIONS
create extension if not exists "pgcrypto";

-- 1. CUSTOM TYPES
create type user_role as enum ('admin', 'teacher', 'student', 'parent');
create type attendance_status as enum ('present', 'absent', 'makeup');

-- 2. PROFILES TABLE (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  name text not null,
  phone text,
  role user_role not null default 'student',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. TEACHERS TABLE
create table public.teachers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subjects text[] not null default '{}',
  color text not null default '#6366f1',
  created_at timestamptz not null default now(),
  unique(user_id)
);

-- 4. STUDENTS TABLE
create table public.students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.profiles(id),
  notes text,
  created_at timestamptz not null default now(),
  unique(user_id)
);

-- 5. SESSIONS TABLE
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  subject text not null,
  date date not null,
  start_time time not null,
  end_time time not null,
  room text,
  price_per_student numeric(10,2) not null default 0,
  is_recurring boolean not null default false,
  recur_day smallint, -- 0=Sun, 1=Mon, ..., 6=Sat
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. SESSION_STUDENTS (many-to-many)
create table public.session_students (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(session_id, student_id)
);

-- 7. ATTENDANCE TABLE
create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  date date not null,
  status attendance_status not null default 'present',
  notes text,
  created_at timestamptz not null default now(),
  unique(session_id, student_id, date)
);

-- 8. PAYMENTS TABLE
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  session_id uuid references public.sessions(id),
  amount_due numeric(10,2) not null default 0,
  amount_paid numeric(10,2) not null default 0,
  due_date date,
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 9. NOTIFICATIONS TABLE
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('whatsapp', 'email')),
  message text not null,
  sent_at timestamptz
);

-- 10. INDEXES
create index idx_profiles_role on public.profiles(role);
create index idx_sessions_date on public.sessions(date);
create index idx_sessions_teacher on public.sessions(teacher_id);
create index idx_session_students_session on public.session_students(session_id);
create index idx_session_students_student on public.session_students(student_id);
create index idx_attendance_student on public.attendance(student_id);
create index idx_attendance_session on public.attendance(session_id);
create index idx_payments_student on public.payments(student_id);

-- 11. ROW LEVEL SECURITY
alter table public.profiles enable row level security;
alter table public.teachers enable row level security;
alter table public.students enable row level security;
alter table public.sessions enable row level security;
alter table public.session_students enable row level security;
alter table public.attendance enable row level security;
alter table public.payments enable row level security;
alter table public.notifications enable row level security;

-- Admin can see/do everything
create policy "Admin full access - profiles" on public.profiles
  for all using (auth.jwt() ->> 'role' = 'admin');
create policy "Admin full access - teachers" on public.teachers
  for all using (auth.jwt() ->> 'role' = 'admin');
create policy "Admin full access - students" on public.students
  for all using (auth.jwt() ->> 'role' = 'admin');
create policy "Admin full access - sessions" on public.sessions
  for all using (auth.jwt() ->> 'role' = 'admin');
create policy "Admin full access - session_students" on public.session_students
  for all using (auth.jwt() ->> 'role' = 'admin');
create policy "Admin full access - attendance" on public.attendance
  for all using (auth.jwt() ->> 'role' = 'admin');
create policy "Admin full access - payments" on public.payments
  for all using (auth.jwt() ->> 'role' = 'admin');
create policy "Admin full access - notifications" on public.notifications
  for all using (auth.jwt() ->> 'role' = 'admin');

-- Users can see their own profile
create policy "Users view own profile" on public.profiles
  for select using (auth.uid() = id);

-- Teachers: view their own teacher record + create/update own sessions
create policy "Teachers view own" on public.teachers
  for select using (auth.uid() = user_id);

create policy "Teachers manage own sessions" on public.sessions
  for all using (
    teacher_id in (select id from public.teachers where user_id = auth.uid())
  );

create policy "Teachers view assigned students" on public.session_students
  for select using (
    session_id in (select id from public.sessions where teacher_id in (select id from public.teachers where user_id = auth.uid()))
  );

create policy "Teachers manage own attendance" on public.attendance
  for all using (
    session_id in (select id from public.sessions where teacher_id in (select id from public.teachers where user_id = auth.uid()))
  );

-- Students view their own data
create policy "Students view own sessions" on public.session_students
  for select using (
    student_id in (select id from public.students where user_id = auth.uid())
  );

create policy "Students view own attendance" on public.attendance
  for select using (
    student_id in (select id from public.students where user_id = auth.uid())
  );

create policy "Students view own payments" on public.payments
  for select using (
    student_id in (select id from public.students where user_id = auth.uid())
  );

-- 12. AUTO-CREATE PROFILE ON SIGNUP
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)), 'student');
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
