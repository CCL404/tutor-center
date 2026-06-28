'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  CalendarRange,
  Users,
  BookOpen,
  DollarSign,
  Bell,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  GraduationCap,
  ClipboardCheck,
  UserCog,
  KeyRound,
} from 'lucide-react'
import { useState } from 'react'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

const adminNav: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Schedule', href: '/admin/schedule', icon: <CalendarRange className="h-4 w-4" /> },
  { label: 'Teachers', href: '/admin/teachers', icon: <Users className="h-4 w-4" /> },
  { label: 'Students', href: '/admin/students', icon: <GraduationCap className="h-4 w-4" /> },
  { label: 'Finance', href: '/admin/finance', icon: <DollarSign className="h-4 w-4" /> },
  { label: 'Notifications', href: '/admin/notifications', icon: <Bell className="h-4 w-4" /> },
  { label: 'Attendance', href: '/admin/attendance', icon: <ClipboardCheck className="h-4 w-4" /> },
  { label: 'Invite Codes', href: '/admin/invite-codes', icon: <KeyRound className="h-4 w-4" /> },
]

const teacherNav: NavItem[] = [
  { label: 'Dashboard', href: '/teacher', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Schedule', href: '/teacher/schedule', icon: <CalendarRange className="h-4 w-4" /> },
  { label: 'Students', href: '/teacher/students', icon: <GraduationCap className="h-4 w-4" /> },
  { label: 'Attendance', href: '/teacher/attendance', icon: <ClipboardCheck className="h-4 w-4" /> },
  { label: 'Notifications', href: '/teacher/notifications', icon: <Bell className="h-4 w-4" /> },
]

const studentNav: NavItem[] = [
  { label: 'My Schedule', href: '/student', icon: <BookOpen className="h-4 w-4" /> },
  { label: 'Attendance', href: '/student/attendance', icon: <ClipboardCheck className="h-4 w-4" /> },
  { label: 'Finance', href: '/student/finance', icon: <DollarSign className="h-4 w-4" /> },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const role = profile?.role
  const navItems = role === 'admin' ? adminNav : role === 'teacher' ? teacherNav : studentNav
  const initials = profile?.name?.slice(0, 2) ?? '??'
  const roleLabel = role === 'admin' ? 'Admin' : role === 'teacher' ? 'Teacher' : 'Student'

  return (
    <div className="flex h-screen overflow-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-sidebar border-r border-sidebar-border transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } flex flex-col`}
      >
        <div className="p-5 border-b border-sidebar-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-sm tracking-tight">📚 狀元軒</h2>
              <p className="text-xs text-sidebar-foreground/60 mt-0.5">{profile?.name}</p>
            </div>
            <button className="lg:hidden text-sidebar-foreground hover:text-sidebar-foreground/80" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = pathname === item.href ||
              (item.href !== `/${role}` && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                    : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                }`}
              >
                <span className={active ? '' : 'text-sidebar-foreground/50'}>{item.icon}</span>
                {item.label}
                {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary-foreground/50" />}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-2.5 rounded-lg px-3 py-2 h-auto">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-xs font-medium bg-sidebar-accent text-sidebar-accent-foreground">{initials}</AvatarFallback>
                </Avatar>
                <div className="text-left text-xs leading-tight">
                  <p className="font-medium text-sidebar-foreground">{profile?.name}</p>
                  <p className="text-sidebar-foreground/50">{roleLabel}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl">
              <DropdownMenuItem asChild>
                <Link href="/profile"><UserCog className="h-4 w-4 mr-2" />Profile Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={signOut} className="text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center gap-3 p-3 border-b bg-background">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-semibold text-sm">📚 狀元軒</span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
