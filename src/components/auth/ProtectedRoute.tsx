import { Navigate } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import type { ReactNode } from "react"
import { Button } from "../ui/Button"
import { Card } from "../ui/Card"
import { VSLogo } from "../ui/VSLogo"
import { AlertCircle } from "lucide-react"

export function ProtectedRoute({ children, requireAdmin = false }: { children: ReactNode, requireAdmin?: boolean }) {
  const { user, isAdmin, familyId, loading, logout } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-slate-500 font-medium animate-pulse">Loading portal...</div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" />
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" />
  }

  if (!requireAdmin && !isAdmin && !familyId) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white border border-slate-200 p-8 text-center shadow-sm">
          <div className="mb-4">
            <VSLogo size="md" className="justify-center" />
          </div>
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-[#13415D] mb-2">Account Not Associated</h2>
          <p className="text-sm text-slate-600 mb-2">
            Your email <span className="font-semibold text-[#13415D]">{user.email}</span> is not currently registered to a swimmer family.
          </p>
          <p className="text-xs text-slate-400 mb-6">
            Please contact your team administrator or head coach to have your email added to your family roster.
          </p>
          <Button variant="outline" onClick={logout} className="w-full">
            Sign Out
          </Button>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}

