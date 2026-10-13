import { useEffect, useState, useRef, useCallback } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import AiAssistant from './AiAssistant'
import ConnectScreen from './ConnectScreen'
import { Logo, BrandIcon } from './Brand'
import { isNativePlatform } from '../api/client'
import { rolesLabel } from '../lib/roles'
import { useI18n } from '../i18n'
import SettingsControls from './SettingsControls'
import { useLenis } from 'lenis/react'
import {
  FaBars,
  FaCog,
  FaHome,
  FaSignOutAlt,
  FaTimes,
  FaUserCircle,
  FaChevronDown,
  FaChevronUp,
  FaTwitter,
  FaGithub,
  FaEnvelope,
} from 'react-icons/fa'

function AnimatedNavLink({ to, end, children, onClick }) {
  return (
    <NavLink to={to} end={end} onClick={onClick} className="relative rounded-lg text-sm font-medium">
      {({ isActive }) => (
        <span className="relative z-10 block px-3 py-2 transition-colors duration-200">
          <span className={isActive ? 'font-semibold text-accent-400' : 'text-slate-400 hover:text-white'}>
            {children}
          </span>
          {isActive && (
            <motion.span
              layoutId="nav-active-pill"
              className="absolute inset-0 -z-10 rounded-lg bg-accent-500/15 border border-accent-400/30 shadow-[0_0_12px_rgba(34,211,238,0.25)]"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
        </span>
      )}
    </NavLink>
  )
}

const mobileLinkClass = ({ isActive }) =>
  `relative block rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300 ${
    isActive
      ? 'bg-accent-500/15 text-accent-400 font-semibold'
      : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
  }`

export default function Layout({ children }) {
  const { user, logout, hasRole } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showConnect, setShowConnect] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [navOffset, setNavOffset] = useState({ x: 0, y: 0 })
  const isNative = isNativePlatform()
  const { t } = useI18n()
  const lenis = useLenis()

  const headerRef = useRef(null)

  useEffect(() => {
    setMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setScrolled(y > 20)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!headerRef.current) return
    const onMouseMove = (e) => {
      const rect = headerRef.current.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 20
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 10
      setNavOffset({ x, y })
    }
    const onMouseLeave = () => setNavOffset({ x: 0, y: 0 })
    headerRef.current.addEventListener('mousemove', onMouseMove)
    headerRef.current.addEventListener('mouseleave', onMouseLeave)
    return () => {
      headerRef.current?.removeEventListener('mousemove', onMouseMove)
      headerRef.current?.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [])

  const closeMenu = () => setMenuOpen(false)

  const handleLogout = () => {
    closeMenu()
    logout()
    navigate('/')
  }

  const roleHome = user?.roles?.includes('ADMIN')
    ? '/admin'
    : user?.roles?.includes('OPERATOR')
      ? '/operator'
      : user?.roles?.includes('CONDUCTOR')
        ? '/conductor'
        : user?.roles?.includes('DRIVER')
          ? '/driver'
          : '/'

  const guestLinks = (
    <>
      <AnimatedNavLink to="/" end>Search</AnimatedNavLink>
      <AnimatedNavLink to="/routes">Routes</AnimatedNavLink>
      <AnimatedNavLink to="/download">Get App</AnimatedNavLink>
    </>
  )
  const passengerLinks = (
    <>
      <AnimatedNavLink to="/" end>Search</AnimatedNavLink>
      <AnimatedNavLink to="/routes">Routes</AnimatedNavLink>
      <AnimatedNavLink to="/bookings">My Bookings</AnimatedNavLink>
      <AnimatedNavLink to="/notifications">Alerts</AnimatedNavLink>
      <AnimatedNavLink to="/download">Get App</AnimatedNavLink>
    </>
  )
  const operatorLinks = (
    <>
      <AnimatedNavLink to="/operator" end>Dashboard</AnimatedNavLink>
      <AnimatedNavLink to="/operator/buses">Fleet</AnimatedNavLink>
      <AnimatedNavLink to="/operator/schedules">Schedules</AnimatedNavLink>
      <AnimatedNavLink to="/operator/staff">Staff</AnimatedNavLink>
      <AnimatedNavLink to="/operator/expenses">Expenses</AnimatedNavLink>
      <AnimatedNavLink to="/operator/live">Live</AnimatedNavLink>
      <AnimatedNavLink to="/operator/reports">Reports</AnimatedNavLink>
      <AnimatedNavLink to="/scan">Scan QR</AnimatedNavLink>
    </>
  )
  const adminLinks = (
    <>
      <AnimatedNavLink to="/admin" end>Dashboard</AnimatedNavLink>
      <AnimatedNavLink to="/admin/operators">Bus Owners</AnimatedNavLink>
      <AnimatedNavLink to="/admin/verifications">Verifications</AnimatedNavLink>
      <AnimatedNavLink to="/admin/complaints">Complaints</AnimatedNavLink>
      <AnimatedNavLink to="/admin/bookings">Bookings</AnimatedNavLink>
      <AnimatedNavLink to="/scan">Scan QR</AnimatedNavLink>
    </>
  )
  const conductorLinks = (
    <>
      <AnimatedNavLink to="/conductor" end>Trips</AnimatedNavLink>
      <AnimatedNavLink to="/verify">Verify ID</AnimatedNavLink>
      <AnimatedNavLink to="/scan">Scan QR</AnimatedNavLink>
    </>
  )
  const driverLinks = (
    <>
      <AnimatedNavLink to="/driver" end>My Trips</AnimatedNavLink>
      <AnimatedNavLink to="/verify">Verify ID</AnimatedNavLink>
    </>
  )

  const mobileGuestLinks = (
    <>
      <NavLink to="/" className={mobileLinkClass} end onClick={closeMenu}>Search</NavLink>
      <NavLink to="/routes" className={mobileLinkClass} onClick={closeMenu}>Routes</NavLink>
      <NavLink to="/route-tools" className={mobileLinkClass} onClick={closeMenu}>Live Routes</NavLink>
      <NavLink to="/help" className={mobileLinkClass} onClick={closeMenu}>Help</NavLink>
      <NavLink to="/download" className={mobileLinkClass} onClick={closeMenu}>Get App</NavLink>
    </>
  )
  const mobilePassengerLinks = (
    <>
      <NavLink to="/" className={mobileLinkClass} end onClick={closeMenu}>Search</NavLink>
      <NavLink to="/routes" className={mobileLinkClass} onClick={closeMenu}>Routes</NavLink>
      <NavLink to="/bookings" className={mobileLinkClass} onClick={closeMenu}>My Bookings</NavLink>
      <NavLink to="/notifications" className={mobileLinkClass} onClick={closeMenu}>Alerts</NavLink>
      <NavLink to="/route-tools" className={mobileLinkClass} onClick={closeMenu}>Live Routes</NavLink>
      <NavLink to="/help" className={mobileLinkClass} onClick={closeMenu}>Help</NavLink>
      <NavLink to="/download" className={mobileLinkClass} onClick={closeMenu}>Get App</NavLink>
    </>
  )
  const mobileOperatorLinks = (
    <>
      <NavLink to="/operator" className={mobileLinkClass} end onClick={closeMenu}>Dashboard</NavLink>
      <NavLink to="/operator/buses" className={mobileLinkClass} onClick={closeMenu}>Fleet</NavLink>
      <NavLink to="/operator/schedules" className={mobileLinkClass} onClick={closeMenu}>Schedules</NavLink>
      <NavLink to="/operator/staff" className={mobileLinkClass} onClick={closeMenu}>Drivers &amp; Conductors</NavLink>
      <NavLink to="/operator/expenses" className={mobileLinkClass} onClick={closeMenu}>Expenses</NavLink>
      <NavLink to="/operator/live" className={mobileLinkClass} onClick={closeMenu}>Live Tracking</NavLink>
      <NavLink to="/operator/reports" className={mobileLinkClass} onClick={closeMenu}>Reports</NavLink>
      <NavLink to="/scan" className={mobileLinkClass} onClick={closeMenu}>Scan QR</NavLink>
    </>
  )
  const mobileAdminLinks = (
    <>
      <NavLink to="/admin" className={mobileLinkClass} end onClick={closeMenu}>Dashboard</NavLink>
      <NavLink to="/admin/operators" className={mobileLinkClass} onClick={closeMenu}>Bus Owners</NavLink>
      <NavLink to="/admin/verifications" className={mobileLinkClass} onClick={closeMenu}>Verifications</NavLink>
      <NavLink to="/admin/complaints" className={mobileLinkClass} onClick={closeMenu}>Complaints</NavLink>
      <NavLink to="/admin/bookings" className={mobileLinkClass} onClick={closeMenu}>Bookings</NavLink>
      <NavLink to="/scan" className={mobileLinkClass} onClick={closeMenu}>Scan QR</NavLink>
    </>
  )
  const mobileConductorLinks = (
    <>
      <NavLink to="/conductor" className={mobileLinkClass} end onClick={closeMenu}>Trips</NavLink>
      <NavLink to="/verify" className={mobileLinkClass} onClick={closeMenu}>Verify ID</NavLink>
      <NavLink to="/scan" className={mobileLinkClass} onClick={closeMenu}>Scan QR</NavLink>
    </>
  )
  const mobileDriverLinks = (
    <>
      <NavLink to="/driver" className={mobileLinkClass} end onClick={closeMenu}>My Trips</NavLink>
      <NavLink to="/verify" className={mobileLinkClass} onClick={closeMenu}>Verify ID</NavLink>
      <NavLink to="/account" className={mobileLinkClass} onClick={closeMenu}>Profile</NavLink>
    </>
  )

  const mobileGroup = (title, links) => (
    <div className="px-2">
      <p className="px-4 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</p>
      {links}
    </div>
  )

  return (
    <div className="screen-full flex flex-col">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <header
        ref={headerRef}
        className={`sticky top-0 z-40 transition-all duration-500 ${
          scrolled
            ? 'bg-slate-950/95 backdrop-blur-2xl border-b border-slate-800/50 shadow-chrome-lg'
            : 'bg-slate-950/60 backdrop-blur-xl border-b border-transparent'
        }`}
        style={{
          transform: `translate3d(${navOffset.x}px, ${navOffset.y}px, 0)`,
          willChange: 'transform, background-color, box-shadow',
        }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-400/40 to-transparent opacity-0 transition-opacity duration-500" style={{ opacity: scrolled ? 1 : 0 }} />
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-4 py-3.5">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <Link to={user ? roleHome : '/'} aria-label="VyGo home" className="group">
              <Logo size={36} link={false} />
            </Link>
          </motion.div>

          <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Primary navigation">
            <AnimatedNavLink to="/route-tools">Live Routes</AnimatedNavLink>
            <AnimatedNavLink to="/help">Help</AnimatedNavLink>

            {!user && (
              <>
                {guestLinks}
                <Link to="/login" className="btn-primary ml-2 !px-5 !py-2.5 text-sm" onClick={closeMenu}>
                  Sign In
                </Link>
              </>
            )}
            {user && hasRole('PASSENGER') && passengerLinks}
            {user && hasRole('OPERATOR') && operatorLinks}
            {user && hasRole('ADMIN') && adminLinks}
            {user && hasRole('CONDUCTOR') && conductorLinks}
            {user && hasRole('DRIVER') && driverLinks}

            {user && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="ml-4 flex items-center gap-3 border-l border-slate-800 pl-4"
              >
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/account')}
                  aria-label="My profile"
                  className="text-slate-400 hover:text-accent-400 transition-colors"
                  title="My profile"
                >
                  <FaUserCircle className="text-lg" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate(roleHome)}
                  aria-label="Go to my space"
                  className="text-slate-400 hover:text-accent-400 transition-colors"
                  title="My space"
                >
                  <FaHome className="text-lg" />
                </motion.button>
                <div className="hidden sm:block leading-tight text-left">
                  <div className="text-sm font-semibold text-white">{user.fullName}</div>
                  <div className="text-[11px] font-medium text-accent-400">{rolesLabel(user.roles)}</div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 180 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleLogout}
                  aria-label="Sign out"
                  className="text-slate-400 hover:text-danger-400 transition-colors"
                  title="Sign out"
                >
                  <FaSignOutAlt className="text-lg" />
                </motion.button>
              </motion.div>
            )}

            {isNative && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowConnect(true)}
                aria-label="Server settings"
                title="Server settings"
                className="ml-2 text-slate-400 hover:text-accent-400 transition-colors"
              >
                <FaCog className="text-lg" />
              </motion.button>
            )}

            <SettingsControls className="ml-2 hidden lg:flex" />
          </nav>

          <div className="flex items-center gap-1 lg:hidden">
            {isNative && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowConnect(true)}
                aria-label="Server settings"
                title="Server settings"
                className="grid h-10 w-10 place-items-center rounded-lg text-slate-300 hover:bg-slate-800/50 hover:text-accent-400"
              >
                <FaCog className="text-lg" />
              </motion.button>
            )}
            {user && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(roleHome)}
                aria-label="Go to my space"
                className="grid h-10 w-10 place-items-center rounded-lg text-slate-300 hover:bg-slate-800/50 hover:text-accent-400"
              >
                <FaHome className="text-lg" />
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              className="grid h-10 w-10 place-items-center rounded-lg text-slate-200 hover:bg-slate-800/50"
            >
              {menuOpen ? <FaTimes className="text-xl" /> : <FaBars className="text-xl" />}
            </motion.button>
          </div>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 18, scale: 0.995, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -12, scale: 0.995, filter: 'blur(4px)' }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            style={{ willChange: 'transform, opacity, filter' }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="relative border-t border-slate-800/50 bg-slate-950/80 backdrop-blur-2xl py-8 pb-safe">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-400/30 to-transparent" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-[1fr_auto_1fr]">
            <div>
              <Link to="/" aria-label="VyGo home" className="flex items-center gap-3">
                <BrandIcon size={28} className="shadow-lg shadow-accent-500/20" alt="" />
                <span className="font-display text-xl font-extrabold tracking-tight text-white">VyGo</span>
              </Link>
              <p className="mt-3 max-w-xs text-sm text-slate-400">
                Premium expressway bus booking across Sri Lanka. E01 Southern · E03 Airport corridors.
              </p>
            </div>

            <div className="hidden md:block border-l border-slate-800/50 pl-8">
              <nav aria-label="Footer navigation">
                <ul className="grid gap-3 sm:grid-cols-2">
                  <li><Link to="/routes" className="text-sm text-slate-400 hover:text-accent-400 transition-colors">All Routes</Link></li>
                  <li><Link to="/route-tools" className="text-sm text-slate-400 hover:text-accent-400 transition-colors">Live Routes</Link></li>
                  <li><Link to="/download" className="text-sm text-slate-400 hover:text-accent-400 transition-colors">Download App</Link></li>
                  <li><Link to="/help" className="text-sm text-slate-400 hover:text-accent-400 transition-colors">Help & Support</Link></li>
                  <li><Link to="/login" className="text-sm text-slate-400 hover:text-accent-400 transition-colors">Sign In</Link></li>
                </ul>
              </nav>
            </div>

            <div className="text-right">
              <p className="text-sm text-slate-400">© 2026 VyGo. All rights reserved.</p>
              <div className="mt-3 flex justify-end gap-3">
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:border-accent-400/40 hover:text-accent-400 transition-all hover:scale-110" aria-label="Twitter">
                  <FaTwitter className="text-sm" />
                </a>
                <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:border-accent-400/40 hover:text-accent-400 transition-all hover:scale-110" aria-label="GitHub">
                  <FaGithub className="text-sm" />
                </a>
                <a href="mailto:support@vygo.lk" className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:border-accent-400/40 hover:text-accent-400 transition-all hover:scale-110" aria-label="Email">
                  <FaEnvelope className="text-sm" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <div className={`fixed inset-0 z-50 lg:hidden ${menuOpen ? 'pointer-events-auto' : 'pointer-events-none'}`} aria-hidden={!menuOpen}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: menuOpen ? 1 : 0 }}
          transition={{ duration: 0.25 }}
          className={`absolute inset-0 bg-slate-950/80 ${menuOpen ? 'backdrop-blur-sm' : ''}`}
          onClick={closeMenu}
        />
        <motion.aside
          role="dialog"
          aria-label="Menu"
          initial={{ x: '100%' }}
          animate={{ x: menuOpen ? 0 : '100%' }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="absolute right-0 top-0 flex h-full w-80 max-w-[85vw] flex-col overflow-y-auto border-l border-slate-800/50 bg-slate-950/95 backdrop-blur-2xl"
        >
          <div className="flex items-center justify-between border-b border-slate-800/50 px-4 py-4 pt-safe">
            <Logo size={32} link={false} />
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={closeMenu}
              aria-label="Close menu"
              className="grid h-10 w-10 place-items-center rounded-lg text-slate-300 hover:bg-slate-800/50"
            >
              <FaTimes className="text-xl" />
            </motion.button>
          </div>

          <nav className="flex-1 pb-6" aria-label="Mobile navigation">
            {!user && mobileGroup('Browse', mobileGuestLinks)}
            {user && hasRole('PASSENGER') && mobileGroup('Passenger', mobilePassengerLinks)}
            {user && hasRole('OPERATOR') && mobileGroup('Bus Owner / Association', mobileOperatorLinks)}
            {user && hasRole('ADMIN') && mobileGroup('Admin', mobileAdminLinks)}
            {user && hasRole('CONDUCTOR') && mobileGroup('Conductor', mobileConductorLinks)}
            {user && hasRole('DRIVER') && mobileGroup('Driver', mobileDriverLinks)}

            {!user && (
              <div className="px-4 pt-4">
                <Link to="/login" className="btn-primary w-full" onClick={closeMenu}>
                  Sign In
                </Link>
              </div>
            )}
          </nav>

          <div className="border-t border-slate-800/50 p-4 pb-safe">
            <SettingsControls className="mb-4 justify-center" />
            {user ? (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-accent-500/15 text-accent-400">
                    <FaUserCircle className="text-2xl" />
                  </div>
                  <div className="leading-tight">
                    <div className="text-sm font-semibold text-white">{user.fullName}</div>
                    <div className="text-[11px] font-medium text-accent-400">{rolesLabel(user.roles)}</div>
                  </div>
                </div>
                <button type="button" className="btn-secondary w-full" onClick={() => { navigate(roleHome); closeMenu(); }}>
                  <FaHome className="mr-2" /> My Space
                </button>
                <button type="button" className="btn-secondary w-full" onClick={() => { navigate('/account'); closeMenu(); }}>
                  <FaUserCircle className="mr-2" /> Profile
                </button>
                <button type="button" className="btn-danger w-full" onClick={handleLogout}>
                  <FaSignOutAlt className="mr-2" /> Sign Out
                </button>
              </motion.div>
            ) : (
              <Link to="/help" className="btn-secondary w-full" onClick={closeMenu}>
                Help & Support
              </Link>
            )}
          </div>
        </motion.aside>
      </div>

      <AnimatePresence>
        {scrolled && (
          <motion.button
            initial={{ opacity: 0, scale: 0.7, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7, y: 12 }}
            whileHover={{ scale: 1.1, translateY: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => (lenis ? lenis.scrollTo(0) : window.scrollTo({ top: 0, behavior: 'smooth' }))}
            className="fixed bottom-6 right-20 z-30 grid h-10 w-10 place-items-center rounded-full bg-slate-900/90 border border-slate-700/80 text-accent-400 backdrop-blur-xl shadow-lg shadow-cyan-500/10 hover:border-accent-400 hover:text-white transition-colors"
            title="Scroll to top"
            aria-label="Scroll to top"
          >
            <FaChevronUp className="text-sm" />
          </motion.button>
        )}
      </AnimatePresence>

      <AiAssistant />
      {isNative && showConnect && <ConnectScreen standalone={false} onClose={() => setShowConnect(false)} />}
    </div>
  )
}