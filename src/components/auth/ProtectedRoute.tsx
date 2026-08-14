import { Navigate } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"
import { ReactNode } from "react"
import { Button } from "../ui/Button"

export function ProtectedRoute({ children, requireAdmin = false }: { children: ReactNode, requireAdmin?: boolean }) {
  const { user, isAdmin, familyId, loading, logout } = useAuth()

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" />
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" />
  }

  if (!requireAdmin && !isAdmin && !familyId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center space-y-4">
        <h2 className="text-2xl font-bold text-red-500">Access Denied</h2>
        <p>Your email is not associated with any family account.</p>
        <p>Please contact an administrator.</p>
        <Button variant="outline" onClick={logout}>Sign Out</Button>
      </div>
    )
  }

  return <>{children}</>
}
