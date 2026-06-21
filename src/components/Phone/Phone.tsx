import { useEffect, useState, useRef } from 'react'
import { usePhoneStore } from '../../store/usePhoneStore'
import { useGameStore } from '../../store/useGameStore'
import { useNotificationStore } from '../../store/useNotificationStore'
import HomeScreen from './HomeScreen'
import PackMarket from '../../apps/PackMarket/PackMarket'
import EbayApp from '../../apps/eBay/EbayApp'
import InstagramApp from '../../apps/Instagram/InstagramApp'
import WhatnotApp from '../../apps/Whatnot/WhatnotApp'
import type { AppId, Notification } from '../../types'

const APPS: Record<Exclude<AppId, 'home' | 'settings'>, React.ComponentType> = {
  'pack-market': PackMarket,
  'ebay': EbayApp,
  'instagram': InstagramApp,
  'whatnot': WhatnotApp,
}

const APP_ICONS: Record<AppId, React.ReactNode> = {
  'home': null,
  'settings': null,
  'pack-market': (
    <svg viewBox="0 0 60 60" fill="none" width="28" height="28">
      <defs><linearGradient id="bpg" x1="0" y1="0" x2="60" y2="60"><stop stopColor="#FB923C"/><stop offset="1" stopColor="#C2410C"/></linearGradient></defs>
      <rect width="60" height="60" rx="13" fill="url(#bpg)"/>
      <rect x="13" y="23" width="34" height="24" rx="4" fill="white" fillOpacity="0.95"/>
      <path d="M13 28h34" stroke="#C2410C" strokeWidth="2.5"/>
      <path d="M24 23v-5a6 6 0 0112 0v5" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
    </svg>
  ),
  'ebay': (
    <svg viewBox="0 0 60 60" width="28" height="28">
      <rect width="60" height="60" rx="13" fill="white"/>
      <text y="39" x="2"  fontSize="22" fontWeight="900" fontFamily="Arial Black,Arial" fill="#E53238">e</text>
      <text y="39" x="16" fontSize="22" fontWeight="900" fontFamily="Arial Black,Arial" fill="#0064D2">b</text>
      <text y="39" x="31" fontSize="22" fontWeight="900" fontFamily="Arial Black,Arial" fill="#F5AF02">a</text>
      <text y="39" x="44" fontSize="22" fontWeight="900" fontFamily="Arial Black,Arial" fill="#86B817">y</text>
    </svg>
  ),
  'instagram': (
    <svg viewBox="0 0 60 60" width="28" height="28">
      <defs><linearGradient id="igg" x1="0" y1="60" x2="60" y2="0"><stop stopColor="#f9ce34"/><stop offset="0.25" stopColor="#ee2a7b"/><stop offset="1" stopColor="#6228d7"/></linearGradient></defs>
      <rect width="60" height="60" rx="13" fill="url(#igg)"/>
      <rect x="15" y="15" width="30" height="30" rx="9" stroke="white" strokeWidth="3" fill="none"/>
      <circle cx="30" cy="30" r="7.5" stroke="white" strokeWidth="3" fill="none"/>
      <circle cx="40.5" cy="19.5" r="2" fill="white"/>
    </svg>
  ),
  'whatnot': (
    <svg viewBox="0 0 60 60" width="28" height="28">
      <rect width="60" height="60" rx="13" fill="#FF5100"/>
      <text y="46" x="5" fontSize="38" fontWeight="900" fontFamily="Arial Black,Arial" fill="white">W</text>
    </svg>
  ),
}

export default function Phone() {
  const { activeApp, openApp } = usePhoneStore()
  const { wallpaper } = useGameStore()
  const notifications = useNotificationStore(s => s.notifications)
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  )

  // Banner state
  const [banner, setBanner] = useState<Notification | null>(null)
  const [bannerVisible, setBannerVisible] = useState(false)
  const lastNotifId = useRef<string | null>(null)
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Drag-to-dismiss state
  const dragStart = useRef<number | null>(null)
  const [dragY, setDragY] = useState(0)
  const isDragging = useRef(false)

  useEffect(() => {
    const id = setInterval(() => {
      setTime(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }))
    }, 1000)
    return () => clearInterval(id)
  }, [])

  // Watch for new notifications → show banner
  useEffect(() => {
    const latest = notifications[0]
    if (!latest || latest.id === lastNotifId.current) return
    lastNotifId.current = latest.id

    // Reset any existing banner
    clearTimeout(dismissTimer.current)
    setBannerVisible(false)
    setDragY(0)

    // Short delay so exit animation of previous banner can play
    setTimeout(() => {
      setBanner(latest)
      setBannerVisible(true)
      dismissTimer.current = setTimeout(hideBanner, 7000)
    }, bannerVisible ? 300 : 0)
  }, [notifications])

  useEffect(() => () => clearTimeout(dismissTimer.current), [])

  function hideBanner() {
    setBannerVisible(false)
    setDragY(0)
    setTimeout(() => setBanner(null), 350)
  }

  function onBannerPointerDown(e: React.PointerEvent) {
    dragStart.current = e.clientY
    isDragging.current = true
    setDragY(0)
    clearTimeout(dismissTimer.current)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onBannerPointerMove(e: React.PointerEvent) {
    if (!isDragging.current || dragStart.current === null) return
    const dy = e.clientY - dragStart.current
    setDragY(Math.min(20, dy)) // allow slight downward drag, cap it
  }

  function onBannerPointerUp(e: React.PointerEvent) {
    if (!isDragging.current || dragStart.current === null) return
    isDragging.current = false
    const dy = e.clientY - dragStart.current
    if (dy < -20) {
      // Swiped up — dismiss
      hideBanner()
    } else {
      // Snap back and resume timer
      setDragY(0)
      dismissTimer.current = setTimeout(hideBanner, 4000)
    }
    dragStart.current = null
  }

  function onBannerTap() {
    if (banner) openApp(banner.appId)
    hideBanner()
  }

  const ActiveApp = activeApp && activeApp !== 'home' && activeApp !== 'settings'
    ? APPS[activeApp as Exclude<AppId, 'home' | 'settings'>]
    : null

  // Banner transform: slide down from Dynamic Island
  const bannerTranslateY = bannerVisible
    ? `translateY(${dragY}px)`
    : 'translateY(-110%)'

  return (
    <div
      className="relative w-[390px] h-[844px] bg-black rounded-[54px] overflow-hidden"
      style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.08), inset 0 0 0 1px rgba(255,255,255,0.04), 0 40px 80px rgba(0,0,0,0.9)' }}
    >
      {/* Dynamic island */}
      <div className="absolute top-[12px] left-1/2 -translate-x-1/2 w-[126px] h-[36px] bg-black rounded-full z-50" />

      {/* Status bar */}
      <div className="absolute top-0 left-0 right-0 h-[54px] z-40 flex items-center">
        <div className="flex items-center" style={{ paddingLeft: '26px', paddingTop: '6px' }}>
          <span className="text-white font-semibold" style={{ fontSize: '15px', letterSpacing: '-0.3px' }}>{time}</span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-[5px]" style={{ paddingRight: '26px', paddingTop: '6px' }}>
          <svg width="17" height="11" viewBox="0 0 17 11" fill="white">
            <rect x="0" y="3.5" width="3" height="7.5" rx="1" opacity="0.35"/>
            <rect x="4.5" y="2" width="3" height="9" rx="1" opacity="0.55"/>
            <rect x="9" y="0.5" width="3" height="10.5" rx="1" opacity="0.8"/>
            <rect x="13.5" y="0" width="3" height="11" rx="1"/>
          </svg>
          <svg width="15" height="11" viewBox="0 0 20 15" fill="none">
            <path d="M10 11.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" fill="white"/>
            <path d="M4.5 7.5a7.8 7.8 0 0111 0" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
            <path d="M1 4a13 13 0 0118 0" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          <div className="flex items-center gap-[1px]">
            <div className="w-[22px] h-[11px] rounded-[3px] border border-white/55 p-[2px] flex">
              <div className="bg-white rounded-[1px] flex-1" />
            </div>
            <div className="w-[2px] h-[4px] bg-white/40 rounded-r-sm" />
          </div>
        </div>
      </div>

      {/* ── Dynamic Island banner notification ── */}
      {banner && (
        <div
          onPointerDown={onBannerPointerDown}
          onPointerMove={onBannerPointerMove}
          onPointerUp={onBannerPointerUp}
          onPointerCancel={onBannerPointerUp}
          onClick={onBannerTap}
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            right: '10px',
            zIndex: 60,
            transform: bannerTranslateY,
            transition: isDragging.current ? 'none' : 'transform 0.38s cubic-bezier(0.22,1,0.36,1)',
            cursor: 'pointer',
            userSelect: 'none',
            touchAction: 'none',
          }}
        >
          <div style={{
            background: 'rgba(28,28,32,0.88)',
            backdropFilter: 'blur(32px)',
            WebkitBackdropFilter: 'blur(32px)',
            borderRadius: '22px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.08) inset',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            {/* App icon */}
            <div style={{ flexShrink: 0, borderRadius: '8px', overflow: 'hidden', width: '28px', height: '28px' }}>
              {APP_ICONS[banner.appId]}
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {banner.appId === 'pack-market' ? 'Pack Market' : banner.appId === 'ebay' ? 'eBay' : banner.appId}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>now</span>
              </div>
              <div style={{ color: 'white', fontSize: '13px', fontWeight: 700, lineHeight: 1.2, marginBottom: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {banner.title}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {banner.body}
              </div>
            </div>
          </div>

          {/* Swipe hint — subtle up arrow */}
          <div style={{
            display: 'flex', justifyContent: 'center', marginTop: '4px', opacity: 0.3,
          }}>
            <svg width="20" height="8" viewBox="0 0 20 8" fill="none">
              <path d="M4 6L10 2L16 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      )}

      {/* Wallpaper */}
      {wallpaper ? (
        <div className="absolute inset-0" style={{ backgroundImage: `url(${wallpaper})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
      ) : (
        <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, #1a2a6c 0%, #4a1fa8 45%, #7b2ff7 75%, #a855f7 100%)' }} />
      )}
      <div className="absolute inset-0 bg-black/10" />

      {ActiveApp && <div className="absolute inset-0 bg-[#0a0a0a] z-10" />}

      <div className="absolute inset-0 z-20">
        {ActiveApp ? (
          <div className="flex flex-col" style={{ height: '844px' }}>
            <div style={{ height: '54px', flexShrink: 0 }} />
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <ActiveApp />
            </div>
          </div>
        ) : (
          <HomeScreen />
        )}
      </div>

      {/* Home indicator */}
      <div className="absolute bottom-[6px] left-1/2 -translate-x-1/2 w-[134px] h-[5px] bg-white/30 rounded-full z-50" />
    </div>
  )
}
