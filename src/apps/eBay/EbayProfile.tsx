import { useMemo } from 'react'
import { useGameStore } from '../../store/useGameStore'
import { ebayRepInfo } from './ebayLogic'
import type { EbayRep } from '../../types'

const BC = "'Barlow Condensed', sans-serif"

// eBay star system
function getStarInfo(score: number): { color: string; label: string; shooting: boolean } {
  if (score >= 10000) return { color: '#00b3b3', label: 'Turquoise Shooting Star', shooting: true }
  if (score >= 5000)  return { color: '#f5af02', label: 'Yellow Shooting Star', shooting: true }
  if (score >= 1000)  return { color: '#22c55e', label: 'Green Star', shooting: false }
  if (score >= 500)   return { color: '#E53238', label: 'Red Star', shooting: false }
  if (score >= 100)   return { color: '#9333ea', label: 'Purple Star', shooting: false }
  if (score >= 50)    return { color: '#06b6d4', label: 'Turquoise Star', shooting: false }
  if (score >= 10)    return { color: '#3b82f6', label: 'Blue Star', shooting: false }
  return               { color: '#f5af02', label: 'Yellow Star', shooting: false }
}

// Deterministic DSR scores based on rep tier
function getDSR(rep: EbayRep) {
  const info = ebayRepInfo(rep)
  const base = info.tier === 'Power Seller' ? 4.9
    : info.tier === 'Top Rated'   ? 4.7
    : info.tier === 'Established' ? 4.4
    : info.tier === 'Developing'  ? 4.1
    : info.tier === 'New Seller'  ? 3.8
    : 3.5
  const spread = (seed: number) => Math.round((base + (seed * 0.17 % 0.25)) * 10) / 10
  return {
    description: Math.min(5, spread(1)),
    shipping:    Math.min(5, spread(2)),
    speed:       Math.min(5, spread(3)),
    communication: Math.min(5, spread(4)),
  }
}

// Generate feedback entries from sold cards
const BUYER_NAMES = [
  'hoops_collector99', 'cardking_rob', 'nba_grails_only', 'flipperPro77',
  'AllStarCards_LLC', 'BargainBob_Cards', 'VintageSlabz', 'TopLoader_Tony',
  'GrailHunter_NBA', 'CardGrader99', 'nba_collector_og', 'SlabKing_2024',
  'BrickByBrick_Cards', 'courtside_pulls', 'prism_chaser',
]
const POS_COMMENTS = [
  'Great seller! Card exactly as described. Fast shipping. A++++',
  'Smooth transaction. Card was well packed. Would buy again!',
  'Exactly what I expected. Great communication. Thank you!',
  'Quick shipping, card in perfect condition. Highly recommend.',
  'Fantastic seller! Card arrived safely. Will definitely buy again.',
  'Amazing deal! Super fast ship. Exactly as described. 5 stars!',
  'Item as pictured. Fast and secure packaging. Excellent seller!',
  'Great experience overall. Card was mint. Thanks!',
  'Trusted seller. No issues. Would recommend to all card collectors.',
  'Perfect transaction. Item arrived on time and in great shape.',
]
const NEG_COMMENTS = [
  'Item not as described. Disappointed with condition.',
  'Shipping took longer than expected.',
  'Card had a crease not shown in photos.',
]

function generateFeedback(collection: ReturnType<typeof useGameStore.getState>['collection'], rep: EbayRep) {
  const sold = collection.filter(c => c.sold && c.platform === 'ebay')
  const entries = sold.map((c, i) => ({
    id: c.cid,
    buyer: BUYER_NAMES[i % BUYER_NAMES.length],
    comment: POS_COMMENTS[i % POS_COMMENTS.length],
    positive: true,
    item: c.playerName,
    price: c.sellPrice || 0,
    date: new Date(c.pulledAt + i * 86400000 * 2).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  }))
  // Sprinkle in negatives if rep has negative count
  for (let n = 0; n < rep.negative && n < 2; n++) {
    const idx = Math.floor(entries.length * 0.4) + n
    if (entries[idx]) {
      entries[idx].positive = false
      entries[idx].comment = NEG_COMMENTS[n % NEG_COMMENTS.length]
      entries[idx].buyer = BUYER_NAMES[(idx + 7) % BUYER_NAMES.length]
    }
  }
  return entries.reverse()
}

function StarIcon({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
    </svg>
  )
}

function DSRBar({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
      <span style={{ flex: 1, fontSize: '13px', color: '#555' }}>{label}</span>
      <div style={{ display: 'flex', gap: '2px' }}>
        {[1,2,3,4,5].map(i => (
          <StarIcon key={i} color={i <= Math.round(value) ? '#f5af02' : '#e5e7eb'} size={14} />
        ))}
      </div>
      <span style={{ fontSize: '13px', fontWeight: 700, color: '#111', width: '28px', textAlign: 'right' }}>{value.toFixed(1)}</span>
    </div>
  )
}

interface Props { onClose: () => void }

export default function EbayProfile({ onClose }: Props) {
  const { collection, ebayRep, stats } = useGameStore()
  const repInfo = ebayRepInfo(ebayRep)
  const totalScore = ebayRep.positive
  const pct = ebayRep.feedback > 0 ? Math.round((ebayRep.positive / ebayRep.feedback) * 1000) / 10 : 100
  const star = getStarInfo(totalScore)
  const dsr = getDSR(ebayRep)
  const feedback = useMemo(() => generateFeedback(collection, ebayRep), [collection, ebayRep])
  const totalEarned = collection.filter(c => c.sold && c.platform === 'ebay').reduce((s, c) => s + (c.sellPrice || 0), 0)
  const soldCount = collection.filter(c => c.sold && c.platform === 'ebay').length
  const activeCount = collection.filter(c => c.listed && !c.sold).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f5f5f5' }}>

      {/* Header */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '10px 16px',
        display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0,
      }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 0' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3665F3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          <span style={{ color: '#3665F3', fontSize: '14px', fontWeight: 600 }}>Back</span>
        </button>
        <span style={{ fontSize: '17px', fontWeight: 700, color: '#111', flex: 1, textAlign: 'center' }}>Seller Profile</span>
        <div style={{ width: '52px' }} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* Profile hero */}
        <div style={{ background: '#fff', padding: '20px 16px 16px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Avatar */}
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #3665F3, #0064D2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <span style={{ fontFamily: BC, fontSize: '26px', fontWeight: 800, color: '#fff' }}>GP</span>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#111', marginBottom: '2px' }}>GemPulls_Cards</div>
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '6px' }}>100% Positive · {ebayRep.feedback} ratings</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <StarIcon color={star.color} size={18} />
                <span style={{ fontFamily: BC, fontSize: '20px', fontWeight: 800, color: '#111', letterSpacing: '-0.5px' }}>{totalScore}</span>
                <div style={{
                  fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '99px',
                  background: repInfo.color + '15', color: repInfo.color, border: `1px solid ${repInfo.color}33`,
                }}>
                  {repInfo.tier}
                </div>
              </div>
            </div>
          </div>

          {/* Member info */}
          <div style={{ display: 'flex', gap: '6px', marginTop: '12px', flexWrap: 'wrap' }}>
            {[
              { icon: '📍', text: 'United States' },
              { icon: '📅', text: 'Member since 2024' },
              { icon: '✓',  text: 'Identity verified' },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                fontSize: '11px', color: '#666',
                background: '#f3f4f6', borderRadius: '99px', padding: '4px 10px',
              }}>
                <span style={{ fontSize: '10px' }}>{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats row */}
        <div style={{ background: '#fff', margin: '8px 0', borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex' }}>
            {[
              { label: 'Items Sold', value: soldCount.toString() },
              { label: 'Total Earned', value: `$${totalEarned.toFixed(0)}` },
              { label: 'Active', value: activeCount.toString() },
            ].map((stat, i) => (
              <div key={i} style={{
                flex: 1, textAlign: 'center', padding: '14px 8px',
                borderRight: i < 2 ? '1px solid #e5e7eb' : 'none',
              }}>
                <div style={{ fontFamily: BC, fontSize: '22px', fontWeight: 800, color: '#111', letterSpacing: '-0.5px' }}>{stat.value}</div>
                <div style={{ fontSize: '10px', color: '#888', marginTop: '2px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Feedback score breakdown */}
        <div style={{ background: '#fff', margin: '8px 0', padding: '16px', borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#111', marginBottom: '12px' }}>Feedback Score</div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '14px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                <StarIcon color={star.color} size={24} />
                <span style={{ fontFamily: BC, fontSize: '40px', fontWeight: 900, color: '#111', letterSpacing: '-2px', lineHeight: 1 }}>{totalScore}</span>
              </div>
              <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>{star.label}</div>
            </div>
            <div style={{ flex: 1 }}>
              {/* Positive bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700, width: '52px' }}>Positive</span>
                <div style={{ flex: 1, height: '8px', background: '#f3f4f6', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#16a34a', borderRadius: '99px', width: `${pct}%` }} />
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#111', width: '32px', textAlign: 'right' }}>{ebayRep.positive}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', color: '#888', fontWeight: 700, width: '52px' }}>Neutral</span>
                <div style={{ flex: 1, height: '8px', background: '#f3f4f6', borderRadius: '99px' }} />
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#111', width: '32px', textAlign: 'right' }}>0</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', color: '#E53238', fontWeight: 700, width: '52px' }}>Negative</span>
                <div style={{ flex: 1, height: '8px', background: '#f3f4f6', borderRadius: '99px', overflow: 'hidden' }}>
                  {ebayRep.negative > 0 && <div style={{ height: '100%', background: '#E53238', borderRadius: '99px', width: `${(ebayRep.negative / Math.max(ebayRep.feedback, 1)) * 100}%` }} />}
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#111', width: '32px', textAlign: 'right' }}>{ebayRep.negative}</span>
              </div>
            </div>
          </div>

          <div style={{ background: '#f9fafb', borderRadius: '10px', padding: '10px 12px', fontSize: '12px', color: '#555', border: '1px solid #e5e7eb' }}>
            {repInfo.desc}
          </div>
        </div>

        {/* Detailed Seller Ratings */}
        <div style={{ background: '#fff', margin: '8px 0', padding: '16px', borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#111', marginBottom: '4px' }}>Detailed Seller Ratings</div>
          <div style={{ fontSize: '11px', color: '#888', marginBottom: '12px' }}>Average over past 12 months</div>
          <DSRBar label="Accurate description" value={dsr.description} />
          <DSRBar label="Reasonable shipping cost" value={dsr.shipping} />
          <DSRBar label="Shipping speed" value={dsr.speed} />
          <DSRBar label="Communication" value={dsr.communication} />
        </div>

        {/* Recent feedback */}
        <div style={{ background: '#fff', margin: '8px 0 24px', padding: '16px', borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#111', marginBottom: '12px' }}>
            Recent Feedback
            <span style={{ fontSize: '12px', color: '#888', fontWeight: 400, marginLeft: '6px' }}>({feedback.length})</span>
          </div>

          {feedback.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#bbb', fontSize: '13px' }}>
              No feedback yet. Complete your first sale!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {feedback.slice(0, 12).map((entry, i) => (
                <div key={entry.id + i} style={{
                  padding: '12px 0',
                  borderBottom: i < Math.min(feedback.length, 12) - 1 ? '1px solid #f3f4f6' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{
                        width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                        background: entry.positive ? '#16a34a' : '#E53238',
                      }} />
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#3665F3' }}>{entry.buyer}</span>
                    </div>
                    <span style={{ fontSize: '11px', color: '#aaa', flexShrink: 0 }}>{entry.date}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#333', lineHeight: 1.4, paddingLeft: '14px', marginBottom: '3px' }}>
                    "{entry.comment}"
                  </div>
                  <div style={{ paddingLeft: '14px', fontSize: '11px', color: '#aaa' }}>
                    {entry.item} · ${entry.price.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
