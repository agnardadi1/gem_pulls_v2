import { PACK_TYPES } from './packData'
import type { PackType } from './packData'
import { useGameStore } from '../../store/useGameStore'

interface Props {
  onSelect: (pack: PackType) => void
}

const BADGES: Record<string, { label: string; bg: string; text: string }> = {
  budget:   { label: 'LOW RISK',   bg: '#16a34a', text: '#fff' },
  standard: { label: 'POPULAR',    bg: '#2563eb', text: '#fff' },
  premium:  { label: 'HIGH ROLLER', bg: '#7c3aed', text: '#fff' },
  chase:    { label: 'JACKPOT',    bg: '#ca8a04', text: '#000' },
}

export default function PackStore({ onSelect }: Props) {
  const { bankroll } = useGameStore()

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '4px 14px 32px' }}>
      <p style={{
        color: 'rgba(255,255,255,0.3)',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '2.5px',
        textTransform: 'uppercase',
        marginBottom: '14px',
        paddingLeft: '2px',
      }}>
        Pick your pack
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {PACK_TYPES.map((pack) => {
          const canAfford = bankroll >= pack.price
          const badge = BADGES[pack.id]

          return (
            <button
              key={pack.id}
              onClick={() => canAfford && onSelect(pack)}
              style={{
                position: 'relative',
                borderRadius: '18px',
                overflow: 'hidden',
                background: '#111118',
                border: `1px solid ${canAfford ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)'}`,
                opacity: canAfford ? 1 : 0.4,
                cursor: canAfford ? 'pointer' : 'default',
                textAlign: 'left',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                boxShadow: canAfford ? '0 4px 20px rgba(0,0,0,0.4)' : 'none',
              }}
              onMouseEnter={e => { if (canAfford) (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
            >
              {/* Badge */}
              {badge && canAfford && (
                <div style={{
                  position: 'absolute', top: '10px', left: '10px', zIndex: 10,
                  background: badge.bg, color: badge.text,
                  borderRadius: '6px', padding: '3px 7px',
                  fontSize: '9px', fontWeight: 800, letterSpacing: '0.8px',
                  fontFamily: "'Barlow Condensed', sans-serif",
                }}>
                  {badge.label}
                </div>
              )}

              {/* Pack image area */}
              <div style={{
                height: '160px',
                background: `linear-gradient(160deg, ${pack.color[0]}, ${pack.color[1]})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <img
                  src={pack.image}
                  alt={pack.name}
                  style={{
                    height: '140px',
                    width: 'auto',
                    objectFit: 'contain',
                    filter: canAfford
                      ? `drop-shadow(0 10px 24px rgba(0,0,0,0.8)) drop-shadow(0 2px 6px ${pack.accent}44)`
                      : 'grayscale(0.5) drop-shadow(0 4px 10px rgba(0,0,0,0.5))',
                  }}
                  draggable={false}
                />
              </div>

              {/* Info */}
              <div style={{ padding: '12px 12px 14px' }}>
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: '18px',
                  fontWeight: 800,
                  color: 'white',
                  letterSpacing: '0.5px',
                  lineHeight: 1,
                  marginBottom: '4px',
                }}>
                  {pack.name.toUpperCase()}
                </div>
                <div style={{
                  fontSize: '10px',
                  color: 'rgba(255,255,255,0.35)',
                  fontWeight: 500,
                  letterSpacing: '0.5px',
                  marginBottom: '12px',
                  textTransform: 'uppercase',
                }}>
                  {pack.subtitle}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{
                    fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: '22px',
                    fontWeight: 800,
                    color: pack.accent,
                    letterSpacing: '-0.5px',
                    lineHeight: 1,
                  }}>
                    ${pack.price.toLocaleString()}
                  </div>

                  <div style={{
                    borderRadius: '10px',
                    padding: '8px 14px',
                    background: canAfford ? pack.accent : 'rgba(255,255,255,0.08)',
                    color: canAfford ? '#000' : 'rgba(255,255,255,0.25)',
                    fontSize: '12px',
                    fontWeight: 800,
                    letterSpacing: '0.5px',
                    fontFamily: "'Barlow Condensed', sans-serif",
                    minHeight: '34px',
                    display: 'flex', alignItems: 'center',
                  }}>
                    {canAfford ? 'OPEN' : 'LOCKED'}
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
