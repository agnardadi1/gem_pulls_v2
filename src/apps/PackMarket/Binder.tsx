import { useGameStore } from '../../store/useGameStore'
import { RARITY_META } from './packData'
import type { Rarity } from './packData'

export default function Binder() {
  const { collection } = useGameStore()
  const cards = [...collection].filter(c => !c.sold).reverse()

  if (cards.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px' }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="14" height="18" rx="2"/><path d="M16 3h2a2 2 0 012 2v14a2 2 0 01-2 2h-2"/><path d="M7 8h6M7 12h6M7 16h4"/>
        </svg>
        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '15px', fontWeight: 600 }}>No cards yet</div>
        <div style={{ color: 'rgba(255,255,255,0.18)', fontSize: '13px' }}>Open a pack to get started</div>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '4px 14px 32px' }}>
      <div style={{
        color: 'rgba(255,255,255,0.3)',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '2.5px',
        textTransform: 'uppercase',
        marginBottom: '14px',
        paddingLeft: '2px',
      }}>
        {cards.length} card{cards.length !== 1 ? 's' : ''}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {cards.map((card) => {
          const r = (card.rarity as Rarity) ?? 'common'
          const meta = RARITY_META[r] ?? RARITY_META.common

          return (
            <div
              key={card.cid}
              style={{
                borderRadius: '16px',
                overflow: 'hidden',
                background: '#111118',
                border: `1px solid ${meta.textColor}22`,
                boxShadow: meta.glow !== 'none' ? meta.glow : '0 2px 12px rgba(0,0,0,0.4)',
                cursor: 'pointer',
                transition: 'transform 0.15s ease',
              }}
            >
              {/* Card image */}
              <div style={{ width: '100%', height: '150px', background: '#0a0a0a', position: 'relative' }}>
                {card.imageUrl ? (
                  <img
                    src={card.imageUrl}
                    alt={card.playerName}
                    style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                  />
                ) : (
                  <div style={{
                    width: '100%', height: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: meta.color,
                  }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5">
                      <rect x="2" y="3" width="14" height="18" rx="2"/>
                    </svg>
                  </div>
                )}
                {/* Rarity glow strip at top */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
                  background: meta.textColor,
                  opacity: 0.8,
                }} />
              </div>

              {/* Info */}
              <div style={{ padding: '10px 12px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
                  <div style={{
                    width: '5px', height: '5px', borderRadius: '50%',
                    background: meta.textColor,
                    flexShrink: 0,
                    boxShadow: meta.glow !== 'none' ? meta.glow : 'none',
                  }} />
                  <span style={{
                    fontSize: '10px', fontWeight: 700,
                    letterSpacing: '1px', textTransform: 'uppercase',
                    color: meta.textColor,
                    fontFamily: "'Barlow Condensed', sans-serif",
                  }}>
                    {meta.label}
                  </span>
                  {card.sold && (
                    <span style={{ marginLeft: 'auto', fontSize: '9px', color: '#4ade80', fontWeight: 700 }}>SOLD</span>
                  )}
                </div>

                <div style={{
                  color: 'white',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: '15px',
                  fontWeight: 700,
                  letterSpacing: '0.2px',
                  lineHeight: 1.2,
                  marginBottom: '2px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {card.playerName}
                </div>

                <div style={{
                  color: 'rgba(255,255,255,0.35)',
                  fontSize: '10px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  marginBottom: '8px',
                }}>
                  {card.cardSet}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px' }}>Market</span>
                  <span style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: '17px',
                    fontWeight: 800,
                    color: meta.textColor,
                    letterSpacing: '-0.3px',
                  }}>
                    ${card.actualEbayPrice.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
