import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { MainLayout } from './components/layout/MainLayout'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { Login } from './components/auth/Login'
import { FamiliesAdmin } from './components/admin/Families'
import { RegistrationsAdmin } from './components/admin/Registrations'
import { JobBoard } from './components/jobs/JobBoard'
import { FamilyDashboard } from './components/dashboard/FamilyDashboard'
import { GuestProxy } from './components/guest/GuestProxy'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/guest" element={<GuestProxy />} />
        
        <Route path="/" element={<ProtectedRoute><MainLayout><FamilyDashboard /></MainLayout></ProtectedRoute>} />
        <Route path="/jobs" element={<ProtectedRoute><MainLayout><JobBoard /></MainLayout></ProtectedRoute>} />
        
        {/* Admin Routes */}
        <Route path="/admin/families" element={<ProtectedRoute requireAdmin><MainLayout isAdmin><FamiliesAdmin /></MainLayout></ProtectedRoute>} />
        <Route path="/admin/roster" element={<ProtectedRoute requireAdmin><MainLayout isAdmin><RegistrationsAdmin /></MainLayout></ProtectedRoute>} />
        <Route path="/admin/settings" element={<ProtectedRoute requireAdmin><MainLayout isAdmin><div>Admin Settings</div></MainLayout></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
