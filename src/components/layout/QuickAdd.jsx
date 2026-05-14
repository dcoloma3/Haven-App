import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useIsMobile } from '../../hooks/useIsMobile'

function IncidentIcon() {
  return (
    <svg className="w-6 h-6 text-[#185FA5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function VitalIcon() {
  return (
    <svg className="w-6 h-6 text-[#185FA5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}

function ShiftNoteIcon() {
  return (
    <svg className="w-6 h-6 text-[#185FA5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function WrenchIcon() {
  return (
    <svg className="w-6 h-6 text-[#185FA5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  )
}

export default function QuickAdd() {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  if (!isMobile) return null

  const actions = [
    {
      label: 'Log Incident',
      icon: <IncidentIcon />,
      onTap: () => navigate('/incidents', { state: { quickAdd: true } }),
    },
    {
      label: 'Record Vital',
      icon: <VitalIcon />,
      onTap: () => navigate('/vitals', { state: { quickAdd: true } }),
    },
    {
      label: 'Shift Note',
      icon: <ShiftNoteIcon />,
      onTap: () => navigate('/shift-log', { state: { quickAdd: true } }),
    },
    {
      label: 'Maintenance',
      icon: <WrenchIcon />,
      onTap: () => navigate('/maintenance', { state: { quickAdd: true } }),
    },
  ]

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Action tiles */}
      {open && (
        <div
          className="fixed z-50 grid grid-cols-2 gap-3"
          style={{ right: '20px', bottom: '148px', width: '240px' }}
        >
          {actions.map(action => (
            <button
              key={action.label}
              onClick={() => { setOpen(false); action.onTap() }}
              className="bg-white rounded-2xl shadow-lg border border-slate-100 flex flex-col items-center justify-center gap-2 py-4 active:scale-95 transition-transform"
            >
              {action.icon}
              <span className="text-xs font-semibold text-slate-700 text-center leading-tight">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* FAB button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed z-50 w-14 h-14 rounded-full bg-[#185FA5] shadow-xl flex items-center justify-center active:scale-95 transition-all"
        style={{ right: '20px', bottom: '80px' }}
        aria-label="Quick add"
      >
        <svg
          className="w-6 h-6 text-white transition-transform duration-200"
          style={{ transform: open ? 'rotate(45deg)' : 'rotate(0deg)' }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </>
  )
}
