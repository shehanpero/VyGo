import { Link } from 'react-router-dom'
import { FaBus, FaHome } from 'react-icons/fa'

export default function NotFound() {
  return (
    <div className="mx-auto mt-16 max-w-md">
      <div className="glass-strong glow-border rounded-2xl p-10 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-nexus-500/25 to-nexus-300/20">
          <FaBus className="text-3xl text-nexus-400" />
        </div>
        <h1 className="font-display mt-4 text-6xl font-extrabold gradient-text">404</h1>
        <p className="mt-2 text-slate-400">This page is off route. Let&apos;s get you back on board.</p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/" className="btn-nexus w-full sm:w-auto">
            <FaHome /> Back home
          </Link>
          <Link to="/routes" className="btn-holo w-full sm:w-auto">
            Browse routes
          </Link>
        </div>
      </div>
    </div>
  )
}
