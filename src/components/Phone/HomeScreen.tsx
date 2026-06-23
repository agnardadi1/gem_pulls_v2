import { useRef } from 'react'
import { usePhoneStore } from '../../store/usePhoneStore'
import { useGameStore } from '../../store/useGameStore'
import { useNotificationStore } from '../../store/useNotificationStore'
import NotificationCard from './NotificationCard'
import { APP_MIN_LEVEL } from '../../game/appUnlocks'
import type { AppId } from '../../types'

const PackIcon = () => (
  <svg viewBox="0 0 60 60" fill="none" className="w-full h-full">
    <defs><linearGradient id="pg2" x1="0" y1="0" x2="60" y2="60"><stop stopColor="#FB923C"/><stop offset="1" stopColor="#C2410C"/></linearGradient></defs>
    <rect width="60" height="60" rx="13" fill="url(#pg2)"/>
    <rect x="13" y="23" width="34" height="24" rx="4" fill="white" fillOpacity="0.95"/>
    <path d="M13 28h34" stroke="#C2410C" strokeWidth="2.5"/>
    <path d="M24 23v-5a6 6 0 0112 0v5" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
    <circle cx="30" cy="35" r="3.5" fill="#EA580C"/>
  </svg>
)

const EbayIcon = () => (
  <svg viewBox="0 0 60 60" className="w-full h-full">
    <rect width="60" height="60" rx="13" fill="white"/>
    <text y="39" x="2" fontSize="22" fontWeight="900" fontFamily="Arial Black,Arial,sans-serif" fill="#E53238">e</text>
    <text y="39" x="16" fontSize="22" fontWeight="900" fontFamily="Arial Black,Arial,sans-serif" fill="#0064D2">b</text>
    <text y="39" x="31" fontSize="22" fontWeight="900" fontFamily="Arial Black,Arial,sans-serif" fill="#F5AF02">a</text>
    <text y="39" x="44" fontSize="22" fontWeight="900" fontFamily="Arial Black,Arial,sans-serif" fill="#86B817">y</text>
  </svg>
)

const IgIcon = () => (
  <svg viewBox="0 0 60 60" className="w-full h-full">
    <defs><linearGradient id="ig2" x1="0" y1="60" x2="60" y2="0"><stop stopColor="#f9ce34"/><stop offset="0.25" stopColor="#ee2a7b"/><stop offset="1" stopColor="#6228d7"/></linearGradient></defs>
    <rect width="60" height="60" rx="13" fill="url(#ig2)"/>
    <rect x="15" y="15" width="30" height="30" rx="9" stroke="white" strokeWidth="3" fill="none"/>
    <circle cx="30" cy="30" r="7.5" stroke="white" strokeWidth="3" fill="none"/>
    <circle cx="40.5" cy="19.5" r="2" fill="white"/>
  </svg>
)

const WhatnotIcon = () => (
  <svg viewBox="0 0 60 60" className="w-full h-full">
    <rect width="60" height="60" rx="13" fill="#FF5100"/>
    <text y="46" x="5" fontSize="38" fontWeight="900" fontFamily="Arial Black,Arial,sans-serif" fill="white">W</text>
  </svg>
)

const PayPalIcon = () => (
  <svg viewBox="0 0 60 60" className="w-full h-full">
    <rect width="60" height="60" rx="13" fill="#003087"/>
    <path d="M38 18c1.5 2.5 1.2 5.5-.5 7.5-1.8 2.2-4.8 3.5-8.5 3.5h-2.5c-.6 0-1.1.4-1.2 1l-1.3 8h-4.5l3.5-22h8c3 0 5.5 1 7 2z" fill="#009cde"/>
    <path d="M40 22c.8 1.2 1.1 2.8.9 4.5C40 31 36.5 34 31 34h-2c-.5 0-1 .4-1.1.9L26.5 42H22l3.5-22h8.5c3 0 5 1 6 2z" fill="white" fillOpacity="0.25"/>
  </svg>
)

interface AppDef { id: AppId; label: string; icon: React.ReactNode }

const APPS: AppDef[] = [
  { id: 'pack-market', label: 'Pack Market', icon: <PackIcon /> },
  { id: 'ebay',        label: 'eBay',        icon: <EbayIcon /> },
  { id: 'instagram',   label: 'Instagram',   icon: <IgIcon /> },
  { id: 'whatnot',     label: 'Whatnot',     icon: <WhatnotIcon /> },
  { id: 'paypal',      label: 'PayPal',      icon: <PayPalIcon /> },
]

function AppIcon({ app, level, onTap }: { app: AppDef; level: number; onTap: () => void }) {
  const minLevel = APP_MIN_LEVEL[app.id]
  const locked = level < minLevel
  return (
    <button
      onClick={() => !locked && onTap()}
      className={`flex flex-col items-center gap-2 active:scale-90 transition-transform duration-100 ${locked ? 'cursor-default' : 'cursor-pointer'}`}
    >
      <div className="relative w-[68px] h-[68px]" style={{ filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.5))' }}>
        <div className={locked ? 'opacity-30' : ''}>{app.icon}</div>
        {locked && (
          <div className="absolute inset-0 rounded-[13px] flex flex-col items-center justify-center"
               style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}>
            <svg width="16" height="19" viewBox="0 0 16 19" fill="none">
              <rect x="1" y="8" width="14" height="11" rx="2.5" fill="rgba(255,255,255,0.6)"/>
              <path d="M4 8V6a4 4 0 018 0v2" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" fill="none"/>
            </svg>
          </div>
        )}
      </div>
      <span className="text-[12px] font-medium text-center leading-tight"
            style={{ color: locked ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.9)', textShadow: '0 1px 5px rgba(0,0,0,0.9)' }}>
        {locked ? `Lvl ${minLevel}` : app.label}
      </span>
    </button>
  )
}

export default function HomeScreen() {
  const { openApp } = usePhoneStore()
  const { level, stats, wallpaper, setWallpaper, resetRun } = useGameStore()
  const { notifications, dismiss } = useNotificationStore()
  const fileRef = useRef<HTMLInputElement>(null)

  function handleWallpaperPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setWallpaper(ev.target?.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const levelName = level >= 4 ? 'Mogul' : level >= 3 ? 'Trader' : level >= 2 ? 'Flipper' : 'Rookie'
  const nextThreshold = level >= 4 ? null : level >= 3 ? 100000 : level >= 2 ? 25000 : 5000
  const progress = nextThreshold ? Math.min(stats.earned / nextThreshold, 1) : 1

  // Dev-only buttons (test notif / admin) — set localStorage.dev = 'true' to show.
  const devMode = typeof localStorage !== 'undefined' && localStorage.getItem('dev') === 'true'

  return (
    <div className="relative flex flex-col select-none" style={{ height: '844px', paddingTop: '54px' }}>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleWallpaperPick} />

      {/* Wallpaper button */}
      <div className="absolute top-[60px] right-5 z-30 flex gap-2">
        <button onClick={() => fileRef.current?.click()}
          className="w-7 h-7 rounded-full bg-black/40 backdrop-blur flex items-center justify-center border border-white/20 cursor-pointer">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
          </svg>
        </button>
        {wallpaper && (
          <button onClick={() => setWallpaper(null)}
            className="w-7 h-7 rounded-full bg-black/40 backdrop-blur flex items-center justify-center border border-white/20 cursor-pointer">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      {/* ── Level / progression hero ── */}
      <div className="flex flex-col items-center" style={{ paddingTop: '64px' }}>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '10px' }}>
          Level {level}
        </div>
        <div style={{
          fontFamily: "'Barlow Condensed', sans-serif",
          fontSize: '56px', fontWeight: 900, color: 'white',
          letterSpacing: '-1.5px', lineHeight: 1,
          textShadow: '0 2px 32px rgba(0,0,0,0.7)',
        }}>
          {levelName}
        </div>

        {nextThreshold ? (
          <div className="mt-5" style={{ width: '200px' }}>
            <div style={{ height: '6px', borderRadius: '99px', overflow: 'hidden', background: 'rgba(255,255,255,0.12)' }}>
              <div style={{
                height: '100%', borderRadius: '99px',
                width: `${progress * 100}%`,
                background: 'linear-gradient(90deg, #7c3aed, #a855f7)',
                transition: 'width 0.4s ease',
                boxShadow: '0 0 12px rgba(168,85,247,0.6)',
              }} />
            </div>
            <div className="flex justify-between mt-2">
              <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontWeight: 600 }}>
                ${stats.earned.toLocaleString('en-US', { maximumFractionDigits: 0 })} earned
              </span>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>
                ${nextThreshold.toLocaleString()}
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-5 flex items-center gap-2 rounded-full px-4 py-2"
               style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <span style={{ color: '#fde047', fontSize: '8px' }}>●</span>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600, fontSize: '13px' }}>Max level reached</span>
          </div>
        )}
      </div>

      {/* ── Notifications ── live in the middle empty space */}
      <div className="flex flex-col gap-2 px-4" style={{ flex: 1, paddingTop: '12px', overflow: 'hidden' }}>
        {notifications.map((note) => (
          <NotificationCard
            key={note.id}
            note={note}
            onDismiss={() => dismiss(note.id)}
            onTap={() => openApp(note.appId)}
          />
        ))}
      </div>

      {/* ── App icons + dev buttons ── */}
      <div className="flex flex-col items-center" style={{ paddingBottom: '28px', gap: '14px' }}>
        <div className="flex justify-around w-full px-6">
          {APPS.map(app => (
            <AppIcon key={app.id} app={app} level={level} onTap={() => openApp(app.id)} />
          ))}
        </div>
        <div className="flex justify-center gap-3">
          {devMode && (
            <button
              onClick={() => useNotificationStore.getState().push('ebay', 'Your listing sold!', 'Zion Williamson RC sold for $84.00')}
              className="text-white/20 text-[11px] border border-white/10 rounded-full px-3 py-1 cursor-pointer"
            >
              test notif
            </button>
          )}
          <button
            onClick={() => { if (window.confirm('Reset to $500?')) resetRun() }}
            className="text-white/20 text-[11px] border border-white/10 rounded-full px-3 py-1 cursor-pointer"
          >
            reset $500
          </button>
          {devMode && (
            <button
              onClick={() => useGameStore.setState({ level: 4, bankroll: 99999 })}
              className="text-white/20 text-[11px] border border-white/10 rounded-full px-3 py-1 cursor-pointer"
            >
              admin
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
