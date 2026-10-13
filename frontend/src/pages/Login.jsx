import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { errorMessage } from '../api/client'
import { BrandIcon } from '../components/Brand'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('nimal@vygo.lk')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const user = await login(username, password)
      const target = location.state?.from
      const home = user.roles.includes('ADMIN') ? '/admin' : user.roles.includes('OPERATOR') ? '/operator' : user.roles.includes('CONDUCTOR') ? '/conductor' : user.roles.includes('DRIVER') ? '/driver' : '/'
      navigate(target || home, { replace: true, state: location.state })
    } catch (err) {
      setError(errorMessage(err, 'Invalid credentials'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto mt-10 max-w-md">
      <div className="glass-strong glow-border rounded-2xl p-8">
        <div className="mb-6 text-center">
          <BrandIcon size={56} className="mx-auto" />
          <h1 className="font-display mt-3 text-2xl font-bold text-white">
            Welcome <span className="gradient-text">back</span>
          </h1>
          <p className="text-sm text-slate-400">Sign in to VyGo to book and manage trips</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label" htmlFor="login-email">Email or mobile</label>
            <input id="login-email" className={`input ${error ? 'input-error' : ''}`} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="nimal@vygo.lk" autoComplete="username" aria-invalid={error ? true : undefined} required />
          </div>
          <div>
            <label className="label" htmlFor="login-password">Password</label>
            <input id="login-password" type="password" className={`input ${error ? 'input-error' : ''}`} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" aria-invalid={error ? true : undefined} required />
          </div>
          {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
          <button type="submit" className="btn-nexus w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 border-t border-slate-800 pt-5 text-center text-sm text-slate-400">
          New here?{' '}
          <Link to="/register" className="font-semibold text-nexus-300 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  )
}
