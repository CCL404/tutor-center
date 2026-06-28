-- Add 'pending' status to attendance_status enum
-- Pending: session scheduled, attendance not yet marked (time hasn't come)
alter type attendance_status add value 'pending';

-- Allow students to view their own sessions (for My Schedule)
create policy "Students view own sessions" on public.sessions
  for select using (
    id in (select session_id from public.session_students where student_id in (select id from public.students where user_id = auth.uid()))
  );

-- Allow students to view teachers (for schedule/attendance joins)
create policy "Anyone can view teachers" on public.teachers
  for select using (true);

-- Allow students to view teacher profiles (for teacher name in joins)
create policy "Students view teacher profiles" on public.profiles
  for select using (
    id in (select user_id from public.teachers)
  );
