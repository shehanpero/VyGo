import { motion, AnimatePresence } from 'framer-motion'
import { playSelect } from '../components/seat3d/Sound'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, errorMessage } from '../api/client'
import { FaRobot, FaPaperPlane, FaTimes } from 'react-icons/fa'

const QUICK_PROMPTS = [
  'E01 Colombo to Matara',
  'Buses to Kataragama',
  'Airport bus to Katunayake',
  'Route 122 to Kataragama',
  'Route 47 vs expressway?',
  'My bookings',
]

const WELCOME = {
  id: 'welcome',
  role: 'assistant',
  text: "Hi! I'm the VyGo Assistant. Ask me about the E01 Southern Expressway to Galle, Matara or Kataragama, the E03 airport shuttle to Katunayake, or classic routes like 47 and 122 — I can find trips, check bookings, and answer fare and refund questions.",
  suggestions: QUICK_PROMPTS,
}

const PATH_LABELS = {
  '/bookings': 'My Bookings',
  '/login': 'Sign in',
  '/routes': 'Routes',
  '/notifications': 'Alerts',
  '/register': 'Register',
  '/': 'Home',
}

let counter = 0
const nextId = () => `m${++counter}`

const sessionId =
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `s${Date.now()}-${Math.random().toString(36).slice(2)}`

function renderInline(text) {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={i} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return part
  })
}

function renderMessageText(text) {
  if (typeof text !== 'string') return text
  try {
    return text.split('\n').map((line, i) => {
      const numbered = line.match(/^\s*(\d+)[.)]\s+(.*)$/)
      if (numbered) {
        return (
          <div key={i} className="flex gap-2">
            <span className="shrink-0 font-semibold tabular-nums text-nexus-400">
              {numbered[1]}.
            </span>
            <span>{renderInline(numbered[2])}</span>
          </div>
        )
      }
      const bullet = line.match(/^\s*([•\-·])\s+(.*)$/)
      if (bullet) {
        return (
          <div key={i} className="flex gap-2">
            <span className="shrink-0 select-none text-slate-400">•</span>
            <span>{renderInline(bullet[2])}</span>
          </div>
        )
      }
      if (line.trim() === '') {
        return <div key={i} className="h-2" />
      }
      return <p key={i}>{renderInline(line)}</p>
    })
  } catch {
    return text
  }
}

export default function AiAssistant() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([WELCOME])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const fabRef = useRef(null)
  const typingStartedRef = useRef(0)
  const typingTimerRef = useRef(null)
  const wasOpenRef = useRef(false)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, typing])

  useEffect(() => {
    const onOpen = () => setOpen(true)
    window.addEventListener('vygo:assistant-open', onOpen)
    return () => window.removeEventListener('vygo:assistant-open', onOpen)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    const t = setTimeout(() => inputRef.current?.focus(), 60)
    return () => {
      window.removeEventListener('keydown', onKey)
      clearTimeout(t)
    }
  }, [open])

  useEffect(() => {
    if (wasOpenRef.current && !open) {
      fabRef.current?.focus()
    }
    wasOpenRef.current = open
  }, [open])

  useEffect(() => () => clearTimeout(typingTimerRef.current), [])

  const send = useCallback(
    async (text) => {
      const msg = (text ?? input).trim()
      if (!msg || typing) return
      setInput('')
      try { playSelect() } catch {}
      setMessages((m) => [...m, { id: nextId(), role: 'user', text: msg }])
      setTyping(true)
      typingStartedRef.current = Date.now()
      try {
        const res = await api.post('/assistant/chat', { message: msg, sessionId })
        const data = res.data || {}
        const suggestions = Array.isArray(data.suggestions)
          ? data.suggestions.filter((s) => s.trim().toLowerCase() !== msg.toLowerCase())
          : []
        setMessages((m) => [
          ...m,
          {
            id: nextId(),
            role: 'assistant',
            text: data.reply || 'Let me look that up for you…',
            action: data.action,
            suggestions,
            citations: Array.isArray(data.citations) ? data.citations : undefined,
          },
        ])
      } catch (err) {
        setMessages((m) => [
          ...m,
          {
            id: nextId(),
            role: 'assistant',
            text: `Sorry, I hit a snag — ${errorMessage(err, 'please try again in a moment')}`,
            suggestions: QUICK_PROMPTS,
          },
        ])
      } finally {
        const remaining = Math.max(0, 350 - (Date.now() - typingStartedRef.current))
        typingTimerRef.current = setTimeout(() => setTyping(false), remaining)
      }
    },
    [input, typing]
  )

  const handleAction = (action) => {
    if (!action) return
    if (action.type === 'search') {
      const d = action.data || {}
      navigate('/', {
        state: { from: d.from, to: d.to, date: d.date, busType: d.busType || '', runSearch: true },
      })
    } else if (action.type === 'navigate') {
      navigate(action.data?.path || '/')
    }
    setOpen(false)
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            id="vygo-assistant-dialog"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8, transition: { duration: 0.12, ease: 'easeIn' } }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: 'bottom right' }}
            className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] right-4 z-50 glass-strong flex h-[530px] w-[370px] max-w-[calc(100vw-1.5rem)] max-h-[calc(var(--app-vh,100dvh)_-_6.5rem)] flex-col overflow-hidden rounded-2xl border border-cyan-400/25 shadow-2xl shadow-cyan-500/15 sm:right-6 backdrop-blur-2xl"
            role="dialog"
            aria-label="VyGo Assistant"
          >
          <div className="relative flex items-center gap-3 border-b border-slate-700/50 px-4 py-3">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-nexus-400/70 to-transparent" />
            <img
              src="/vygoicon.png"
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-white/15"
            />
            <div className="flex-1 leading-tight">
              <div className="text-sm font-bold text-white">VyGo Assistant</div>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                Online · answers instantly
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-400/70"
            >
              <FaTimes />
            </button>
          </div>

          <div
            ref={scrollRef}
            role="log"
            aria-live="polite"
            aria-label="Assistant conversation"
            className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
          >
            {messages.map((m) => (
              <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  aria-live={m.role === 'user' ? 'off' : undefined}
                  className={`fade-in whitespace-pre-line ${
                    m.role === 'user'
                      ? 'max-w-[85%] rounded-2xl rounded-br-md bg-nexus-500 px-3.5 py-2 text-sm text-slate-950'
                      : 'max-w-[85%] min-w-0 rounded-2xl rounded-bl-md border border-slate-800 bg-slate-800/70 px-3.5 py-2 text-sm text-slate-100'
                  }`}
                >
                  {renderMessageText(m.text)}
                  {m.role === 'assistant' && m.action && m.action.type !== 'none' && (
                    <button
                      type="button"
                      onClick={() => handleAction(m.action)}
                      className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-nexus-500 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-nexus-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-400/70 active:scale-[0.98]"
                    >
                      {m.action.type === 'search'
                        ? `Search ${m.action.data?.from} → ${m.action.data?.to}`
                        : `Open ${PATH_LABELS[m.action.data?.path] || m.action.data?.path || 'page'}`}
                    </button>
                  )}
                  {m.role === 'assistant' && m.citations?.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {m.citations.map((c, i) => (
                        <span
                          key={`${c.ref || c.label || c.source || i}`}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-700/60 bg-slate-800/80 px-1.5 py-1 font-mono text-[10px] leading-none text-slate-400"
                        >
                          <span className="font-semibold text-slate-400">SRC</span>
                          {c.label || c.source || c.ref || `Source ${i + 1}`}
                        </span>
                      ))}
                    </div>
                  )}
                  {m.role === 'assistant' && m.suggestions?.length > 0 && (
                    <div className="-mx-1 mt-2.5 flex max-w-full gap-2 overflow-x-auto px-1 pb-1">
                      {m.suggestions.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => send(s)}
                          disabled={typing}
                          aria-label={`Ask: ${s}`}
                          className="shrink-0 rounded-full border border-nexus-500/40 bg-nexus-500/10 px-3.5 py-2 text-xs font-medium text-nexus-300 transition hover:bg-nexus-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-400/70 disabled:cursor-not-allowed disabled:opacity-40 active:scale-95"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start" role="status">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-slate-800 bg-slate-800/70 px-4 py-3">
                  <span className="flex items-center gap-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400"
                        style={{ animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </span>
                  <span className="text-[11px] text-slate-400">VyGo is checking…</span>
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              send()
            }}
            className="flex items-center gap-2 border-t border-slate-800 bg-slate-900 px-3 py-3"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about trips, refunds…"
              aria-label="Message the assistant"
              className="input !py-2"
            />
            <button
              type="submit"
              disabled={!input.trim() || typing}
              aria-label="Send message"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-nexus-500 text-slate-950 transition hover:bg-nexus-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-400/70 disabled:opacity-40 active:scale-95"
            >
              <FaPaperPlane />
            </button>
          </form>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        ref={fabRef}
        id="vygo-assistant-fab"
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close VyGo Assistant' : 'Open VyGo Assistant'}
        aria-expanded={open}
        aria-controls="vygo-assistant-dialog"
        title="Ask VyGo Assistant"
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+1.5rem)] right-4 z-50 flex h-14 w-14 items-center justify-center gap-2 rounded-full bg-nexus-500 text-slate-950 shadow-lg shadow-nexus-500/30 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nexus-400/70 sm:right-6 sm:w-auto sm:px-5"
      >
        <span className="absolute -inset-1 rounded-full bg-cyan-400/20 animate-pulse pointer-events-none" />
        <FaRobot className="relative z-10 text-2xl" />
        <span className="relative z-10 hidden text-sm font-bold sm:inline">Ask VyGo</span>
      </button>
    </>
  )
}
