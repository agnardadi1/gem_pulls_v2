import { useState } from 'react'
import { useGameStore } from '../../store/useGameStore'
import { usePhoneStore } from '../../store/usePhoneStore'
import { useNotificationStore } from '../../store/useNotificationStore'
import { genIgOffers } from '../Instagram/igLogic'
import { isUnlocked } from '../../game/appUnlocks'
import { RARITY_META } from './packData'
import type { Card } from '../../types'

const BC = "'Barlow Condensed', sans-serif"

type SortMode = 'value' | 'rarity' | 'new' | 'name'

// Card rarities ('legendary'/'ultra_rare') map onto packData's meta palette.
const META_KEY: Record<string, keyof typeof RARITY_META> = {
  common: 'common', uncommon: 'uncommon', rare: 'rare', ultra_rare: 'chase', legendary: 'chase',
}
const metaFor = (r: string) => RARITY_META[META_KEY[r] ?? 'common']
const RARITY_RANK: Record<string, number> = { common: 1, uncommon: 2, rare: 3, ultra_rare: 4, legendary: 4 }

function statusOf(c: Card): { label: string; color: string } | null {
  if (c.sold) return { label: 'SOLD', color: '#4ade80' }
  if (c.listed && c.platform === 'ebay') return { label: 'LISTED', color: '#60a5fa' }
  if (c.listed && c.platform === 'instagram') return { label: 'ON INSTA', color: '#ee2a7b' }
  return null
}

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function Binder() {
  const { collection, updateCard, level } = useGameStore()
  const requestList = usePhoneStore(s => s.requestList)
  const pushNotif = useNotificationStore(s => s.push)
  const [sort, setSort] = useState<SortMode>('value')
  const [detailCid, setDetailCid] = useState<string | null>(null)
  const igUnlocked = isUnlocked('instagram', level)

  if (collection.length === 0) {
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

  const holdings = collection.filter(c => !c.sold)
  const portfolio = holdings.reduce((s, c) => s + c.actualEbayPrice, 0)

  function cmp(a: Card, b: Card): number {
    switch (sort) {
      case 'rarity': return (RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity]) || (b.actualEbayPrice - a.actualEbayPrice)
      case 'new': return b.pulledAt - a.pulledAt
      case 'name': return a.playerName.localeCompare(b.playerName)
      default: return b.actualEbayPrice - a.actualEbayPrice
    }
  }
  // Cards you still own come first; sold history sinks to the bottom.
  const sorted = [...collection].sort((a, b) => {
    const ah = a.sold ? 1 : 0, bh = b.sold ? 1 : 0
    if (ah !== bh) return ah - bh
    return cmp(a, b)
  })

  const detail = detailCid ? collection.find(c => c.cid === detailCid) : null

  function listOnInstagram(card: Card) {
    const now = Date.now()
    updateCard(card.cid, { listed: true, platform: 'instagram', igPostedAt: now, igOffers: genIgOffers(card, now) })
    pushNotif('instagram', 'Posted to Instagram', `${card.playerName} is live — offers incoming`)
    setDetailCid(null)
  }

  function listOnEbay(card: Card) {
    setDetailCid(null)
    requestList(card.cid, 'ebay')
  }

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      <div style={{ height: '100%', overflowY: 'auto', padding: '4px 14px 32px' }}>

        {/* Portfolio header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '12px', paddingLeft: '2px' }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>
              Portfolio · {holdings.length} held
            </div>
            <div style={{ fontFamily: BC, fontSize: '30px', fontWeight: 900, color: 'white', letterSpacing: '-1px', lineHeight: 1.1 }}>
              ${portfolio.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Sort control */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '14px', background: 'rgba(255,255,255,0.06)', borderRadius: '11px', padding: '3px' }}>
          {([['value', 'Value'], ['rarity', 'Rarity'], ['new', 'Newest'], ['name', 'Name']] as [SortMode, string][]).map(([k, label]) => (
            <button key={k} onClick={() => setSort(k)}
              style={{
                flex: 1, padding: '7px 0', borderRadius: '8px', border: 'none', cursor: 'pointer',
                fontSize: '12px', fontWeight: 700,
                background: sort === k ? 'rgba(255,255,255,0.13)' : 'transparent',
                color: sort === k ? 'white' : 'rgba(255,255,255,0.4)',
                transition: 'background 0.15s, color 0.15s',
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {sorted.map((card) => {
            const meta = metaFor(card.rarity)
            const status = statusOf(card)
            return (
              <button
                key={card.cid}
                onClick={() => setDetailCid(card.cid)}
                style={{
                  textAlign: 'left', padding: 0,
                  borderRadius: '16px', overflow: 'hidden',
                  background: '#111118',
                  border: `1px solid ${meta.textColor}22`,
                  boxShadow: meta.glow !== 'none' ? meta.glow : '0 2px 12px rgba(0,0,0,0.4)',
                  cursor: 'pointer',
                  opacity: card.sold ? 0.55 : 1,
                  transition: 'transform 0.15s ease',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1)'}
              >
                {/* Card image */}
                <div style={{ width: '100%', height: '150px', background: '#0a0a0a', position: 'relative' }}>
                  {card.imageUrl ? (
                    <img src={card.imageUrl} alt={card.playerName} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: meta.color }}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"><rect x="2" y="3" width="14" height="18" rx="2"/></svg>
                    </div>
                  )}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: meta.textColor, opacity: 0.8 }} />
                  {status && (
                    <span style={{ position: 'absolute', top: '8px', right: '8px', fontSize: '9px', fontWeight: 800, letterSpacing: '0.5px', color: '#000', background: status.color, borderRadius: '5px', padding: '2px 6px' }}>
                      {status.label}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div style={{ padding: '10px 12px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: meta.textColor, flexShrink: 0, boxShadow: meta.glow !== 'none' ? meta.glow : 'none' }} />
                    <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: meta.textColor, fontFamily: BC }}>
                      {meta.label}
                    </span>
                  </div>

                  <div style={{ color: 'white', fontFamily: BC, fontSize: '15px', fontWeight: 700, letterSpacing: '0.2px', lineHeight: 1.2, marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {card.playerName}
                  </div>

                  <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '8px' }}>
                    {card.cardSet}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px' }}>{card.sold ? 'Sold' : 'Market'}</span>
                    <span style={{ fontFamily: BC, fontSize: '17px', fontWeight: 800, color: card.sold ? '#4ade80' : meta.textColor, letterSpacing: '-0.3px' }}>
                      ${(card.sold ? (card.sellPrice ?? card.actualEbayPrice) : card.actualEbayPrice).toFixed(2)}
                    </span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Detail sheet */}
      {detail && (
        <div onClick={() => setDetailCid(null)}
          style={{ position: 'absolute', inset: 0, zIndex: 20, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ width: '100%', background: '#15151f', borderTopLeftRadius: '22px', borderTopRightRadius: '22px', borderTop: `1px solid ${metaFor(detail.rarity).textColor}33`, padding: '14px 18px 22px', animation: 'sheetUp 0.25s ease' }}>
            <style>{`@keyframes sheetUp { from { transform: translateY(40px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }`}</style>
            <div style={{ width: '36px', height: '4px', borderRadius: '99px', background: 'rgba(255,255,255,0.2)', margin: '0 auto 16px' }} />

            <div style={{ display: 'flex', gap: '14px', marginBottom: '16px' }}>
              <div style={{ width: '92px', height: '128px', borderRadius: '10px', overflow: 'hidden', background: '#0a0a0a', flexShrink: 0, boxShadow: metaFor(detail.rarity).glow !== 'none' ? metaFor(detail.rarity).glow : 'none' }}>
                {detail.imageUrl && <img src={detail.imageUrl} alt={detail.playerName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', borderRadius: '99px', padding: '3px 10px', background: metaFor(detail.rarity).color, marginBottom: '8px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: metaFor(detail.rarity).textColor, fontFamily: BC }}>{metaFor(detail.rarity).label}</span>
                </div>
                <div style={{ color: 'white', fontFamily: BC, fontSize: '22px', fontWeight: 800, lineHeight: 1.1 }}>{detail.playerName}</div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', marginTop: '2px' }}>{detail.cardSet}</div>
                {detail.variant && detail.variant !== 'Base' && <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{detail.variant}</div>}
                <div style={{ fontFamily: BC, fontSize: '26px', fontWeight: 900, color: metaFor(detail.rarity).textColor, marginTop: '8px', letterSpacing: '-0.5px' }}>
                  ${detail.actualEbayPrice.toFixed(2)}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', marginTop: '2px' }}>Pulled {fmtDate(detail.pulledAt)}</div>
              </div>
            </div>

            {/* Actions / status */}
            {!detail.sold && !detail.listed ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => listOnEbay(detail)} style={sheetBtn('#3665F3', '#fff')}>List on eBay</button>
                  {igUnlocked && (
                    <button onClick={() => listOnInstagram(detail)} style={sheetBtn('linear-gradient(45deg,#feda75,#d62976 55%,#4f5bd5)', '#fff')}>List on Instagram</button>
                  )}
                </div>
                <button onClick={() => setDetailCid(null)} style={sheetBtn('rgba(255,255,255,0.08)', 'rgba(255,255,255,0.7)')}>Hold</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ textAlign: 'center', padding: '10px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 600 }}>
                  {detail.sold
                    ? `Sold for $${(detail.sellPrice ?? 0).toFixed(2)}`
                    : detail.platform === 'ebay' ? 'Currently listed on eBay' : 'Currently posted on Instagram'}
                </div>
                <button onClick={() => setDetailCid(null)} style={sheetBtn('rgba(255,255,255,0.08)', 'rgba(255,255,255,0.7)')}>Close</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function sheetBtn(bg: string, color: string): React.CSSProperties {
  return {
    flex: 1, padding: '13px', borderRadius: '12px', border: 'none', background: bg, color,
    fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: BC, letterSpacing: '0.3px',
  }
}
