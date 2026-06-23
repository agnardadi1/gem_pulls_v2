import { useEffect, useRef, useState } from 'react'
import type { Notification, AppId } from '../../types'

const APP_META: Record<AppId, { name: string; color: string; icon: React.ReactNode }> = {
  'home':         { name: 'Gem Pulls', color: '#a855f7', icon: <span style={{ fontSize: 16 }}>💎</span> },
  'settings':     { name: 'Settings',  color: '#6b7280', icon: <span style={{ fontSize: 16 }}>⚙️</span> },
  'pack-market':  {
    name: 'Pack Market', color: '#ea580c',
    icon: (
      <svg viewBox="0 0 28 28" fill="none" width="20" height="20">
        <defs><linearGradient id="npm" x1="0" y1="0" x2="28" y2="28"><stop stopColor="#FB923C"/><stop offset="1" stopColor="#C2410C"/></linearGradient></defs>
        <rect width="28" height="28" rx="6" fill="url(#npm)"/>
        <rect x="6" y="11" width="16" height="11" rx="2" fill="white" fillOpacity="0.9"/>
        <path d="M6 13h16" stroke="#C2410C" strokeWidth="1.5"/>
        <path d="M11 11V8.5a3 3 0 016 0V11" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      </svg>
    ),
  },
  'ebay': {
    name: 'eBay', color: '#0064D2',
    icon: (
      <svg viewBox="0 0 28 28" width="20" height="20">
        <rect width="28" height="28" rx="6" fill="white"/>
        <text y="20" x="1" fontSize="10" fontWeight="900" fontFamily="Arial Black,sans-serif" fill="#E53238">e</text>
        <text y="20" x="8" fontSize="10" fontWeight="900" fontFamily="Arial Black,sans-serif" fill="#0064D2">b</text>
        <text y="20" x="15" fontSize="10" fontWeight="900" fontFamily="Arial Black,sans-serif" fill="#F5AF02">a</text>
        <text y="20" x="21" fontSize="10" fontWeight="900" fontFamily="Arial Black,sans-serif" fill="#86B817">y</text>
      </svg>
    ),
  },
  'instagram': {
    name: 'Instagram', color: '#c13584',
    icon: (
      <svg viewBox="0 0 28 28" width="20" height="20">
        <defs><linearGradient id="nig" x1="0" y1="28" x2="28" y2="0"><stop stopColor="#f9ce34"/><stop offset="0.4" stopColor="#ee2a7b"/><stop offset="1" stopColor="#6228d7"/></linearGradient></defs>
        <rect width="28" height="28" rx="6" fill="url(#nig)"/>
        <rect x="7" y="7" width="14" height="14" rx="4" stroke="white" strokeWidth="1.5" fill="none"/>
        <circle cx="14" cy="14" r="3.5" stroke="white" strokeWidth="1.5" fill="none"/>
        <circle cx="19" cy="9" r="1" fill="white"/>
      </svg>
    ),
  },
  'whatnot': {
    name: 'Whatnot', color: '#FF5100',
    icon: (
      <svg viewBox="0 0 28 28" width="20" height="20">
        <rect width="28" height="28" rx="6" fill="#FF5100"/>
        <text y="22" x="2" fontSize="18" fontWeight="900" fontFamily="Arial Black,sans-serif" fill="white">W</text>
      </svg>
    ),
  },
  'paypal': {
    name: 'PayPal', color: '#003087',
    icon: (
      <svg viewBox="0 0 28 28" width="20" height="20">
        <rect width="28" height="28" rx="6" fill="#003087"/>
        <path d="M18 8c.7 1.2.6 2.6-.2 3.5-.9 1-2.3 1.6-4 1.6h-1.2c-.3 0-.5.2-.6.5l-.6 3.7H9l1.6-10h3.7c1.4 0 2.6.5 3.3 1z" fill="#009cde"/>
      </svg>
    ),
  },
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

interface Props {
  note: Notification
  onDismiss: () => void
  onTap: () => void
}

export default function NotificationCard({ note, onDismiss, onTap }: Props) {
  const meta = APP_META[note.appId]
  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    // Slide in
    const enterTimer = setTimeout(() => setVisible(true), 10)

    // Auto-dismiss after 5s
    timerRef.current = setTimeout(() => { setLeaving(true); setTimeout(onDismiss, 320) }, 5000)

    return () => {
      clearTimeout(enterTimer)
      clearTimeout(timerRef.current)
    }
  }, [])

  function handleDismiss() {
    if (leaving) return
    clearTimeout(timerRef.current)
    setLeaving(true)
    setTimeout(onDismiss, 320)
  }

  function handleTap() {
    handleDismiss()
    setTimeout(onTap, 100)
  }

  return (
    <div
      onClick={handleTap}
      style={{
        transform: visible && !leaving ? 'translateY(0) scale(1)' : 'translateY(-16px) scale(0.96)',
        opacity: visible && !leaving ? 1 : 0,
        transition: leaving
          ? 'transform 0.28s cubic-bezier(0.4,0,1,1), opacity 0.28s ease'
          : 'transform 0.38s cubic-bezier(0.22,1,0.36,1), opacity 0.3s ease',
        background: 'rgba(28, 28, 32, 0.82)',
        backdropFilter: 'blur(28px)',
        WebkitBackdropFilter: 'blur(28px)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: '18px',
        padding: '12px 14px',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-[6px]">
        <div className="flex items-center gap-[7px]">
          <div className="w-5 h-5 rounded-[5px] overflow-hidden flex-shrink-0">{meta.icon}</div>
          <span className="text-white/50 font-semibold uppercase" style={{ fontSize: '11px', letterSpacing: '0.4px' }}>
            {meta.name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/30" style={{ fontSize: '11px' }}>{timeAgo(note.timestamp)}</span>
          <button
            onClick={(e) => { e.stopPropagation(); handleDismiss() }}
            className="w-4 h-4 flex items-center justify-center rounded-full bg-white/10 cursor-pointer"
          >
            <svg width="7" height="7" viewBox="0 0 10 10" fill="none" stroke="white" strokeOpacity="0.6" strokeWidth="1.8" strokeLinecap="round">
              <line x1="1" y1="1" x2="9" y2="9"/><line x1="9" y1="1" x2="1" y2="9"/>
            </svg>
          </button>
        </div>
      </div>
      {/* Content */}
      <div className="text-white font-semibold" style={{ fontSize: '14px', lineHeight: 1.3 }}>{note.title}</div>
      <div className="text-white/55 mt-0.5" style={{ fontSize: '13px', lineHeight: 1.4 }}>{note.body}</div>
    </div>
  )
}
