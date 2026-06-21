import { useState, useEffect, useRef } from 'react'
import { RARITY_META, openPack } from './packData'
import type { PackType, RealCard } from './packData'
import { useGameStore } from '../../store/useGameStore'

const CARD_W = 220
const CARD_H = 308

interface Props {
  pack: PackType
  onDone: (cards: RealCard[]) => void
}

export default function PackOpener({ pack, onDone }: Props) {
  const { spendBankroll, addCard } = useGameStore()
  const [cards, setCards] = useState<RealCard[]>([])
  const [idx, setIdx] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [overlayY, setOverlayY] = useState(0)
  const [showInfo, setShowInfo] = useState(false)
  const [phase, setPhase] = useState<'opening' | 'summary'>('opening')
  const [autoMode, setAutoMode] = useState(false)
  const [snapOverlay, setSnapOverlay] = useState(false) // disable transition when resetting overlay
  const initRef = useRef(false)
  const dragRef = useRef({ on: false, startY: 0, dy: 0 })
  const isTransitioning = useRef(false)
  const savedIndices = useRef<Set<number>>(new Set())
  const autoTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(autoTimer.current), [])

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true
    spendBankroll(pack.price)
    setCards(openPack(pack))
  }, [])

  const card = cards[idx]
  const progress = Math.min(overlayY / CARD_H, 1)
  const meta = card ? RARITY_META[card.rarity] : RARITY_META.common

  function onPointerDown(e: React.PointerEvent) {
    if (revealed || !card || isTransitioning.current || autoMode) return
    dragRef.current = { on: true, startY: e.clientY, dy: 0 }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = dragRef.current
    if (!d.on || revealed) return
    const dy = Math.max(0, Math.min(CARD_H, e.clientY - d.startY))
    d.dy = dy
    setOverlayY(dy)
  }

  function onPointerUp() {
    const d = dragRef.current
    if (!d.on) return
    d.on = false
    if (d.dy > CARD_H * 0.42) {
      isTransitioning.current = true
      setOverlayY(CARD_H)
      setRevealed(true)
      if (card) saveCard(card, idx)
      setTimeout(() => {
        setShowInfo(true)
        isTransitioning.current = false
      }, 320)
    } else {
      setOverlayY(0)
    }
  }

  function nextCard() {
    if (idx + 1 >= cards.length) {
      setPhase('summary')
    } else {
      setIdx(i => i + 1)
      setRevealed(false)
      setOverlayY(0)
      setShowInfo(false)
    }
  }

  function saveCard(c: RealCard, i: number) {
    if (savedIndices.current.has(i)) return
    savedIndices.current.add(i)
    const rarityMap: Record<string, 'common' | 'uncommon' | 'rare' | 'ultra_rare' | 'legendary'> = {
      common: 'common', uncommon: 'uncommon', rare: 'rare', chase: 'legendary',
    }
    addCard({
      cid: `${c.id}-${Date.now()}-${i}`,
      playerName: c.playerName,
      cardSet: c.cardSet,
      variant: c.variant,
      rarity: rarityMap[c.rarity] ?? 'common',
      actualEbayPrice: c.actualEbayPrice,
      imageUrl: c.imageUrl,
      pulledAt: Date.now(),
      sold: false,
      listed: false,
      sellPrice: null,
    })
  }

  function runAutoSequence(allCards: RealCard[], i: number) {
    // 1. Briefly show card back (already at overlayY=0), then slide reveal
    autoTimer.current = setTimeout(() => {
      setOverlayY(CARD_H)
      setRevealed(true)
      saveCard(allCards[i], i)

      // 2. Let player see the card
      autoTimer.current = setTimeout(() => {
        if (i + 1 < allCards.length) {
          // 3. Snap overlay to top instantly (no animation) then show next card
          setSnapOverlay(true)
          setOverlayY(0)
          setRevealed(false)
          setIdx(i + 1)
          // Re-enable transition after snap renders, then start reveal
          autoTimer.current = setTimeout(() => {
            setSnapOverlay(false)
            autoTimer.current = setTimeout(() => runAutoSequence(allCards, i + 1), 30)
          }, 60)
        } else {
          setPhase('summary')
        }
      }, 950)
    }, 420)
  }

  function openAll(allCards: RealCard[]) {
    setAutoMode(true)
    setIdx(0)
    setOverlayY(0)
    setRevealed(false)
    setShowInfo(false)
    runAutoSequence(allCards, 0)
  }

  // ── Summary ──
  if (phase === 'summary') {
    const total = cards.reduce((s, c) => s + c.actualEbayPrice, 0)
    const best = cards.reduce((b, c) => c.actualEbayPrice > b.actualEbayPrice ? c : b, cards[0])
    const bestMeta = best ? RARITY_META[best.rarity] : null

    return (
      <div style={{ height: '100%', overflowY: 'auto', background: '#0a0a14', padding: '20px 16px 32px' }}>
        {/* Total */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '6px' }}>
            Pack Value
          </div>
          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: '52px', fontWeight: 900, color: 'white',
            letterSpacing: '-2px', lineHeight: 1,
          }}>
            ${total.toFixed(2)}
          </div>
          <div style={{
            marginTop: '6px',
            fontSize: '13px', fontWeight: 600,
            color: total >= pack.price ? '#4ade80' : '#f87171',
          }}>
            {total >= pack.price
              ? `+$${(total - pack.price).toFixed(2)} above cost`
              : `-$${(pack.price - total).toFixed(2)} below cost`}
          </div>
        </div>

        {/* Best pull */}
        {best && bestMeta && (
          <div style={{
            borderRadius: '18px',
            background: `linear-gradient(135deg, ${bestMeta.color} 0%, #0d0d1a 80%)`,
            border: `1px solid ${bestMeta.textColor}44`,
            boxShadow: bestMeta.glow !== 'none' ? bestMeta.glow : 'none',
            marginBottom: '16px',
            overflow: 'hidden',
          }}>
            <div style={{ padding: '4px 14px 6px', background: `${bestMeta.textColor}22` }}>
              <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '2px', color: bestMeta.textColor, fontFamily: "'Barlow Condensed', sans-serif" }}>
                ★ BEST PULL · {bestMeta.label.toUpperCase()}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '14px', padding: '14px' }}>
              <img src={best.imageUrl} alt={best.playerName}
                   style={{ width: '76px', height: '106px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
                <div>
                  <div style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: '20px', fontWeight: 800, color: 'white',
                    lineHeight: 1.1, marginBottom: '4px',
                  }}>{best.playerName}</div>
                  <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '11px', lineHeight: 1.4 }}>{best.cardSet}</div>
                  <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>{best.variant}</div>
                </div>
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: '28px', fontWeight: 900, color: bestMeta.textColor,
                  letterSpacing: '-1px', lineHeight: 1,
                }}>
                  ${best.actualEbayPrice.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* All cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
          {cards.map((c) => {
            const m = RARITY_META[c.rarity]
            return (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                borderRadius: '13px', padding: '10px 12px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <img src={c.imageUrl} alt={c.playerName}
                     style={{ width: '36px', height: '50px', borderRadius: '5px', objectFit: 'cover', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'white', fontWeight: 600, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.playerName}</div>
                  <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.variant}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: m.textColor, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.5px' }}>{m.label.toUpperCase()}</div>
                  <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '16px', fontWeight: 800, color: 'white' }}>${c.actualEbayPrice.toFixed(2)}</div>
                </div>
              </div>
            )
          })}
        </div>

        <button
          onClick={() => onDone(cards)}
          style={{
            width: '100%', borderRadius: '16px', padding: '16px 0',
            background: pack.accent, color: '#000',
            fontSize: '16px', fontWeight: 800, cursor: 'pointer',
            fontFamily: "'Barlow Condensed', sans-serif",
            letterSpacing: '1px',
            border: 'none',
            boxShadow: `0 4px 20px ${pack.accent}55`,
          }}
        >
          DONE
        </button>
      </div>
    )
  }

  // ── Opening screen ──
  if (!card) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div style={{ color: 'rgba(255,255,255,0.3)' }}>Loading...</div>
    </div>
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      height: '100%', background: '#0a0a14',
      paddingTop: '16px', gap: '0',
      overflow: 'hidden',
    }}>
      {/* Counter */}
      <div style={{
        color: 'rgba(255,255,255,0.3)',
        fontSize: '11px', fontWeight: 700,
        letterSpacing: '3px', textTransform: 'uppercase',
        marginBottom: '14px',
        fontFamily: "'Barlow Condensed', sans-serif",
      }}>
        Card {idx + 1} of {cards.length}
      </div>

      {/* Card */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          position: 'relative',
          width: `${CARD_W}px`, height: `${CARD_H}px`,
          borderRadius: '14px', overflow: 'hidden',
          cursor: revealed ? 'default' : 'grab',
          userSelect: 'none',
          touchAction: 'none',
          flexShrink: 0,
          boxShadow: revealed && meta.glow !== 'none'
            ? `0 8px 40px rgba(0,0,0,0.6), ${meta.glow}`
            : '0 8px 40px rgba(0,0,0,0.6)',
          transition: 'box-shadow 0.4s ease',
        }}
      >
        {/* Card front */}
        <img
          src={card.imageUrl}
          alt={card.playerName}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
          draggable={false}
        />

        {/* Card back overlay */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 10,
          transform: `translateY(${overlayY}px)`,
          transition: (dragRef.current.on || snapOverlay) ? 'none' : 'transform 0.3s cubic-bezier(0.22,1,0.36,1)',
          background: 'linear-gradient(160deg, #141428 0%, #0a0a18 100%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px',
          borderRadius: '14px',
          border: '1px solid rgba(255,255,255,0.07)',
        }}>
          <img src="/logo.png" alt="Gem Pulls" style={{ width: '80px', opacity: 0.75 }} draggable={false} />
          <div style={{
            color: 'rgba(255,255,255,0.3)',
            fontSize: '11px', fontWeight: 700,
            letterSpacing: '2.5px', textTransform: 'uppercase',
            fontFamily: "'Barlow Condensed', sans-serif",
          }}>
            ↓ drag to reveal
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{
        width: `${CARD_W}px`, height: '3px',
        borderRadius: '99px', overflow: 'hidden',
        background: 'rgba(255,255,255,0.08)',
        marginTop: '14px', flexShrink: 0,
      }}>
        <div style={{
          height: '100%', borderRadius: '99px',
          width: `${progress * 100}%`,
          background: meta.textColor,
          transition: dragRef.current.on ? 'none' : 'width 0.2s ease',
        }} />
      </div>

      {/* Open All button — visible before any reveal, hidden once auto mode starts */}
      {!revealed && !showInfo && !autoMode && cards.length > 1 && (
        <button
          onClick={() => openAll(cards)}
          style={{
            marginTop: '12px',
            borderRadius: '99px', padding: '10px 28px',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.14)',
            color: 'rgba(255,255,255,0.55)',
            fontSize: '13px', fontWeight: 700, cursor: 'pointer',
            fontFamily: "'Barlow Condensed', sans-serif",
            letterSpacing: '1px',
            minHeight: '44px',
            transition: 'background 0.2s, color 0.2s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.14)'
            ;(e.currentTarget as HTMLElement).style.color = 'white'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'
            ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.55)'
          }}
        >
          OPEN ALL AT ONCE
        </button>
      )}

      {/* Card info after reveal */}
      {showInfo && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: '8px', textAlign: 'center',
          padding: '16px 24px 0',
          animation: 'fadeUp 0.3s ease',
          flexShrink: 0,
        }}>
          <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }`}</style>

          {/* Rarity badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            borderRadius: '99px', padding: '5px 14px',
            background: meta.color,
            border: `1px solid ${meta.textColor}44`,
          }}>
            <div style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: meta.textColor,
              boxShadow: meta.glow !== 'none' ? meta.glow : 'none',
            }} />
            <span style={{
              fontSize: '11px', fontWeight: 800,
              letterSpacing: '1.5px', textTransform: 'uppercase',
              color: meta.textColor,
              fontFamily: "'Barlow Condensed', sans-serif",
            }}>{meta.label}</span>
          </div>

          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: '26px', fontWeight: 900, color: 'white',
            letterSpacing: '-0.5px', lineHeight: 1.1,
          }}>
            {card.playerName}
          </div>

          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', lineHeight: 1.4 }}>
            {card.team} · {card.cardSet}{card.grade && card.grade !== 'Ungraded' ? ` · ${card.grade}` : ''}
          </div>

          <div style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: '32px', fontWeight: 900,
            color: meta.textColor, letterSpacing: '-1px', lineHeight: 1,
          }}>
            ${card.actualEbayPrice.toFixed(2)}
          </div>

          <button
            onClick={nextCard}
            style={{
              marginTop: '4px',
              borderRadius: '99px', padding: '12px 32px',
              background: pack.accent, color: '#000',
              fontSize: '15px', fontWeight: 800, cursor: 'pointer',
              fontFamily: "'Barlow Condensed', sans-serif",
              letterSpacing: '0.5px', border: 'none',
              boxShadow: `0 4px 16px ${pack.accent}55`,
              minHeight: '44px',
            }}
          >
            {idx + 1 >= cards.length ? 'SEE SUMMARY' : 'NEXT CARD →'}
          </button>
        </div>
      )}
    </div>
  )
}
