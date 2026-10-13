import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, errorMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'
import Reveal from '../components/nexus/Reveal'
import {
  FaTicketAlt,
  FaMoneyBillWave,
  FaChair,
  FaBoxOpen,
  FaUniversalAccess,
  FaPhoneAlt,
  FaChevronDown,
  FaBuilding,
  FaEnvelope,
  FaHeadset,
  FaClock,
  FaKeyboard,
  FaTachometerAlt,
  FaVolumeUp,
  FaBullseye,
  FaRobot,
  FaInbox,
  FaExclamationTriangle,
} from 'react-icons/fa'

const TOPICS = [
  {
    id: 'booking-payment',
    icon: FaTicketAlt,
    title: 'Booking & Payment',
    blurb: 'Book a seat, pay safely and get your e-ticket.',
    faqs: [
      {
        q: 'How do I book a trip?',
        a: 'Search your route and date, pick a trip, choose a seat, then pay to lock it in. Your QR e-ticket appears instantly in My Bookings.',
      },
      {
        q: 'Which payment methods are accepted?',
        a: 'Card payments are processed securely at the payment step. VyGo never stores your full card details.',
      },
      {
        q: 'Do I need an account to book?',
        a: 'Yes — sign in before booking so you can manage cancellations, refunds and see your tickets in one place.',
      },
    ],
  },
  {
    id: 'cancellations-refunds',
    icon: FaMoneyBillWave,
    title: 'Cancellations & Refunds',
    blurb: 'Change of plans? Here is what happens next.',
    faqs: [
      {
        q: 'Can I cancel a booking?',
        a: 'Yes. Open the booking from My Bookings and choose cancel. Some fares may be non-refundable close to departure, so check the fare rules first.',
      },
      {
        q: 'How long do refunds take?',
        a: 'Approved refunds go back to the original payment method, usually within 3–5 business days depending on your bank.',
      },
      {
        q: 'What if my trip is cancelled by the bus owner?',
        a: 'You will be notified and offered a full refund or a free rebooking on the next available departure.',
      },
    ],
  },
  {
    id: 'seat-selection',
    icon: FaChair,
    title: 'Seat selection',
    blurb: 'Pick exactly where you sit, before you pay.',
    faqs: [
      {
        q: 'Can I choose my seat?',
        a: 'Yes — the interactive seat map shows every available seat, so you can pick a window or aisle seat before paying.',
      },
      {
        q: 'Is the seat map accessible?',
        a: 'It is fully keyboard-navigable and screen-reader friendly, so every passenger can choose their seat with confidence.',
      },
    ],
  },
  {
    id: 'lost-found',
    icon: FaBoxOpen,
    title: 'Lost & Found',
    blurb: 'Left something on the bus? We can help.',
    faqs: [
      {
        q: 'I left an item on my bus — what now?',
        a: 'Contact the operating company directly using the directory below, and include your trip date, route and seat number to help them locate it.',
      },
      {
        q: 'Can VyGo retrieve my item for me?',
        a: 'We can route your request to the bus owner. Email our support team with your booking reference and we will escalate it.',
      },
    ],
  },
  {
    id: 'accessibility',
    icon: FaUniversalAccess,
    title: 'Accessibility & special assistance',
    blurb: 'Travel support for passengers with additional needs.',
    faqs: [
      {
        q: 'Can I request assistance at my stop?',
        a: 'Yes. Contact the bus owner at least 24 hours before departure so they can arrange help with boarding and luggage.',
      },
      {
        q: 'Are accessible seats available?',
        a: 'Accessible and front-row seats are marked on the seat map so you can book the space you need.',
      },
    ],
  },
  {
    id: 'operator-contacts',
    icon: FaPhoneAlt,
      title: 'Bus owner contact numbers',
    blurb: 'Talk to the company running your trip.',
    faqs: [
      {
        q: 'Why should I contact the bus owner directly?',
        a: 'Bus owners handle the day-to-day running of services — delays, luggage and on-the-day questions are best answered by them.',
      },
      {
        q: 'Where can I find their numbers?',
        a: 'Every approved bus owner is listed in the directory below, with a tap-to-call number and registration details.',
      },
    ],
  },
]

const PLEDGES = [
  {
    icon: FaKeyboard,
    title: 'Keyboard-navigable seat map',
    blurb: 'Choose any seat without a mouse.',
  },
  {
    icon: FaTachometerAlt,
    title: 'Reduced-motion support',
    blurb: 'Animations respect your system preference.',
  },
  {
    icon: FaVolumeUp,
    title: 'Screen-reader friendly',
    blurb: 'Labelled controls and live status updates.',
  },
  {
    icon: FaBullseye,
    title: 'Visible focus indicators',
    blurb: 'Every interactive element shows a clear focus ring.',
  },
]

const telHref = (phone) => `tel:${String(phone).replace(/[^+\d]/g, '')}`

function TopicCard({ topic }) {
  const Icon = topic.icon
  return (
    <details className="glass-strong glow-border group overflow-hidden rounded-2xl">
      <summary className="flex cursor-pointer list-none items-start gap-4 p-5 [&::-webkit-details-marker]:hidden">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-nexus-500/25 to-nexus-300/20 text-nexus-400">
          <Icon aria-hidden="true" className="text-xl" />
        </span>
        <span className="min-w-0 flex-1">
          <h3 className="text-base font-bold text-white">{topic.title}</h3>
          <p className="mt-0.5 text-sm text-slate-400">{topic.blurb}</p>
        </span>
        <FaChevronDown
          aria-hidden="true"
          className="mt-1 shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-180"
        />
      </summary>
      <div className="border-t border-slate-800 px-5 py-4">
        <ul className="space-y-4">
          {topic.faqs.map((faq) => (
            <li key={faq.q}>
              <p className="text-sm font-semibold text-slate-200">{faq.q}</p>
              <p className="mt-0.5 text-sm text-slate-400">{faq.a}</p>
            </li>
          ))}
        </ul>
      </div>
    </details>
  )
}

export default function HelpPage() {
  const { user } = useAuth()
  const [operators, setOperators] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const isAdmin = Array.isArray(user?.roles) && user.roles.includes('ADMIN')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await api.get('/operators/public')
        if (!cancelled) setOperators(Array.isArray(res.data) ? res.data : [])
      } catch (err) {
        if (!cancelled) setError(errorMessage(err, 'Failed to load bus owner contacts'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const openAssistant = () => window.dispatchEvent(new Event('vygo:assistant-open'))

  const sorted = [...operators].sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold gradient-text">Help &amp; Support</h1>
          <p className="mt-1 text-sm text-slate-400">
            Friendly help with booking, refunds, lost items, accessibility and contacting bus owners — find quick answers or reach a real person.
          </p>
          <div className="scan-divider mt-4 w-40" />
        </div>
        <button type="button" onClick={openAssistant} className="btn-holo">
          <FaRobot aria-hidden="true" /> Ask VyGo Assistant
        </button>
      </div>

      <section aria-labelledby="topics-heading" className="mb-10">
        <div className="mb-4">
          <span className="eyebrow">Quick answers</span>
          <h2 id="topics-heading" className="section-title">How can we help?</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {TOPICS.map((topic, i) => (
            <Reveal key={topic.id} delay={(i % 3) * 0.06} className="h-full">
              <TopicCard topic={topic} />
            </Reveal>
          ))}
        </div>
      </section>

      <section aria-labelledby="operators-heading" className="mb-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="eyebrow">Direct lines</span>
            <h2 id="operators-heading" className="section-title">Bus owner contact directory</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Each approved bus owner keeps its own contact line. Reach the right company directly for delays, luggage and on-the-day questions.
            </p>
          </div>
          {!loading && !error && (
            <span className="badge bg-slate-500/15 text-slate-400">
              {operators.length} bus owner{operators.length === 1 ? '' : 's'}
            </span>
          )}
        </div>

        {loading && (
          <div role="status" className="glass-strong glow-border flex items-center justify-center gap-2 rounded-2xl p-10 text-sm text-slate-400">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-700 border-t-nexus-500" />
            Loading bus owner contacts…
          </div>
        )}

        {!loading && error && (
          <div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {!loading && !error && operators.length === 0 && (
          <div className="glass-strong glow-border rounded-2xl p-12 text-center">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-nexus-500/25 to-nexus-300/20">
              <FaInbox aria-hidden="true" className="text-3xl text-nexus-400" />
            </div>
            <h3 className="font-display text-lg font-bold text-white">No bus owner contacts yet</h3>
            <p className="mt-2 text-sm text-slate-400">
              Approved bus owners will appear here as soon as they join the network.
            </p>
          </div>
        )}

        {!loading && !error && operators.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((op, i) => (
              <Reveal key={op.id} delay={(i % 3) * 0.07} className="h-full">
              <article className="glass-strong glow-border flex h-full flex-col rounded-2xl p-5">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-nexus-500/25 to-nexus-300/20 text-nexus-400">
                    <FaBuilding aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate font-bold text-white">{op.name}</h3>
                    <p className="text-xs text-slate-400">Reg. {op.registrationNo || '—'}</p>
                  </div>
                </div>
                {op.phone ? (
                  <a href={telHref(op.phone)} className="btn-holo mt-4 w-full" aria-label={`Call ${op.name} on ${op.phone}`}>
                    <FaPhoneAlt aria-hidden="true" /> {op.phone}
                  </a>
                ) : (
                  <p className="mt-4 rounded-xl bg-slate-800/50 px-4 py-2.5 text-center text-sm text-slate-400">
                    No public number
                  </p>
                )}
              </article>
              </Reveal>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="support-heading" className="mb-10">
        <div className="mb-4">
          <span className="eyebrow">Reach a human</span>
          <h2 id="support-heading" className="section-title">Support channels</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Our passenger support team is here for booking, account and payment questions. For trip-specific issues, use the bus owner directory above.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="glass-strong glow-border rounded-2xl p-6">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-nexus-500/25 to-nexus-300/20 text-nexus-400">
              <FaHeadset aria-hidden="true" className="text-xl" />
            </span>
            <h3 className="mt-3 font-bold text-white">Call us</h3>
            <p className="mt-1 text-sm text-slate-400">Prefer to talk? Our support line is open every day.</p>
            <a href="tel:+94112340340" className="btn-holo mt-4 w-full">
              <FaPhoneAlt aria-hidden="true" /> +94 11 2 340 340
            </a>
          </div>
          <div className="glass-strong glow-border rounded-2xl p-6">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-nexus-500/25 to-nexus-300/20 text-nexus-400">
              <FaEnvelope aria-hidden="true" className="text-xl" />
            </span>
            <h3 className="mt-3 font-bold text-white">Email us</h3>
            <p className="mt-1 text-sm text-slate-400">We reply to every message within one business day.</p>
            <a href="mailto:support@vygo.lk" className="btn-holo mt-4 w-full">
              <FaEnvelope aria-hidden="true" /> support@vygo.lk
            </a>
          </div>
        </div>

        <div className="glass-strong glow-border mt-4 rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-nexus-500/25 to-nexus-300/20 text-nexus-400">
              <FaClock aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-bold text-white">Working hours</h3>
              <p className="text-sm text-slate-400">8:00 AM – 8:00 PM Sri Lanka time, 7 days a week, including public holidays.</p>
            </div>
          </div>
        </div>

        <div className="glass-strong glow-border mt-4 rounded-2xl border-amber-500/30 bg-amber-500/5 p-5">
          <h3 className="flex items-center gap-2 font-bold text-white">
            <FaExclamationTriangle aria-hidden="true" className="text-amber-400" />
            Reporting an issue
          </h3>
          <p className="mt-2 text-sm text-slate-300">
            For trip-specific problems — a delayed bus, an unavailable seat or lost property — please contact the operating company directly using the directory above.
          </p>
          {isAdmin ? (
            <p className="mt-2 text-sm text-slate-300">
              As a registered admin you can review and respond to passenger complaints from the{' '}
              <Link to="/admin/complaints" className="font-semibold text-nexus-300 underline-offset-2 hover:underline">
                complaints dashboard
              </Link>
              .
            </p>
          ) : (
            <p className="mt-2 text-sm text-slate-300">
              If the bus owner has not resolved your concern, our support team at{' '}
              <a href="mailto:support@vygo.lk" className="font-semibold text-nexus-300 underline-offset-2 hover:underline">
                support@vygo.lk
              </a>{' '}
              can help escalate it.
            </p>
          )}
        </div>
      </section>

      <section aria-labelledby="pledge-heading" className="mb-0">
        <div className="glass-strong glow-border rounded-2xl p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-nexus-500/25 to-nexus-300/20 text-nexus-400">
              <FaUniversalAccess aria-hidden="true" className="text-xl" />
            </span>
            <div>
              <h2 id="pledge-heading" className="text-xl font-bold text-white">Our accessibility pledge</h2>
              <p className="text-sm text-slate-400">VyGo is designed so every passenger can travel with confidence.</p>
            </div>
          </div>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PLEDGES.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.title} className="rounded-xl bg-slate-800/50 p-4">
                  <Icon aria-hidden="true" className="text-xl text-expressway-400" />
                  <h3 className="mt-2 text-sm font-semibold text-white">{item.title}</h3>
                  <p className="mt-0.5 text-xs text-slate-400">{item.blurb}</p>
                </li>
              )
            })}
          </ul>
        </div>
      </section>
    </div>
  )
}
