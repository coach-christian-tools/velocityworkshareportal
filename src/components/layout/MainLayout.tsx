import type { ReactNode } from "react"
import { Link, useLocation } from "react-router-dom"
import { LogOut, Home, Briefcase, Users, Settings, ClipboardList, Shield } from "lucide-react"
import { useAuth } from "../../contexts/AuthContext"
import { VSLogo } from "../ui/VSLogo"

export function MainLayout({ children, isAdmin = false }: { children: ReactNode, isAdmin?: boolean }) {
  const { user, logout, isAdmin: authIsAdmin } = useAuth()
  const effectiveIsAdmin = isAdmin || authIsAdmin
  const location = useLocation()

  const isActive = (path: string) => {
    if (path === "/" && location.pathname === "/") return true
    if (path !== "/" && location.pathname.startsWith(path)) return true
    return false
  }

  const navLinks = [
    { to: "/", label: "Dashboard", icon: Home },
    { to: "/jobs", label: "Job Board", icon: Briefcase },
    ...(effectiveIsAdmin
      ? [
          { to: "/admin/families", label: "Families", icon: Users },
          { to: "/admin/roster", label: "Roster", icon: ClipboardList },
          { to: "/admin/settings", label: "Settings", icon: Settings },
        ]
      : []),
  ]

  return (
    <div className="min-h-screen bg-slate-50 text-[#13415D] flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 flex items-center justify-between md:hidden">
        <Link to="/" className="flex items-center">
          <VSLogo size="sm" />
        </Link>
        <div className="flex items-center gap-2">
          {effectiveIsAdmin && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-[#0A856C]/10 text-[#0A856C] px-2 py-0.5 rounded-full">
              <Shield className="w-3 h-3" /> Admin
            </span>
          )}
          <button
            onClick={logout}
            aria-label="Sign Out"
            className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 bg-white border-r border-slate-200/90 z-30 shadow-xs">
        <div className="p-6 pb-4">
          <Link to="/" className="flex items-center">
            <VSLogo size="md" />
          </Link>
          {effectiveIsAdmin && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold bg-[#0A856C]/10 text-[#0A856C] px-2.5 py-1 rounded-full">
              <Shield className="w-3.5 h-3.5" /> Administrator
            </div>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navLinks.map((link) => {
            const Icon = link.icon
            const active = isActive(link.to)
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                  active
                    ? "bg-[#0A856C] text-white shadow-xs font-semibold"
                    : "text-[#13415D] hover:bg-slate-100/80 hover:text-[#0A856C]"
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? "text-white" : "text-[#13415D]/70"}`} />
                <span>{link.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 mt-auto">
          <div className="mb-2 px-2">
            <p className="text-xs text-slate-400 font-medium truncate">Logged in as</p>
            <p className="text-xs font-semibold text-[#13415D] truncate">{user?.email?.split('@')[0]}</p>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 min-w-0">
        <div className="max-w-6xl mx-auto w-full">
          {children}
        </div>
      </main>

      {/* Mobile Sticky Bottom Tab Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/90 py-1.5 px-2 flex justify-around items-center md:hidden shadow-lg safe-area-bottom">
        {navLinks.map((link) => {
          const Icon = link.icon
          const active = isActive(link.to)
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-xs font-medium transition-all ${
                active
                  ? "text-[#0A856C] font-bold"
                  : "text-slate-500 hover:text-[#13415D]"
              }`}
            >
              <div className={`p-1 rounded-full ${active ? "bg-[#0A856C]/10" : ""}`}>
                <Icon className={`w-5 h-5 ${active ? "text-[#0A856C]" : "text-slate-500"}`} />
              </div>
              <span className="text-[10px] mt-0.5">{link.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

