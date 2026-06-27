// Database types matching the schema

export type UserRole = 'admin' | 'teacher' | 'student' | 'parent'
export type AttendanceStatus = 'present' | 'absent' | 'makeup'

export interface Profile {
  id: string
  email: string
  name: string
  phone: string | null
  role: UserRole
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Teacher {
  id: string
  user_id: string
  subjects: string[]
  color: string
  created_at: string
}

export interface Student {
  id: string
  user_id: string
  parent_id: string | null
  notes: string | null
  created_at: string
}

export interface Session {
  id: string
  teacher_id: string
  subject: string
  date: string
  start_time: string
  end_time: string
  room: string | null
  price_per_student: number
  is_recurring: boolean
  recur_day: number | null
  created_at: string
  updated_at: string
}

export interface SessionStudent {
  id: string
  session_id: string
  student_id: string
  created_at: string
}

export interface Attendance {
  id: string
  session_id: string
  student_id: string
  date: string
  status: AttendanceStatus
  notes: string | null
  created_at: string
}

export interface Payment {
  id: string
  student_id: string
  session_id: string | null
  amount_due: number
  amount_paid: number
  due_date: string | null
  paid_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: 'whatsapp' | 'email'
  message: string
  sent_at: string | null
}

// Joined types for frontend
export interface SessionWithTeacher extends Session {
  teacher?: Teacher & { profile?: Profile }
  students?: (SessionStudent & { student?: Student & { profile?: Profile } })[]
}

export interface StudentWithProfile extends Student {
  profile?: Profile
}

export interface TeacherWithProfile extends Teacher {
  profile?: Profile
}
