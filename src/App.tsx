import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { SettingsProvider } from './contexts/SettingsContext'
import { ToastProvider } from './components/ui/Toast'
import { LoadingScreen } from './components/ui/Spinner'

// Lazy-loaded Pages for code splitting
const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const CompleteInvitePage = lazy(() => import('./pages/auth/CompleteInvitePage'))
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const MediaPage = lazy(() => import('./pages/media/MediaPage'))
const UsersPage = lazy(() => import('./pages/admin/UsersPage'))
const MunicipiosPage = lazy(() => import('./pages/admin/MunicipiosPage'))
const ProvincialPage = lazy(() => import('./pages/admin/ProvincialPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const ActivitiesPage = lazy(() => import('./pages/activities/ActivitiesPage'))
const ActivityFormPage = lazy(() => import('./pages/activities/ActivityFormPage'))
const DocumentsPage = lazy(() => import('./pages/documents/DocumentsPage'))
const DocumentFormPage = lazy(() => import('./pages/documents/DocumentFormPage'))
const ConsolidatedDashboardPage = lazy(() => import('./pages/dashboard/ConsolidatedDashboardPage'))

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingScreen />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

// Admin Route Component (requires specific roles)
function AdminRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return <LoadingScreen />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (roles && profile && !roles.includes(profile.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

// Public Route (redirect if already logged in)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingScreen />
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        } />
        <Route path="/invite/:token" element={
          <CompleteInvitePage />
        } />
        <Route path="/forgot-password" element={
          <PublicRoute>
            <ForgotPasswordPage />
          </PublicRoute>
        } />
        <Route path="/reset-password" element={
          <ResetPasswordPage />
        } />

        {/* Protected Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } />
        <Route path="/media" element={
          <ProtectedRoute>
            <MediaPage />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        } />

        {/* Admin Routes */}
        <Route path="/users" element={
          <AdminRoute roles={['superadmin', 'admin_municipal']}>
            <UsersPage />
          </AdminRoute>
        } />
        <Route path="/municipios" element={
          <AdminRoute roles={['superadmin']}>
            <MunicipiosPage />
          </AdminRoute>
        } />
        <Route path="/provincial" element={
          <AdminRoute roles={['superadmin']}>
            <ProvincialPage />
          </AdminRoute>
        } />

        {/* Activities Module */}
        <Route path="/activities" element={
          <ProtectedRoute>
            <ActivitiesPage />
          </ProtectedRoute>
        } />
        <Route path="/activities/new" element={
          <AdminRoute roles={['superadmin', 'admin_municipal', 'tecnico', 'direccao_provincial', 'departamento_informacao']}>
            <ActivityFormPage />
          </AdminRoute>
        } />
        <Route path="/activities/:id/edit" element={
          <AdminRoute roles={['superadmin', 'admin_municipal', 'tecnico', 'direccao_provincial', 'departamento_informacao']}>
            <ActivityFormPage />
          </AdminRoute>
        } />

        {/* Documents Module */}
        <Route path="/documents" element={
          <AdminRoute roles={['superadmin', 'admin_municipal', 'tecnico', 'direccao_provincial', 'departamento_comunicacao']}>
            <DocumentsPage />
          </AdminRoute>
        } />
        <Route path="/documents/new" element={
          <AdminRoute roles={['superadmin', 'admin_municipal', 'tecnico', 'direccao_provincial', 'departamento_comunicacao']}>
            <DocumentFormPage />
          </AdminRoute>
        } />
        <Route path="/documents/:id/edit" element={
          <AdminRoute roles={['superadmin', 'admin_municipal', 'tecnico', 'direccao_provincial', 'departamento_comunicacao']}>
            <DocumentFormPage />
          </AdminRoute>
        } />

        {/* Consolidated Dashboard */}
        <Route path="/consolidated" element={
          <ProtectedRoute>
            <ConsolidatedDashboardPage />
          </ProtectedRoute>
        } />

        {/* Redirects */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <SettingsProvider>
            <ToastProvider>
              <AppRoutes />
            </ToastProvider>
          </SettingsProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
