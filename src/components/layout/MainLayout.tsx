import { ReactNode } from "react"
import { Link } from "react-router-dom"
import { LogOut, Home, Briefcase, Users, Settings, ClipboardList } from "lucide-react"
import { useAuth } from "../../contexts/AuthContext"

export function MainLayout({ children, isAdmin = false }: { children: ReactNode, isAdmin?: boolean }) {
  const { logout } = useAuth()

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans flex flex-col md:flex-row">
      <aside className="fixed bottom-0 w-full md:w-64 md:h-screen md:sticky md:top-0 z-50 glass border-t md:border-r md:border-t-0 border-[var(--glass-border)]">
        <div className="flex flex-col h-full p-4">
          <div className="hidden md:block mb-8">
            <h1 className="text-xl font-bold text-primary-600">Velocity Workshare</h1>
            {isAdmin && <span className="text-xs bg-primary-100 text-primary-600 px-2 py-1 rounded-full font-medium mt-2 inline-block">Admin Panel</span>}
          </div>

          <nav className="flex md:flex-col justify-around md:justify-start gap-2 flex-1">
            <Link to="/" className="flex items-center gap-3 p-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              <Home className="w-5 h-5" />
              <span className="hidden md:inline font-medium">Dashboard</span>
            </Link>
            <Link to="/jobs" className="flex items-center gap-3 p-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              <Briefcase className="w-5 h-5" />
              <span className="hidden md:inline font-medium">Job Board</span>
            </Link>
            {isAdmin && (
              <>
                <Link to="/admin/families" className="flex items-center gap-3 p-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                  <Users className="w-5 h-5" />
                  <span className="hidden md:inline font-medium">Families</span>
                </Link>
                <Link to="/admin/roster" className="flex items-center gap-3 p-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                  <ClipboardList className="w-5 h-5" />
                  <span className="hidden md:inline font-medium">Roster</span>
                </Link>
                <Link to="/admin/settings" className="flex items-center gap-3 p-3 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                  <Settings className="w-5 h-5" />
                  <span className="hidden md:inline font-medium">Settings</span>
                </Link>
              </>
            )}
          </nav>

          <div className="hidden md:block mt-auto">
            <button onClick={logout} className="flex w-full items-center gap-3 p-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 transition-colors">
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
