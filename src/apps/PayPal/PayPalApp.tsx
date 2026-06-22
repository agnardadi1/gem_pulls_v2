import { usePayPalStore, type PayPalTransaction, type TxCategory } from '../../store/usePayPalStore'
import { useGameStore } from '../../store/useGameStore'
import { usePhoneStore } from '../../store/usePhoneStore'

const PP_BLUE = '#003087'
const PP_LIGHT = '#009cde'

function groupByDay(txs: PayPalTransaction[]) {
  const groups: { label: string; txs: PayPalTransaction[] }[] = []
  const map: Record<string, PayPalTransaction[]> = {}
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  for (const tx of txs) {
    const d = new Date(tx.date)
    let label: string
    if (d.toDateString() === today.toDateString()) label = 'Today'
    else if (d.toDateString() === yesterday.toDateString()) label = 'Yesterday'
    else label = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })

    if (!map[label]) { map[label] = []; groups.push({ label, txs: map[label] }) }
    map[label].push(tx)
  }
  return groups
}

// ── Category icon + color ───────────────────────────────────────────────
function CategoryIcon({ category }: { category: TxCategory }) {
  const base = { width: 44, height: 44, borderRadius: 14, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' } as const

  switch (category) {
    case 'pack':
      return (
        <div style={{ ...base, background: 'linear-gradient(135deg, #FB923C, #C2410C)' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16.5 9.4 7.5 4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.27 6.96 12 12.01l8.73-5.05"/><path d="M12 22.08V12"/>
          </svg>
        </div>
      )
    case 'ebay':
      return (
        <div style={{ ...base, background: 'white', border: '1px solid #eee' }}>
          <svg viewBox="0 0 60 30" width="34" height="17">
            <text y="22" x="0"  fontSize="20" fontWeight="900" fontFamily="Arial Black,Arial" fill="#E53238">e</text>
            <text y="22" x="14" fontSize="20" fontWeight="900" fontFamily="Arial Black,Arial" fill="#0064D2">b</text>
            <text y="22" x="29" fontSize="20" fontWeight="900" fontFamily="Arial Black,Arial" fill="#F5AF02">a</text>
            <text y="22" x="42" fontSize="20" fontWeight="900" fontFamily="Arial Black,Arial" fill="#86B817">y</text>
          </svg>
        </div>
      )
    case 'instagram':
      return (
        <div style={{ ...base, background: 'linear-gradient(135deg, #f9ce34, #ee2a7b 45%, #6228d7)' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.5"/><circle cx="17.5" cy="6.5" r="1.2" fill="white" stroke="none"/>
          </svg>
        </div>
      )
    case 'whatnot':
      return (
        <div style={{ ...base, background: '#FF5100' }}>
          <span style={{ color: 'white', fontWeight: 900, fontSize: 22, fontFamily: 'Arial Black, Arial' }}>W</span>
        </div>
      )
    case 'transfer':
      return (
        <div style={{ ...base, background: 'linear-gradient(135deg, #7c3aed, #4a1fa8)' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/>
          </svg>
        </div>
      )
    default:
      return (
        <div style={{ ...base, background: '#e5e7eb' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </div>
      )
  }
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function TxRow({ tx }: { tx: PayPalTransaction }) {
  const positive = tx.amount > 0
  const time = new Date(tx.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 0' }}>
      <CategoryIcon category={tx.category} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: '#111', marginBottom: 2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {tx.name}
        </div>
        <div style={{ fontSize: 12, color: '#999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {tx.note} · {time}
        </div>
      </div>
      <div style={{ fontWeight: 700, fontSize: 15, color: positive ? '#00a651' : '#d0021b', flexShrink: 0 }}>
        {positive ? '+' : '−'}${fmt(Math.abs(tx.amount))}
      </div>
    </div>
  )
}

export default function PayPalApp() {
  const { closeApp } = usePhoneStore()
  const bankroll = useGameStore(s => s.bankroll)
  const stats = useGameStore(s => s.stats)
  const transactions = usePayPalStore(s => s.transactions)

  const groups = groupByDay(transactions)
  const moneyIn = stats.earned
  const moneyOut = stats.spent

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f5f7fa', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* Header */}
      <div style={{ background: `linear-gradient(160deg, ${PP_BLUE} 0%, #001f5c 100%)`, padding: '18px 20px 26px', flexShrink: 0 }}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <button onClick={closeApp} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="20" height="24" viewBox="0 0 22 26" fill="none">
              <path d="M18.5 4.5C17.8 1.8 15.3 0 12.2 0H4.5C3.8 0 3.2.5 3.1 1.2L0 19.5c-.1.5.3 1 .8 1h4.5l1.1-7.2-.1.5c.1-.7.7-1.2 1.4-1.2h3c5.6 0 10-2.3 11.3-8.9 0-.2.1-.4.1-.6-.4-.2-.4-.4-.6-.6z" fill="#009cde"/>
              <path d="M19.1 5.1c-.2 0-.4-.1-.6-.1-.2 0-.4-.1-.6-.1h-8c-.3 0-.6.1-.8.3-.3.2-.5.5-.5.9L7.4 13.9l-.1.4c.1-.7.7-1.2 1.4-1.2h3c5.6 0 10-2.3 11.3-8.9 0-.2.1-.4.1-.6-.6-.3-2-.5-4-.5z" fill="#012169"/>
            </svg>
            <span style={{ color: 'white', fontWeight: 800, fontSize: 17, letterSpacing: -0.3 }}>PayPal</span>
          </div>
          <div style={{ width: 20 }} />
        </div>

        {/* Balance */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>
            Available Balance
          </div>
          <div style={{
            color: 'white', fontWeight: 800,
            fontSize: bankroll >= 100000 ? 40 : bankroll >= 10000 ? 46 : 54,
            letterSpacing: -2, lineHeight: 1,
          }}>
            ${fmt(bankroll)}
          </div>
        </div>

        {/* In / Out summary */}
        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: '10px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7M17 7H8M17 7v9"/></svg>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600 }}>Money in</span>
            </div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>${fmt(moneyIn)}</div>
          </div>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: '10px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M17 7L7 17M7 17h9M7 17V8"/></svg>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600 }}>Money out</span>
            </div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>${fmt(moneyOut)}</div>
          </div>
        </div>
      </div>

      {/* Activity header */}
      <div style={{ padding: '16px 20px 4px', flexShrink: 0 }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: '#111' }}>Activity</span>
      </div>

      {/* Transactions */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 24px' }}>
        {transactions.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: 50, color: '#aaa' }}>
            <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#dcdfe4" strokeWidth="1.5" style={{ marginBottom: 12 }}>
              <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>
            </svg>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#b8bdc4', marginBottom: 4 }}>No activity yet</div>
            <div style={{ fontSize: 13, color: '#cbd0d6', lineHeight: 1.4, maxWidth: 220, margin: '0 auto' }}>
              Buy packs, sell on eBay or Instagram, and your transactions show up here.
            </div>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.label}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#aab0b8', letterSpacing: 0.4, textTransform: 'uppercase', padding: '16px 0 4px' }}>
                {group.label}
              </div>
              <div style={{ background: 'white', borderRadius: 16, padding: '0 16px', boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
                {group.txs.map((tx, i) => (
                  <div key={tx.id}>
                    <TxRow tx={tx} />
                    {i < group.txs.length - 1 && <div style={{ height: 1, background: '#f3f4f6', margin: '0 -4px' }} />}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
