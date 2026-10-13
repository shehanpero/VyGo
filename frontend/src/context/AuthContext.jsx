import { createContext, useContext, useCallback, useMemo, useState, useEffect } from 'react'
import { api, saveAuth, clearAuth, getStoredToken, getStoredUser } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser)
  const [ready, setReady] = useState(Boolean(getStoredToken()))
  const [initializing, setInitializing] = useState(Boolean(getStoredToken()))

  useEffect(() => {
    if (!getStoredToken()) {
      setReady(true)
      setInitializing(false)
      return
    }
    api
      .get('/auth/me')
      .then((res) => {
        setUser(res.data)
        saveAuth(getStoredToken(), res.data)
      })
      .catch(() => clearAuth())
      .finally(() => {
        setReady(true)
        setInitializing(false)
      })
  }, [])

  useEffect(() => {
    const onUnauthorized = () => {
      setUser(null)
      setReady(true)
      setInitializing(false)
    }
    window.addEventListener('vygo:unauthorized', onUnauthorized)
    return () => window.removeEventListener('vygo:unauthorized', onUnauthorized)
  }, [])

  const login = useCallback(async (username, password) => {
    const res = await api.post('/auth/login', { username, password })
    const { accessToken, user: u } = res.data
    saveAuth(accessToken, u)
    setUser(u)
    return u
  }, [])

  const logout = useCallback(() => {
    clearAuth()
    setUser(null)
  }, [])

  const hasRole = useCallback(
    (role) => Boolean(user?.roles?.includes(role)),
    [user]
  )

  const value = useMemo(
    () => ({ user, ready, initializing, login, logout, hasRole, setUser }),
    [user, ready, initializing, login, logout, hasRole]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
