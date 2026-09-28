import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/hooks/use-auth'
import { AuthGuard, AdminGuard } from '@/components/AuthGuards'
import Index from './pages/Index'
import Login from './pages/Login'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import EmailSettings from './pages/EmailSettings'
import Contacts from './pages/Contacts'
import Logs from './pages/Logs'
import NotFound from './pages/NotFound'
import Layout from './components/Layout'

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/resetar-senha" element={<ResetPassword />} />
          <Route
            element={
              <AuthGuard>
                <Layout />
              </AuthGuard>
            }
          >
            <Route path="/" element={<Contacts />} />
            <Route path="/kanban" element={<Index />} />
            <Route path="/contatos" element={<Navigate to="/" replace />} />
            <Route
              path="/dashboard"
              element={
                <AdminGuard>
                  <Dashboard />
                </AdminGuard>
              }
            />
            <Route
              path="/logs"
              element={
                <AdminGuard>
                  <Logs />
                </AdminGuard>
              }
            />
            <Route
              path="/configuracoes/email"
              element={
                <AdminGuard>
                  <EmailSettings />
                </AdminGuard>
              }
            />
            <Route path="/administracao/usuarios" element={<Navigate to="/" replace />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </BrowserRouter>
  </AuthProvider>
)

export default App
