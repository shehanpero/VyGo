import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ReactLenis } from 'lenis/react'
import '@fontsource-variable/space-grotesk'
import '@fontsource/orbitron/400.css'
import '@fontsource/orbitron/700.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import '@fontsource/jetbrains-mono/600.css'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { I18nProvider } from './i18n'
import Layout from './components/Layout'
import ConnectScreen from './components/ConnectScreen'
import ProtectedRoute from './components/ProtectedRoute'
import ErrorBoundary from './components/ErrorBoundary'
import NexusBackdrop from './components/nexus/NexusBackdrop'
import InteractiveCursor from './components/nexus/InteractiveCursor'
import RedirectWrapper from './components/nexus/RedirectWrapper'
import { API_BASE_KEY, isNativePlatform } from './api/client'

import Home from './pages/Home'

// Android WebView (Compose-embedded) resolves CSS viewport units (vh/dvh/svh)
// against a zero-height initial containing block, so `100vh` computes to 0.
// Expose a reliable full viewport height as `--app-vh` instead. Percentages on
// fixed elements break the same way, so anything viewport-sized must use this.
if (isNativePlatform()) {
  const applyAppVh = () =>
    document.documentElement.style.setProperty('--app-vh', `${window.innerHeight}px`)
  applyAppVh()
  window.addEventListener('resize', applyAppVh)
  window.addEventListener('orientationchange', applyAppVh)
  window.visualViewport?.addEventListener('resize', applyAppVh)
}

const RoutesPage = lazy(() => import('./pages/Routes'))
const RouteToolsPage = lazy(() => import('./pages/RouteToolsPage'))
const HelpPage = lazy(() => import('./pages/HelpPage'))
const DownloadApp = lazy(() => import('./pages/DownloadApp'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const SeatSelect3D = lazy(() => import('./pages/SeatSelect3D'))
const Payment = lazy(() => import('./pages/Payment'))
const MyBookings = lazy(() => import('./pages/MyBookings'))
const BookingDetail = lazy(() => import('./pages/BookingDetail'))
const Notifications = lazy(() => import('./pages/Notifications'))
const OperatorDashboard = lazy(() => import('./pages/OperatorDashboard'))
const OperatorBuses = lazy(() => import('./pages/OperatorBuses'))
const OperatorSchedules = lazy(() => import('./pages/OperatorSchedules'))
const OperatorReports = lazy(() => import('./pages/OperatorReports'))
const OperatorLive = lazy(() => import('./pages/OperatorLive'))
const OperatorExpenses = lazy(() => import('./pages/OperatorExpenses'))
const OperatorStaff = lazy(() => import('./pages/OperatorStaff'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const AdminOperators = lazy(() => import('./pages/AdminOperators'))
const AdminVerifications = lazy(() => import('./pages/AdminVerifications'))
const AdminBuses = lazy(() => import('./pages/AdminBuses'))
const IdentityVerification = lazy(() => import('./pages/IdentityVerification'))
const AdminComplaints = lazy(() => import('./pages/AdminComplaints'))
const AdminBookings = lazy(() => import('./pages/AdminBookings'))
const TicketScan = lazy(() => import('./pages/TicketScan'))
const ConductorApp = lazy(() => import('./pages/ConductorApp'))
const DriverApp = lazy(() => import('./pages/DriverApp'))
const Profile = lazy(() => import('./pages/Profile'))
const NotFound = lazy(() => import('./pages/NotFound'))

const OPERATOR = ['OPERATOR']
const ADMIN = ['ADMIN']
const PASSENGER = ['PASSENGER']
const CONDUCTOR = ['CONDUCTOR']
const DRIVER = ['DRIVER']

function PageFallback() {
  return (
    <div className="card grid min-h-64 place-items-center p-16 text-sm text-slate-400">
      <div className="flex items-center gap-3">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-700 border-t-accent-400" />
        <span>Loading…</span>
      </div>
    </div>
  )
}

function App() {
  if (isNativePlatform() && !localStorage.getItem(API_BASE_KEY)) {
    return <ConnectScreen />
  }
  const content = (
    <>
      <BrowserRouter>
        <NexusBackdrop />
        <InteractiveCursor />
        <AuthProvider>
          <ThemeProvider>
            <I18nProvider>
              <Layout>
                <ErrorBoundary>
                  <Suspense fallback={<PageFallback />}>
                    <RedirectWrapper>
                      <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/routes" element={<RoutesPage />} />
                        <Route path="/route-tools" element={<RouteToolsPage />} />
                        <Route path="/help" element={<HelpPage />} />
                        <Route path="/download" element={<DownloadApp />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />

                        <Route
                          path="/seat-select"
                          element={
                            <ProtectedRoute roles={PASSENGER}>
                              <SeatSelect3D />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/pay"
                          element={
                            <ProtectedRoute roles={PASSENGER}>
                              <Payment />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/bookings"
                          element={
                            <ProtectedRoute roles={PASSENGER}>
                              <MyBookings />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/bookings/:ref"
                          element={
                            <ProtectedRoute roles={PASSENGER}>
                              <BookingDetail />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/notifications"
                          element={
                            <ProtectedRoute>
                              <Notifications />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/account"
                          element={
                            <ProtectedRoute>
                              <Profile />
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="/operator"
                          element={
                            <ProtectedRoute roles={OPERATOR}>
                              <OperatorDashboard />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/operator/buses"
                          element={
                            <ProtectedRoute roles={OPERATOR}>
                              <OperatorBuses />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/operator/schedules"
                          element={
                            <ProtectedRoute roles={OPERATOR}>
                              <OperatorSchedules />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/operator/reports"
                          element={
                            <ProtectedRoute roles={OPERATOR}>
                              <OperatorReports />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/operator/live"
                          element={
                            <ProtectedRoute roles={OPERATOR}>
                              <OperatorLive />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/operator/expenses"
                          element={
                            <ProtectedRoute roles={OPERATOR}>
                              <OperatorExpenses />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/operator/staff"
                          element={
                            <ProtectedRoute roles={OPERATOR}>
                              <OperatorStaff />
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="/admin"
                          element={
                            <ProtectedRoute roles={ADMIN}>
                              <AdminDashboard />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/operators"
                          element={
                            <ProtectedRoute roles={ADMIN}>
                              <AdminOperators />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/complaints"
                          element={
                            <ProtectedRoute roles={ADMIN}>
                              <AdminComplaints />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/bookings"
                          element={
                            <ProtectedRoute roles={ADMIN}>
                              <AdminBookings />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/verifications"
                          element={
                            <ProtectedRoute roles={ADMIN}>
                              <AdminVerifications />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="/admin/buses"
                          element={
                            <ProtectedRoute roles={ADMIN}>
                              <AdminBuses />
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="/scan"
                          element={
                            <ProtectedRoute roles={[...ADMIN, ...OPERATOR, ...CONDUCTOR]}>
                              <TicketScan />
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="/conductor"
                          element={
                            <ProtectedRoute roles={CONDUCTOR}>
                              <ConductorApp />
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="/driver"
                          element={
                            <ProtectedRoute roles={DRIVER}>
                              <DriverApp />
                            </ProtectedRoute>
                          }
                        />

                        <Route
                          path="/verify"
                          element={
                            <ProtectedRoute roles={[...DRIVER, ...CONDUCTOR, ...OPERATOR]}>
                              <IdentityVerification />
                            </ProtectedRoute>
                          }
                        />

                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </RedirectWrapper>
                  </Suspense>
                </ErrorBoundary>
              </Layout>
            </I18nProvider>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </>
  )

  // Lenis smooth-scroll is transform-based. A transformed full-page layer makes
  // Android WebView rasterise the whole page into one soft (blurred) layer, so
  // native gets the platform's own crisp, 120Hz-capable scrolling instead.
  if (isNativePlatform()) return content

  return (
    <ReactLenis
      root
      options={{
        duration: 1.4,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 2,
      }}
    >
      {content}
    </ReactLenis>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
