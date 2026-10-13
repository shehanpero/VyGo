import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ roles, children }) {
  const { user, ready } = useAuth()
  const location = useLocation()

  if (!ready) return null

  if (!user) {
    return <Navigate to="/login" state={{ ...location.state, from: location.pathname }} replace />
  }

  if (roles && !roles.some((r) => user.roles?.includes(r))) {
    const role = user.roles?.[0]
    return <Navigate to={role === 'ADMIN' ? '/admin' : role === 'OPERATOR' ? '/operator' : role === 'CONDUCTOR' ? '/conductor' : '/'} replace />
  }

  return children
}
