import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import LiveDemo from '../components/marketing/LiveDemo'

const C = {
  bg: '#042C53',
  primary: '#185FA5',
  accent: '#378ADD',
  light: '#85B7EB',
  veryLight: '#E6F1FB',
  statsBg: '#031F3D',
}

// ─── Logo ────────────────────────────────────────────────────────────────────

function MarketingLogo({ onClick }) {
  return (
    <button onClick={onClick} aria-label="Back to top" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
      <svg width="20" height="25" viewBox="0 0 24 30" fill="none" aria-hidden="true">
        <path d="M2,28 L2,15 L12,6 L22,15 L22,28 Z" stroke="white" strokeWidth="1.5" strokeLinejoin="round" fill="none" />
        <rect x="4" y="20" width="5" height="8" fill="white" rx="0.5" />
        <rect x="13" y="18" width="5" height="5" stroke="white" strokeWidth="1.5" fill="none" rx="0.5" />
        <line x1="12" y1="3" x2="12" y2="6" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="12" cy="1.5" r="1.5" fill="#85B7EB" />
      </svg>
      <span style={{ fontSize: 18, fontWeight: 500, letterSpacing: '-0.5px', color: 'white', lineHeight: 1, fontFamily: 'inherit' }}>
        haven
      </span>
    </button>
  )
}

// ─── Bubble canvas ────────────────────────────────────────────────────────────

function BubbleCanvas() {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)
    const colors = [C.accent, C.primary, C.light]
    const bubbles = Array.from({ length: 40 }, () => ({
      x: Math.random() * (window.innerWidth || 1200),
      y: (window.innerHeight || 800) + Math.random() * (window.innerHeight || 800),
      r: Math.random() * 52 + 10,
      speed: Math.random() * 0.55 + 0.15,
      opacity: Math.random() * 0.08 + 0.02,
      color: colors[Math.floor(Math.random() * 3)],
      drift: (Math.random() - 0.5) * 0.3,
    }))
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      bubbles.forEach(b => {
        b.y -= b.speed; b.x += b.drift
        if (b.y < -b.r * 2) { b.y = canvas.height + b.r; b.x = Math.random() * canvas.width }
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
        ctx.fillStyle = b.color; ctx.globalAlpha = b.opacity; ctx.fill(); ctx.globalAlpha = 1
      })
      animId = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [])
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 0 }}
    />
  )
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: C.accent }}>{children}</span>
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const Icon = ({ d, viewBox = '0 0 24 24' }) => (
  <svg viewBox={viewBox} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6" aria-hidden="true">
    {d}
  </svg>
)

const icons = {
  user:      <Icon d={<><circle cx="12" cy="8" r="4" /><path d="M4 20c0-3.866 3.582-7 8-7s8 3.134 8 7" /></>} />,
  pill:      <Icon d={<><path d="M10.5 20.5 20.5 10.5a4.95 4.95 0 0 0-7-7L3.5 13.5a4.95 4.95 0 0 0 7 7z" /><line x1="8.5" y1="15.5" x2="15.5" y2="8.5" /></>} />,
  activity:  <Icon d={<polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />} />,
  clock:     <Icon d={<><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 15" /></>} />,
  users:     <Icon d={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>} />,
  fileText:  <Icon d={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>} />,
  check:     <Icon d={<polyline points="20 6 9 17 4 12" />} />,
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

function MarketingNav({ scrollTo }) {
  const [menuOpen, setMenuOpen] = useState(false)

  const navLinks = ['Features', 'Pricing', 'FAQ', 'Contact']

  function handleNav(item) {
    scrollTo(item.toLowerCase())
    setMenuOpen(false)
  }

  return (
    <div className="sticky top-0 z-50">
      <nav
        className="grid items-center px-6 py-4"
        style={{
          gridTemplateColumns: '1fr auto 1fr',
          backgroundColor: 'rgba(4,44,83,0.97)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        {/* Left — logo */}
        <div className="flex items-center">
          <MarketingLogo onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
        </div>

        {/* Center — nav links (perfectly centered in the bar) */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map(item => (
            <button
              key={item}
              type="button"
              onClick={() => handleNav(item)}
              className="text-sm transition-colors"
              style={{ color: 'rgba(255,255,255,0.6)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'white'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
            >
              {item}
            </button>
          ))}
        </div>

        {/* Right — sign in + CTA + hamburger */}
        <div className="flex items-center justify-end gap-3">
          <Link
            to="/login"
            className="hidden md:block text-sm transition-colors"
            style={{ color: 'rgba(255,255,255,0.6)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'white'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
          >
            Sign in
          </Link>
          <Link
            to="/login"
            className="text-sm font-semibold px-4 py-2 rounded-lg bg-white hover:bg-white/90 transition-colors"
            style={{ color: C.bg }}
          >
            Start free trial
          </Link>
          {/* Hamburger — mobile only */}
          <button
            type="button"
            onClick={() => setMenuOpen(o => !o)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
            style={{ color: 'white' }}
          >
            {menuOpen ? (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div
          className="md:hidden"
          style={{
            backgroundColor: 'rgba(4,44,83,0.98)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div className="flex flex-col px-6 py-4 gap-1">
            {navLinks.map(item => (
              <button
                key={item}
                type="button"
                onClick={() => handleNav(item)}
                className="text-left text-base py-3 border-b font-medium transition-colors"
                style={{ color: 'rgba(255,255,255,0.8)', borderColor: 'rgba(255,255,255,0.07)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'white'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}
              >
                {item}
              </button>
            ))}
            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className="text-base py-3 font-medium transition-colors"
              style={{ color: 'rgba(255,255,255,0.8)' }}
            >
              Sign in →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function HeroSection({ scrollTo }) {
  return (
    <section className="relative flex flex-col items-center justify-center text-center px-6 py-14 md:py-32">
      <div className="relative z-10 max-w-3xl mx-auto w-full">
        {/* Large centered logo mark */}
        <div className="flex flex-col items-center mb-6 md:mb-10">
          <svg className="w-12 h-[60px] sm:w-[72px] sm:h-[90px] mb-3 md:mb-4" viewBox="0 0 24 30" fill="none" aria-hidden="true">
            <path d="M2,28 L2,15 L12,6 L22,15 L22,28 Z" stroke="white" strokeWidth="1.2" strokeLinejoin="round" fill="none" />
            <rect x="4" y="20" width="5" height="8" fill="white" rx="0.5" />
            <rect x="13" y="18" width="5" height="5" stroke="white" strokeWidth="1.2" fill="none" rx="0.5" />
            <line x1="12" y1="3" x2="12" y2="6" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
            <circle cx="12" cy="1.5" r="1.5" fill={C.accent} />
          </svg>
          <span style={{ fontSize: 'clamp(2rem, 7vw, 4rem)', fontWeight: 600, letterSpacing: '-2px', color: 'white', lineHeight: 1, fontFamily: 'inherit' }}>
            haven
          </span>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-6 md:mb-8"
          style={{ backgroundColor: 'rgba(55,138,221,0.12)', color: C.light, border: '1px solid rgba(133,183,235,0.2)' }}>
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: C.accent }} aria-hidden="true" />
          Run your home with confidence
        </div>

        <h1 className="font-bold tracking-tight mb-5 md:mb-6 leading-tight" style={{ fontSize: 'clamp(1.75rem, 5vw, 3.5rem)', color: 'white' }}>
          Resident management<br /><span style={{ color: C.light }}>made simple</span>
        </h1>
        <p className="text-base md:text-xl mb-8 md:mb-10 max-w-lg mx-auto leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
          Everything you need to run a great care home, finally in one place.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <Link
            to="/login"
            className="w-full sm:w-auto px-7 py-3.5 rounded-lg text-sm font-semibold bg-white hover:bg-white/90 transition-colors text-center"
            style={{ color: C.bg }}
          >
            Start free trial →
          </Link>
          <button
            type="button"
            className="w-full sm:w-auto px-7 py-3.5 rounded-lg text-sm font-semibold text-white transition-all hover:bg-white/5"
            style={{ border: '1px solid rgba(255,255,255,0.2)' }}
            onClick={() => scrollTo('demo')}
          >
            See how it works
          </button>
        </div>
        <p className="text-sm" style={{ color: 'rgba(133,183,235,0.65)' }}>14-day free trial · No setup fees · Cancel anytime</p>
      </div>
    </section>
  )
}

// ─── Stats bar ────────────────────────────────────────────────────────────────

function StatsBar() {
  const stats = [
    { value: 'Built by', label: 'an RCFE operator' },
    { value: '20+ tools', label: 'in a single login' },
    { value: '14 days', label: 'free trial, no commitment' },
  ]
  return (
    <div className="py-5 md:py-10 px-4" style={{ backgroundColor: C.statsBg, borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="max-w-4xl mx-auto grid grid-cols-3">
        {stats.map((s, i) => (
          <div
            key={i}
            className="flex flex-col items-center text-center px-3 py-1"
            style={i < 2 ? { borderRight: '1px solid rgba(255,255,255,0.08)' } : {}}
          >
            <span className="font-bold text-white text-base md:text-xl">{s.value}</span>
            <span className="text-xs md:text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Live Demo Section ────────────────────────────────────────────────────────

function LiveDemoSection() {
  return (
    <section id="demo" className="py-12 md:py-24 px-4 sm:px-6 overflow-hidden">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8 md:mb-12">
          <SectionLabel>Interactive Demo</SectionLabel>
          <h2 className="text-3xl md:text-4xl font-bold text-white mt-4 mb-4">Try it yourself</h2>
          <p className="text-lg max-w-lg mx-auto" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Live demo with sample data. Click through residents, mark medications, and explore — no sign-up needed.
          </p>
        </div>
        <LiveDemo />
      </div>
    </section>
  )
}

// ─── How it works ─────────────────────────────────────────────────────────────

const STEPS = [
  {
    num: '01',
    title: 'Add your residents',
    desc: 'Import or create resident profiles with photos, health records, emergency contacts, and care notes. Up and running in minutes.',
  },
  {
    num: '02',
    title: 'Track medications, vitals & incidents',
    desc: 'Log daily meds, record vitals, document incidents, and dispense — all from one screen your whole team can use.',
  },
  {
    num: '03',
    title: 'Manage your team & stay compliant',
    desc: 'Build staff schedules, track certifications, run reports, and share access with family — everything auditable and in one place.',
  },
]

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-12 md:py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10 md:mb-16">
          <SectionLabel>How it works</SectionLabel>
          <h2 className="text-3xl md:text-4xl font-bold text-white mt-4 mb-4">Up and running in an afternoon</h2>
          <p className="text-lg max-w-md mx-auto" style={{ color: 'rgba(255,255,255,0.5)' }}>
            No lengthy onboarding. No IT department needed.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((s, i) => (
            <div key={i} className="relative">
              {/* Connecting line between steps */}
              {i < 2 && (
                <div
                  className="hidden md:block absolute top-6 z-0"
                  style={{
                    left: 'calc(3rem + 12px)',
                    right: '-24px',
                    height: '1px',
                    background: 'linear-gradient(to right, rgba(55,138,221,0.4), transparent)',
                  }}
                />
              )}
              <div className="relative z-10">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm mb-5"
                  style={{ backgroundColor: 'rgba(55,138,221,0.15)', color: C.accent, border: '1px solid rgba(55,138,221,0.25)' }}
                >
                  {s.num}
                </div>
                <h3 className="font-semibold text-white text-base mb-2">{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Features ─────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: icons.user,
    title: 'Resident profiles & photo records',
    desc: 'Full profiles with photos, health history, care notes, emergency contacts, and documents — all in one place per resident.',
  },
  {
    icon: icons.pill,
    title: 'Medication management',
    desc: 'Schedule, track, and dispense medications. Log administration history and get alerts before a dose is missed.',
  },
  {
    icon: icons.activity,
    title: 'Vitals, incidents & certifications',
    desc: "Record vital signs, document incidents, and track staff certifications so you're always inspection-ready.",
  },
  {
    icon: icons.clock,
    title: 'Staff scheduling & shift logs',
    desc: 'Build shift schedules, log shift notes, manage time-off, and keep your coverage visible across the whole team.',
  },
  {
    icon: icons.users,
    title: 'Family portal',
    desc: "Give families secure, read-only access to their loved one's profile — updates, photos, and care notes without a login.",
  },
  {
    icon: icons.fileText,
    title: 'Billing, occupancy & reporting',
    desc: 'Track lease terms, billing, bed occupancy, and run reports for compliance, census, and financial planning.',
  },
]

function FeaturesSection() {
  return (
    <section id="features" className="py-12 md:py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10 md:mb-16">
          <SectionLabel>Features</SectionLabel>
          <h2 className="text-3xl md:text-4xl font-bold text-white mt-4 mb-4">Everything in one place</h2>
          <p className="text-lg max-w-md mx-auto" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Built around the real day-to-day needs of care home operators.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className="p-6 rounded-2xl transition-colors"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.07)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.04)'}
            >
              <div className="mb-4" style={{ color: C.accent }}>{f.icon}</div>
              <h3 className="font-semibold text-white mb-2 text-sm">{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Testimonial ──────────────────────────────────────────────────────────────

function Testimonial() {
  return (
    <section className="py-12 md:py-20 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <div className="inline-flex gap-0.5 mb-6" aria-label="5 out of 5 stars" role="img">
          {[...Array(5)].map((_, i) => (
            <svg key={i} className="w-5 h-5" viewBox="0 0 20 20" fill={C.accent} aria-hidden="true">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 0 0 .95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 0 0-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 0 0-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 0 0-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 0 0 .951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
        <blockquote
          className="text-xl md:text-2xl font-medium text-white leading-relaxed mb-8"
          style={{ fontStyle: 'italic' }}
        >
          "Haven replaced four separate tools we were juggling. Our staff adapted in a single afternoon — it just makes sense for how a care home actually runs."
        </blockquote>
        <div className="flex items-center justify-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
            style={{ backgroundColor: C.primary }}
            aria-hidden="true"
          >
            MC
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-white">Maria C.</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>RCFE Administrator · Riverside, CA</p>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

const PLANS = [
  {
    name: 'Starter',
    monthlyPrice: '$129/mo',
    annualPrice: '$107/mo',
    annualNote: 'billed $1,284/yr',
    desc: 'For smaller homes getting organized.',
    highlight: false,
    features: ['Up to 6 residents', 'Resident profiles & photos', 'Medication tracking', 'Emergency contacts', 'Lease & billing terms', 'Calendar & appointments', 'Staff scheduling', 'Photo storage', '2 staff accounts', 'Email support'],
    cta: 'Start free trial',
    ctaLink: '/login',
  },
  {
    name: 'Pro',
    monthlyPrice: '$249/mo',
    annualPrice: '$207/mo',
    annualNote: 'billed $2,484/yr',
    desc: 'For growing teams and busier facilities.',
    highlight: true,
    badge: 'Most Popular',
    features: ['Up to 18 residents', 'Everything in Starter', 'Unlimited staff accounts', 'Staff profiles & roles', 'Admin & staff permissions', 'Vitals & incident tracking', 'Advanced reporting', 'Family portal', 'Priority support'],
    cta: 'Start free trial',
    ctaLink: '/login',
  },
  {
    name: 'Enterprise',
    monthlyPrice: 'From $499/mo',
    annualPrice: 'From $415/mo',
    annualNote: 'billed from $4,980/yr',
    desc: 'For multi-facility operators.',
    highlight: false,
    features: ['Unlimited residents', 'Everything in Pro', 'Multiple facilities', 'Custom branding', 'API access', 'Dedicated account manager', 'Phone support', 'SLA guarantee'],
    cta: 'Contact us',
    ctaScrollTo: 'contact',
  },
]

function PricingCard({ plan, annual, scrollTo }) {
  const price = annual ? plan.annualPrice : plan.monthlyPrice
  return (
    <div
      className="flex flex-col rounded-2xl p-8 relative h-full"
      style={plan.highlight
        ? { backgroundColor: C.primary, border: `2px solid ${C.accent}`, boxShadow: `0 0 40px rgba(55,138,221,0.25)` }
        : { backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
    >
      {plan.badge && (
        <span
          className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap"
          style={{ backgroundColor: C.accent, color: 'white' }}
        >
          {plan.badge}
        </span>
      )}
      <div className="mb-6">
        <p className="text-sm font-semibold mb-1" style={{ color: plan.highlight ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.5)' }}>{plan.name}</p>
        <p className="text-3xl font-bold text-white mb-1">{price}</p>
        {annual && <p className="text-xs" style={{ color: plan.highlight ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.35)' }}>{plan.annualNote}</p>}
        <p className="text-sm mt-3" style={{ color: plan.highlight ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.45)' }}>{plan.desc}</p>
      </div>
      <ul className="space-y-2.5 mb-8 flex-1">
        {plan.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm" style={{ color: plan.highlight ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.6)' }}>
            <span style={{ color: plan.highlight ? C.light : C.accent }} aria-hidden="true">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 8 6.5 11.5 13 4.5" /></svg>
            </span>
            {f}
          </li>
        ))}
      </ul>
      {plan.ctaLink ? (
        <Link
          to={plan.ctaLink}
          className="block text-center py-3 rounded-xl text-sm font-semibold transition-colors"
          style={plan.highlight
            ? { backgroundColor: 'white', color: C.bg }
            : { backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.15)' }}
          onMouseEnter={e => { if (!plan.highlight) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.16)' }}
          onMouseLeave={e => { if (!plan.highlight) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)' }}
        >
          {plan.cta}
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => scrollTo(plan.ctaScrollTo)}
          className="w-full text-center py-3 rounded-xl text-sm font-semibold transition-colors"
          style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.15)' }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.16)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
        >
          {plan.cta}
        </button>
      )}
    </div>
  )
}

function PricingSection({ scrollTo }) {
  const [annual, setAnnual] = useState(false)
  return (
    <section id="pricing" className="py-12 md:py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8 md:mb-12">
          <SectionLabel>Pricing</SectionLabel>
          <h2 className="text-3xl md:text-4xl font-bold text-white mt-4 mb-3">Simple, transparent pricing</h2>
          <p className="text-lg" style={{ color: 'rgba(255,255,255,0.5)' }}>Start free. Scale as you grow. Cancel anytime.</p>

          {/* Billing toggle */}
          <div
            role="group"
            aria-label="Billing frequency"
            className="inline-flex items-center gap-1 mt-8 p-1 rounded-xl"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <button
              type="button"
              onClick={() => setAnnual(false)}
              aria-pressed={!annual}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={!annual ? { backgroundColor: 'white', color: C.bg } : { color: 'rgba(255,255,255,0.55)' }}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setAnnual(true)}
              aria-pressed={annual}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
              style={annual ? { backgroundColor: 'white', color: C.bg } : { color: 'rgba(255,255,255,0.55)' }}
            >
              Annual
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: annual ? C.primary : C.accent, color: 'white' }}
              >
                2 mo free
              </span>
            </button>
          </div>
        </div>

        {/* Cards — Pro first on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          <div className="order-2 md:order-1"><PricingCard plan={PLANS[0]} annual={annual} scrollTo={scrollTo} /></div>
          <div className="order-1 md:order-2"><PricingCard plan={PLANS[1]} annual={annual} scrollTo={scrollTo} /></div>
          <div className="order-3 md:order-3"><PricingCard plan={PLANS[2]} annual={annual} scrollTo={scrollTo} /></div>
        </div>
      </div>
    </section>
  )
}

// ─── FAQ ─────────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: 'Is resident data secure and HIPAA-compliant?',
    a: 'Yes. Haven stores all data on encrypted servers with role-based access controls. Only staff you authorize can view resident records. We follow HIPAA best practices for protected health information.',
  },
  {
    q: 'Can multiple staff members log in at the same time?',
    a: 'Absolutely. Starter includes 2 staff accounts; Pro and Enterprise include unlimited accounts. Each staff member has their own login with role-based permissions so everyone only sees what they need to.',
  },
  {
    q: 'What happens after my 14-day free trial?',
    a: "You'll be prompted to choose a plan. All your data is preserved. If you choose not to subscribe, your account is put on hold — nothing is deleted — so you can return any time.",
  },
  {
    q: 'Can I use Haven for more than one facility?',
    a: 'Yes — our Enterprise plan supports multiple facilities under one account with separate resident lists, staff, and billing per location. Contact us to set that up.',
  },
  {
    q: 'Do you offer training or onboarding support?',
    a: "Every account includes our in-app onboarding checklist. Pro and Enterprise customers get a 1-on-1 onboarding call with our team. We're also reachable via email any time.",
  },
]

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false)
  const id = q.replace(/\s+/g, '-').toLowerCase().slice(0, 30)
  return (
    <div
      className="rounded-xl overflow-hidden transition-colors"
      style={{ backgroundColor: open ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <button
        type="button"
        id={`faq-btn-${id}`}
        aria-expanded={open}
        aria-controls={`faq-panel-${id}`}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
        onClick={() => setOpen(o => !o)}
      >
        <span className="font-medium text-white text-sm">{q}</span>
        <span
          className="flex-shrink-0 transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', color: C.accent }}
          aria-hidden="true"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>
      {open && (
        <div
          id={`faq-panel-${id}`}
          role="region"
          aria-labelledby={`faq-btn-${id}`}
          className="px-6 pb-5 text-sm leading-relaxed"
          style={{ color: 'rgba(255,255,255,0.55)' }}
        >
          {a}
        </div>
      )}
    </div>
  )
}

function FAQSection() {
  return (
    <section id="faq" className="py-12 md:py-24 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8 md:mb-12">
          <SectionLabel>FAQ</SectionLabel>
          <h2 className="text-3xl md:text-4xl font-bold text-white mt-4 mb-3">Common questions</h2>
          <p className="text-lg" style={{ color: 'rgba(255,255,255,0.5)' }}>Everything you need to feel confident before signing up.</p>
        </div>
        <div className="space-y-3">
          {FAQS.map((item, i) => <FAQItem key={i} {...item} />)}
        </div>
      </div>
    </section>
  )
}

// ─── Contact ──────────────────────────────────────────────────────────────────

function ContactSection() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', facility: '', message: '' })
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    // Opens the user's email client with pre-filled content.
    // To replace with a real form service (e.g. Formspree), swap this block:
    //   const res = await fetch('https://formspree.io/f/YOUR_FORM_ID', {
    //     method: 'POST', headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(form),
    //   })
    const subject = encodeURIComponent(`Haven inquiry — ${form.facility} (${form.firstName} ${form.lastName})`)
    const body = encodeURIComponent(
      `Name: ${form.firstName} ${form.lastName}\nEmail: ${form.email}\nFacility: ${form.facility}\n\nMessage:\n${form.message}`
    )
    window.location.href = `mailto:domcoloma@gmail.com?subject=${subject}&body=${body}`
    setTimeout(() => {
      setSubmitting(false)
      setSent(true)
    }, 400)
  }

  const inputBase = {
    backgroundColor: C.veryLight,
    border: '1.5px solid rgba(24,95,165,0.15)',
    color: C.bg,
    fontFamily: 'inherit',
    outline: 'none',
  }

  return (
    <section id="contact" className="py-12 md:py-24 px-6">
      <div className="max-w-xl mx-auto">
        <div
          className="rounded-3xl p-8 md:p-12"
          style={{ backgroundColor: 'white', boxShadow: '0 24px 64px rgba(4,44,83,0.35)' }}
        >
          {sent ? (
            <div className="text-center py-8">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ backgroundColor: C.veryLight }}
              >
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke={C.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2" style={{ color: C.bg }}>Message sent!</h3>
              <p className="text-sm" style={{ color: 'rgba(4,44,83,0.55)' }}>We'll get back to you within one business day.</p>
              <button
                type="button"
                onClick={() => { setSent(false); setForm({ firstName: '', lastName: '', email: '', facility: '', message: '' }) }}
                className="mt-6 text-sm font-semibold transition-colors"
                style={{ color: C.primary }}
              >
                Send another message
              </button>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: C.bg }}>Get in touch</h2>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(4,44,83,0.55)' }}>
                  Have questions or want a personal walkthrough? Send us a message and we'll get back to you within one business day.
                </p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-xs font-semibold mb-1.5" style={{ color: C.bg }}>First name</label>
                    <input
                      id="firstName"
                      name="firstName"
                      value={form.firstName}
                      onChange={handleChange}
                      required
                      placeholder="Jane"
                      autoComplete="given-name"
                      className="w-full px-4 py-3 rounded-xl text-sm"
                      style={inputBase}
                      onFocus={e => e.target.style.borderColor = C.primary}
                      onBlur={e => e.target.style.borderColor = 'rgba(24,95,165,0.15)'}
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-xs font-semibold mb-1.5" style={{ color: C.bg }}>Last name</label>
                    <input
                      id="lastName"
                      name="lastName"
                      value={form.lastName}
                      onChange={handleChange}
                      required
                      placeholder="Smith"
                      autoComplete="family-name"
                      className="w-full px-4 py-3 rounded-xl text-sm"
                      style={inputBase}
                      onFocus={e => e.target.style.borderColor = C.primary}
                      onBlur={e => e.target.style.borderColor = 'rgba(24,95,165,0.15)'}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="email" className="block text-xs font-semibold mb-1.5" style={{ color: C.bg }}>Email</label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    placeholder="jane@myfacility.com"
                    autoComplete="email"
                    className="w-full px-4 py-3 rounded-xl text-sm"
                    style={inputBase}
                    onFocus={e => e.target.style.borderColor = C.primary}
                    onBlur={e => e.target.style.borderColor = 'rgba(24,95,165,0.15)'}
                  />
                </div>
                <div>
                  <label htmlFor="facility" className="block text-xs font-semibold mb-1.5" style={{ color: C.bg }}>Facility name</label>
                  <input
                    id="facility"
                    name="facility"
                    value={form.facility}
                    onChange={handleChange}
                    required
                    placeholder="Sunrise Care Home"
                    autoComplete="organization"
                    className="w-full px-4 py-3 rounded-xl text-sm"
                    style={inputBase}
                    onFocus={e => e.target.style.borderColor = C.primary}
                    onBlur={e => e.target.style.borderColor = 'rgba(24,95,165,0.15)'}
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block text-xs font-semibold mb-1.5" style={{ color: C.bg }}>Message</label>
                  <textarea
                    id="message"
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    required
                    rows={4}
                    placeholder="Tell us about your facility and what you're looking for..."
                    className="w-full px-4 py-3 rounded-xl text-sm"
                    style={{ ...inputBase, resize: 'none' }}
                    onFocus={e => e.target.style.borderColor = C.primary}
                    onBlur={e => e.target.style.borderColor = 'rgba(24,95,165,0.15)'}
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ backgroundColor: C.primary }}
                >
                  {submitting ? 'Opening email…' : 'Send message →'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer({ scrollTo }) {
  return (
    <footer className="px-6 py-10" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-6 md:gap-4">
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Back to top"
          className="text-base font-medium hover:opacity-70 transition-opacity flex-shrink-0"
          style={{ color: 'rgba(255,255,255,0.6)', letterSpacing: '-0.3px' }}
        >
          haven
        </button>
        <p className="flex-1 text-center text-xs order-last md:order-none" style={{ color: 'rgba(255,255,255,0.3)' }}>
          © {new Date().getFullYear()} Haven. All rights reserved.
        </p>
        <nav aria-label="Footer links" className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => scrollTo('faq')}
            className="text-xs transition-colors"
            style={{ color: 'rgba(255,255,255,0.4)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
          >
            FAQ
          </button>
          <button
            type="button"
            onClick={() => scrollTo('pricing')}
            className="text-xs transition-colors"
            style={{ color: 'rgba(255,255,255,0.4)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
          >
            Pricing
          </button>
          <button
            type="button"
            onClick={() => scrollTo('contact')}
            className="text-xs transition-colors"
            style={{ color: 'rgba(255,255,255,0.4)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
          >
            Contact
          </button>
          <Link
            to="/login"
            className="text-xs transition-colors"
            style={{ color: 'rgba(255,255,255,0.4)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
          >
            Sign in
          </Link>
        </nav>
      </div>
    </footer>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Marketing() {
  const scrollTo = id => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <div style={{ backgroundColor: C.bg, color: 'white', fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', minHeight: '100vh', position: 'relative' }}>
      <BubbleCanvas />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <MarketingNav scrollTo={scrollTo} />
        <HeroSection scrollTo={scrollTo} />
        <StatsBar />
        <LiveDemoSection />
        <HowItWorks />
        <FeaturesSection />
        <Testimonial />
        <PricingSection scrollTo={scrollTo} />
        <FAQSection />
        <ContactSection />
        <Footer scrollTo={scrollTo} />
      </div>
    </div>
  )
}
