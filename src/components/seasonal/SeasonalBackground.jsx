import { useMemo } from 'react'
import { getSeasonalDecor } from '../../lib/seasonalDecor'
import { useThemeOff } from '../../lib/themePref'

const rand = (a, b) => a + Math.random() * (b - a)

function buildParticles(sets) {
  const out = []
  for (const set of sets) {
    for (let i = 0; i < set.n; i++) {
      const dur = set.kind === 'bob' ? rand(3, 5)
        : set.kind === 'burst' ? rand(2.5, 4.5)
        : rand(8, 14)
      const style = {
        left: `${rand(0, 100)}%`,
        fontSize: `${rand(set.sz[0], set.sz[1])}px`,
        '--op': set.op,
        animationName: `seasonal-${set.kind}`,
        animationDuration: `${dur}s`,
        animationDelay: `${-rand(0, dur)}s`,
        animationTimingFunction: set.kind === 'burst' ? 'ease-out' : set.kind === 'bob' ? 'ease-in-out' : 'linear',
        animationIterationCount: 'infinite',
      }
      if (set.kind === 'bob' || set.kind === 'burst') style.top = `${rand(8, 85)}%`
      if (set.kind === 'bob') style.opacity = set.op // bob keyframes don't animate opacity
      out.push({ emoji: set.e[Math.floor(Math.random() * set.e.length)], glow: !!set.glow, style })
    }
  }
  return out
}

export default function SeasonalBackground() {
  const off = useThemeOff()
  const reduced = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
    []
  )
  const particles = useMemo(() => (off || reduced ? [] : buildParticles(getSeasonalDecor())), [off, reduced])

  if (particles.length === 0) return null

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {particles.map((p, i) => (
        <span key={i} className={`seasonal-particle${p.glow ? ' seasonal-glow' : ''}`} style={p.style}>
          {p.emoji}
        </span>
      ))}
    </div>
  )
}
