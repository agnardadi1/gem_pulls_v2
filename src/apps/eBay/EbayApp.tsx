import { useState, useEffect, useRef } from 'react'
import { usePhoneStore } from '../../store/usePhoneStore'
import { useGameStore } from '../../store/useGameStore'
import { useNotificationStore } from '../../store/useNotificationStore'
import { genEbayBids, resolveEbay, ebayRepInfo, SHIP_OPTIONS, DUR_OPTIONS_AUCTION, DUR_OPTIONS_BIN, EBAY_FEE_RATE, makeEbayOffer, counterAccepted } from './ebayLogic'
import EbayProfile from './EbayProfile'
import type { Card, EbayOffer } from '../../types'

type View = 'listings' | 'pick-card' | 'listing-flow' | 'profile'

const BC = "'Barlow Condensed', sans-serif"

export default function EbayApp() {
  const { closeApp } = usePhoneStore()
  const { collection, ebayRep, updateCard, addEarnings } = useGameStore()
  const pushNotif = useNotificationStore(s => s.push)
  const [view, setView] = useState<View>('listings')
  const [, setTick] = useState(0)

  // Listing flow state
  const [listCard, setListCard] = useState<Card | null>(null)
  const [step, setStep] = useState(1)
  const [fmt, setFmt] = useState<'auction' | 'bin' | null>(null)
  const [price, setPrice] = useState<number | null>(null)
  const [ship, setShip] = useState<typeof SHIP_OPTIONS[0] | null>(null)
  const [dur, setDur] = useState<{ days: number; ms: number; label: string } | null>(null)
  const [bestOffer, setBestOffer] = useState(false)

  const schedTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  // Refresh listings every 4s to update countdowns + resolve completed
  useEffect(() => {
    const id = setInterval(() => {
      setTick(t => t + 1)
      checkAndResolve()
      tickBestOffers()
    }, 4000)
    return () => clearInterval(id)
  }, [collection, ebayRep])

  // Best Offer lifecycle: expire stale offers, occasionally surface a new one.
  function tickBestOffers() {
    const now = Date.now()
    const coll = useGameStore.getState().collection
    coll.forEach(c => {
      if (!(c.platform === 'ebay' && c.listed && !c.sold && c.ebayBestOffer)) return
      let offers = c.ebayOffers || []
      let changed = false
      offers = offers.map(o => {
        if (o.status === 'pending' && o.expiresAt <= now) { changed = true; return { ...o, status: 'expired' as const } }
        return o
      })
      const hasPending = offers.some(o => o.status === 'pending')
      const beforeEnd = now < (c.auctionEndTime || 0)
      if (!hasPending && offers.length < 3 && beforeEnd && Math.random() < 0.06) {
        const offer = makeEbayOffer(c.ebayPrice || 0, now)
        offers = [...offers, offer]
        changed = true
        useNotificationStore.getState().push('ebay', 'New offer', `${offer.user} offered $${offer.amount.toFixed(2)} for ${c.playerName}`)
      }
      if (changed) useGameStore.getState().updateCard(c.cid, { ebayOffers: offers })
    })
  }

  // On mount: resume any pending auctions (eBay listings only — never Instagram posts)
  useEffect(() => {
    collection.filter(c => c.platform === 'ebay' && c.listed && !c.sold).forEach(c => schedCard(c))
  }, [])

  function schedCard(c: Card) {
    const key = c.cid
    if (schedTimers.current[key]) return
    // For BIN: fire at the sale event time if one exists, not at listing end
    const saleEvt = c.ebayFormat === 'bin' ? (c.bidEvents || []).find(e => e.type === 'sale') : null
    const resolveAt = saleEvt ? saleEvt.t : (c.auctionEndTime || 0)
    const delay = resolveAt - Date.now()
    if (delay <= 0) { resolveCard(c); return }
    schedTimers.current[key] = setTimeout(() => {
      delete schedTimers.current[key]
      resolveCard(c)
    }, delay)
  }

  function resolveCard(c: Card) {
    const latest = useGameStore.getState().collection.find(x => x.cid === c.cid)
    if (!latest || latest.sold) return
    // Don't fail/close a listing while a Best Offer is still on the table.
    if ((latest.ebayOffers || []).some(o => o.status === 'pending' && o.expiresAt > Date.now())) return
    const repNow = useGameStore.getState().ebayRep
    const { soldPrice, failReason, newRep } = resolveEbay(latest, repNow)
    useGameStore.setState(() => ({ ebayRep: newRep }))
    if (soldPrice !== null) {
      updateCard(c.cid, { sold: true, listed: false, sellPrice: soldPrice, ebaySoldPrice: soldPrice, ebayFeeAmt: Math.round((latest.ebayPrice || 0) * EBAY_FEE_RATE * 100) / 100 })
      addEarnings(soldPrice, { name: latest.playerName, note: 'Sold on eBay', category: 'ebay' })
      pushNotif('ebay', 'Item Sold!', `${latest.playerName} sold for $${soldPrice.toFixed(2)}`)
    } else {
      updateCard(c.cid, { listed: false, ebayFailed: true, failReason })
    }
    setTick(t => t + 1)
  }

  function checkAndResolve() {
    const now = Date.now()
    collection.filter(c => c.platform === 'ebay' && c.listed && !c.sold && (c.auctionEndTime || 0) <= now).forEach(resolveCard)
  }

  // ── Best Offer handlers ──
  function sellViaOffer(card: Card, price: number) {
    const fee = Math.round(price * EBAY_FEE_RATE * 100) / 100
    const shipC = card.ebayShippingCost || 0
    const net = Math.max(0, Math.round((price - fee - shipC) * 100) / 100)
    const rep = useGameStore.getState().ebayRep
    useGameStore.setState({ ebayRep: { ...rep, feedback: rep.feedback + 1, positive: rep.positive + 1 } })
    updateCard(card.cid, {
      sold: true, listed: false, sellPrice: net, ebaySoldPrice: price, ebayFeeAmt: fee,
      ebayOffers: (card.ebayOffers || []).map(o => o.status === 'pending' ? { ...o, status: 'declined' as const } : o),
    })
    addEarnings(net, { name: card.playerName, note: 'Best Offer accepted', category: 'ebay' })
    pushNotif('ebay', 'Offer accepted — sold!', `${card.playerName} sold for $${price.toFixed(2)}`)
  }

  function acceptOffer(card: Card, offer: EbayOffer) {
    sellViaOffer(card, offer.amount)
  }

  function declineOffer(card: Card, offer: EbayOffer) {
    updateCard(card.cid, { ebayOffers: (card.ebayOffers || []).map(o => o.id === offer.id ? { ...o, status: 'declined' as const } : o) })
  }

  function counterOffer(card: Card, offer: EbayOffer, price: number) {
    if (counterAccepted(offer, card.ebayPrice || 0, price)) {
      sellViaOffer(card, price)
    } else {
      updateCard(card.cid, { ebayOffers: (card.ebayOffers || []).map(o => o.id === offer.id ? { ...o, status: 'declined' as const } : o) })
      pushNotif('ebay', 'Counter declined', `${offer.user} passed on your $${price.toFixed(2)} counter`)
    }
  }

  // ── Listing flow helpers ──
  function canAdvance() {
    if (step === 1) return !!fmt
    if (step === 2) return !!price && price > 0
    if (step === 3) return !!ship
    if (step === 4) return !!dur
    if (step === 5) {
      // Auctions: starting bid isn't the sale price — always allow listing
      if (fmt === 'auction') return true
      // BIN: block if payout would be negative
      const fee = Math.round((price || 0) * EBAY_FEE_RATE * 100) / 100
      return (price || 0) - fee - (ship?.cost || 0) >= 0
    }
    return false
  }

  function goNext() {
    if (!canAdvance()) return
    if (step === 5) { submitListing(); return }
    setStep(s => s + 1)
  }

  function goBack() {
    if (view === 'profile') { setView('listings'); return }
    if (step === 1) { setView('listings'); resetFlow(); return }
    setStep(s => s - 1)
  }

  function resetFlow() {
    setListCard(null); setStep(1); setFmt(null); setPrice(null); setShip(null); setDur(null); setBestOffer(false)
  }

  function startListing(card: Card) {
    setListCard(card); setStep(1); setFmt(null); setPrice(null); setShip(null); setDur(null); setBestOffer(false)
    setView('listing-flow')
  }

  function submitListing() {
    if (!listCard || !fmt || !price || !ship || !dur) return
    const endTime = Date.now() + dur.ms
    const cardWithDetails: Card = {
      ...listCard,
      listed: true,
      platform: 'ebay',
      ebayFormat: fmt,
      ebayPrice: price,
      ebayShipping: ship.id,
      ebayShippingCost: ship.cost,
      auctionEndTime: endTime,
      auctionCleared: false,
      ebayFailed: false,
      failReason: null,
    }
    cardWithDetails.bidEvents = genEbayBids(cardWithDetails, endTime, ebayRep)
    const useBO = fmt === 'bin' && bestOffer
    updateCard(listCard.cid, {
      listed: true, platform: 'ebay', ebayFormat: fmt, ebayPrice: price,
      ebayShipping: ship.id, ebayShippingCost: ship.cost,
      auctionEndTime: endTime, auctionCleared: false, ebayFailed: false, failReason: null,
      bidEvents: cardWithDetails.bidEvents,
      ebayBestOffer: useBO, ebayOffers: useBO ? [] : undefined,
    })
    schedCard(cardWithDetails)
    setView('listings')
    resetFlow()
  }

  // Listing data — all scoped to eBay platform so Instagram posts never leak in
  const active = collection.filter(c => c.platform === 'ebay' && c.listed && !c.sold && !c.ebayFailed)
  const sold = collection.filter(c => c.sold && c.platform === 'ebay' && !c.auctionCleared)
  const failed = collection.filter(c => c.platform === 'ebay' && c.ebayFailed && !c.auctionCleared)
  const available = collection.filter(c => !c.sold && !c.listed)

  const repInfo = ebayRepInfo(ebayRep)

  function fmtTimer(ms: number) {
    if (ms <= 0) return 'Ending...'
    const s = Math.floor(ms / 1000)
    const m = Math.floor(s / 60)
    const h = Math.floor(m / 60)
    if (h > 0) return `${h}h ${m % 60}m`
    if (m > 0) return `${m}m ${s % 60}s`
    return `${s}s`
  }

  const mktPrice = listCard?.actualEbayPrice || 0
  const estSalePrice = fmt === 'auction' ? mktPrice : (price || 0)
  const fee = Math.round(estSalePrice * EBAY_FEE_RATE * 100) / 100
  const shipCost = ship?.cost || 0
  const payout = Math.round((estSalePrice - fee - shipCost) * 100) / 100
  const durOpts = fmt === 'bin' ? DUR_OPTIONS_BIN : DUR_OPTIONS_AUCTION

  // ─────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff' }}>

      {/* Header — hidden on profile view (profile has its own header) */}
      {view !== 'profile' && <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px 10px',
        borderBottom: '1px solid #e5e7eb',
        flexShrink: 0,
        background: '#fff',
      }}>
        <button onClick={view === 'listings' ? closeApp : goBack}
          style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3665F3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          <span style={{ color: '#3665F3', fontSize: '14px', fontWeight: 600 }}>
            {view === 'listings' ? 'Home' : 'Back'}
          </span>
        </button>

        {/* eBay wordmark */}
        <svg viewBox="0 0 96 38" width="56" height="22" xmlns="http://www.w3.org/2000/svg">
          <text y="32" x="0"  fontSize="38" fontWeight="900" fontFamily="Arial Black,Arial" fill="#E53238">e</text>
          <text y="32" x="22" fontSize="38" fontWeight="900" fontFamily="Arial Black,Arial" fill="#0064D2">b</text>
          <text y="32" x="47" fontSize="38" fontWeight="900" fontFamily="Arial Black,Arial" fill="#F5AF02">a</text>
          <text y="32" x="70" fontSize="38" fontWeight="900" fontFamily="Arial Black,Arial" fill="#86B817">y</text>
        </svg>

        {/* Profile button — shows rep badge, taps to open profile */}
        <button
          onClick={() => setView('profile')}
          style={{
            fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '99px',
            background: repInfo.color + '18', color: repInfo.color, border: `1px solid ${repInfo.color}44`,
            fontFamily: BC, cursor: 'pointer',
          }}>
          {repInfo.tier}
        </button>
      </div>}

      {/* ── PROFILE VIEW ── */}
      {view === 'profile' && <EbayProfile onClose={() => setView('listings')} />}

      {/* ── LISTINGS VIEW ── */}
      {view === 'listings' && (
        <div style={{ flex: 1, overflowY: 'auto', background: '#f5f5f5' }}>

          {/* Sell button */}
          <div style={{ padding: '12px 16px 0' }}>
            <button onClick={() => setView('pick-card')}
              style={{
                width: '100%', padding: '14px', borderRadius: '14px',
                background: '#3665F3', color: '#fff', fontSize: '15px', fontWeight: 700,
                fontFamily: BC, letterSpacing: '0.5px', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: '0 4px 16px rgba(54,101,243,0.35)',
              }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              List a Card
            </button>
          </div>

          {/* Active listings */}
          {active.length > 0 && (
            <Section title="Active Listings">
              {active.map(c => {
                const remaining = (c.auctionEndTime || 0) - Date.now()
                const ending = remaining < 60000
                const pastBids = (c.bidEvents || []).filter(e => e.type === 'bid' && e.t <= Date.now())
                const curBid = pastBids.length ? pastBids[pastBids.length - 1].amount : c.ebayPrice || 0
                const pendingOffer = (c.ebayOffers || []).find(o => o.status === 'pending' && o.arrivedAt <= Date.now() && o.expiresAt > Date.now())
                return (
                  <div key={c.cid} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <ListingRow>
                    <img src={c.imageUrl} alt={c.playerName} style={{ width: '50px', height: '70px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#111', marginBottom: '2px' }}>{c.playerName}</div>
                      <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>{c.cardSet}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px',
                          background: c.ebayFormat === 'bin' ? '#F5AF0220' : '#E5323820',
                          color: c.ebayFormat === 'bin' ? '#c47f00' : '#E53238',
                        }}>
                          {c.ebayFormat === 'bin' ? 'BIN' : 'Auction'}
                        </span>
                        <span style={{ fontSize: '11px', color: ending ? '#E53238' : '#666', fontWeight: ending ? 700 : 400 }}>
                          ⏱ {fmtTimer(remaining)}
                        </span>
                      </div>
                      {c.ebayFormat !== 'bin' && pastBids.length > 0 && (
                        <div style={{ marginTop: '3px', fontSize: '10px', color: '#666' }}>
                          {pastBids[pastBids.length - 1].user}
                        </div>
                      )}
                      {c.ebayFormat === 'bin' && (
                        <div style={{ marginTop: '3px', fontSize: '10px', color: c.ebayBestOffer ? '#3665F3' : '#888', fontWeight: c.ebayBestOffer ? 600 : 400 }}>
                          {c.ebayBestOffer ? 'Fixed price · Best Offer on' : 'Fixed price · waiting for buyer'}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: BC, fontSize: '18px', fontWeight: 800, color: '#111' }}>${curBid.toFixed(2)}</div>
                      <div style={{ fontSize: '9px', color: '#888' }}>{c.ebayFormat === 'bin' ? 'BIN price' : 'Current bid'}</div>
                    </div>
                  </ListingRow>
                  {pendingOffer && (
                    <BestOfferPanel
                      offer={pendingOffer}
                      listPrice={c.ebayPrice || 0}
                      onAccept={() => acceptOffer(c, pendingOffer)}
                      onDecline={() => declineOffer(c, pendingOffer)}
                      onCounter={(p) => counterOffer(c, pendingOffer, p)}
                    />
                  )}
                  </div>
                )
              })}
            </Section>
          )}

          {/* Sold */}
          {sold.length > 0 && (
            <Section title="Sold">
              {sold.map(c => (
                <ListingRow key={c.cid} tint="#f0fdf4">
                  <img src={c.imageUrl} alt={c.playerName} style={{ width: '50px', height: '70px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0, opacity: 0.75 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#111', marginBottom: '2px' }}>{c.playerName}</div>
                    <div style={{ fontSize: '10px', color: '#16a34a', fontWeight: 700, marginBottom: '2px' }}>✓ Sold on eBay</div>
                    {c.ebaySoldPrice && (
                      <div style={{ fontSize: '10px', color: '#888' }}>
                        Sale ${c.ebaySoldPrice.toFixed(2)} · Fee −${(c.ebayFeeAmt || 0).toFixed(2)} · Ship −${(c.ebayShippingCost || 0).toFixed(2)}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: BC, fontSize: '20px', fontWeight: 900, color: '#16a34a' }}>+${(c.sellPrice || 0).toFixed(2)}</div>
                    <button onClick={() => updateCard(c.cid, { auctionCleared: true })}
                      style={{ marginTop: '4px', fontSize: '11px', color: '#3665F3', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: '2px 0' }}>
                      Clear
                    </button>
                  </div>
                </ListingRow>
              ))}
            </Section>
          )}

          {/* Failed */}
          {failed.length > 0 && (
            <Section title="Failed">
              {failed.map(c => (
                <ListingRow key={c.cid} tint="#fff5f5">
                  <img src={c.imageUrl} alt={c.playerName} style={{ width: '50px', height: '70px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0, opacity: 0.5 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#111', marginBottom: '2px' }}>{c.playerName}</div>
                    <div style={{ fontSize: '10px', color: '#E53238', fontWeight: 600, marginBottom: '2px' }}>✗ Listing failed</div>
                    <div style={{ fontSize: '10px', color: '#888' }}>{c.failReason}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <button onClick={() => startListing(c)}
                      style={{ fontSize: '11px', color: '#fff', background: '#3665F3', border: 'none', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontWeight: 700 }}>
                      Relist
                    </button>
                    <button onClick={() => updateCard(c.cid, { auctionCleared: true, ebayFailed: false })}
                      style={{ fontSize: '11px', color: '#E53238', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                      Clear
                    </button>
                  </div>
                </ListingRow>
              ))}
            </Section>
          )}

          {active.length === 0 && sold.length === 0 && failed.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', gap: '10px' }}>
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
              </svg>
              <div style={{ color: '#999', fontSize: '14px', fontWeight: 600 }}>No active listings</div>
              <div style={{ color: '#bbb', fontSize: '12px' }}>List a card to get started</div>
            </div>
          )}
        </div>
      )}

      {/* ── PICK CARD VIEW ── */}
      {view === 'pick-card' && (
        <div style={{ flex: 1, overflowY: 'auto', background: '#f5f5f5' }}>
          <div style={{ padding: '14px 16px 6px' }}>
            <div style={{ fontSize: '12px', color: '#888', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '2px' }}>
              Select a card to list
            </div>
          </div>
          {available.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 24px', color: '#bbb', fontSize: '13px' }}>
              No cards available to list.<br />Open some packs first!
            </div>
          ) : (
            <div style={{ padding: '8px 16px 24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {available.map(c => (
                <button key={c.cid} onClick={() => startListing(c)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px',
                    padding: '10px 12px', cursor: 'pointer', textAlign: 'left',
                    transition: 'border-color 0.15s',
                  }}>
                  <img src={c.imageUrl} alt={c.playerName} style={{ width: '44px', height: '62px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#111', marginBottom: '2px' }}>{c.playerName}</div>
                    <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>{c.cardSet}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '10px', color: '#888' }}>Market</div>
                    <div style={{ fontFamily: BC, fontSize: '18px', fontWeight: 800, color: '#111' }}>${c.actualEbayPrice.toFixed(2)}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── LISTING FLOW ── */}
      {view === 'listing-flow' && listCard && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f5f5f5', overflow: 'hidden' }}>

          {/* Progress bar */}
          <div style={{ background: '#fff', padding: '10px 16px 12px', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: '#888', fontWeight: 600 }}>Step {step} of 5</span>
              <span style={{ fontSize: '12px', color: '#3665F3', fontWeight: 700 }}>
                {['Format', 'Price', 'Shipping', 'Duration', 'Review'][step - 1]}
              </span>
            </div>
            <div style={{ height: '4px', background: '#e5e7eb', borderRadius: '99px', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: '#3665F3', borderRadius: '99px', width: `${(step / 5) * 100}%`, transition: 'width 0.3s ease' }} />
            </div>
          </div>

          {/* Card preview strip */}
          <div style={{
            background: '#fff', borderBottom: '1px solid #e5e7eb',
            padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0,
          }}>
            <img src={listCard.imageUrl} alt={listCard.playerName}
                 style={{ width: '36px', height: '50px', objectFit: 'cover', borderRadius: '5px', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#111' }}>{listCard.playerName}</div>
              <div style={{ fontSize: '11px', color: '#666' }}>{listCard.cardSet}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '10px', color: '#888' }}>Market value</div>
              <div style={{ fontFamily: BC, fontSize: '17px', fontWeight: 800, color: '#111' }}>${listCard.actualEbayPrice.toFixed(2)}</div>
            </div>
          </div>

          {/* Step content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>

            {/* Step 1: Format */}
            {step === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <StepLabel>Choose listing format</StepLabel>
                {[
                  { id: 'auction', title: 'Auction', sub: 'Bidders compete · highest bid wins', accent: '#E53238' },
                  { id: 'bin',     title: 'Buy It Now', sub: 'Fixed price · first buyer wins', accent: '#3665F3' },
                ].map(opt => (
                  <button key={opt.id} onClick={() => setFmt(opt.id as 'auction' | 'bin')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '14px',
                      background: '#fff', border: `2px solid ${fmt === opt.id ? opt.accent : '#e5e7eb'}`,
                      borderRadius: '14px', padding: '16px', cursor: 'pointer', textAlign: 'left',
                      transition: 'border-color 0.15s',
                    }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                      background: fmt === opt.id ? opt.accent : '#f3f4f6',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 0.15s',
                    }}>
                      {opt.id === 'auction'
                        ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={fmt === opt.id ? '#fff' : '#888'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                        : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={fmt === opt.id ? '#fff' : '#888'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                      }
                    </div>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#111', marginBottom: '2px' }}>{opt.title}</div>
                      <div style={{ fontSize: '12px', color: '#888' }}>{opt.sub}</div>
                    </div>
                    {fmt === opt.id && (
                      <div style={{ marginLeft: 'auto', color: opt.accent }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Step 2: Price */}
            {step === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <StepLabel>{fmt === 'auction' ? 'Set starting bid' : 'Set Buy It Now price'}</StepLabel>

                {fmt === 'auction' && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[{ label: '$0.99', val: 0.99 }, { label: '$9.99', val: 9.99 }, { label: '$24.99', val: 24.99 }].map(opt => (
                      <button key={opt.val} onClick={() => setPrice(opt.val)}
                        style={{
                          flex: 1, padding: '12px 8px', borderRadius: '12px', cursor: 'pointer',
                          background: price === opt.val ? '#E53238' : '#fff',
                          border: `2px solid ${price === opt.val ? '#E53238' : '#e5e7eb'}`,
                          color: price === opt.val ? '#fff' : '#111',
                          fontSize: '14px', fontWeight: 700, fontFamily: BC,
                          transition: 'all 0.15s',
                        }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}

                <div style={{ background: '#fff', borderRadius: '14px', border: '1.5px solid #e5e7eb', overflow: 'hidden' }}>
                  <div style={{ padding: '10px 14px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontSize: '11px', color: '#888', fontWeight: 600 }}>
                    {fmt === 'auction' ? 'OR ENTER CUSTOM START PRICE' : 'ENTER PRICE'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', gap: '8px' }}>
                    <span style={{ fontSize: '22px', fontWeight: 700, color: '#111', fontFamily: BC }}>$</span>
                    <input
                      type="number" step="0.01" min="0.01"
                      value={price || ''}
                      onChange={e => setPrice(parseFloat(e.target.value) || null)}
                      placeholder="0.00"
                      style={{
                        flex: 1, border: 'none', outline: 'none', fontSize: '22px', fontWeight: 700,
                        color: '#111', fontFamily: BC, background: 'transparent',
                      }}
                    />
                    <span style={{ fontSize: '11px', color: '#bbb' }}>USD</span>
                  </div>
                </div>

                {fmt === 'bin' && (
                  <button onClick={() => setBestOffer(v => !v)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: '#fff', border: `2px solid ${bestOffer ? '#3665F3' : '#e5e7eb'}`,
                      borderRadius: '14px', padding: '14px 16px', cursor: 'pointer', textAlign: 'left',
                      transition: 'border-color 0.15s',
                    }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#111', marginBottom: '2px' }}>Accept Best Offers</div>
                      <div style={{ fontSize: '11px', color: '#888' }}>Buyers can send offers below your price — you Accept, Counter, or Decline</div>
                    </div>
                    <div style={{ width: '44px', height: '26px', borderRadius: '99px', background: bestOffer ? '#3665F3' : '#d1d5db', flexShrink: 0, position: 'relative', transition: 'background 0.2s', marginLeft: '12px' }}>
                      <div style={{ position: 'absolute', top: '3px', left: bestOffer ? '21px' : '3px', width: '20px', height: '20px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
                    </div>
                  </button>
                )}

                <div style={{ background: '#fff3cd', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: '#856404', border: '1px solid #ffc10740' }}>
                  Market value: <strong>${listCard.actualEbayPrice.toFixed(2)}</strong>
                  {fmt === 'auction' && ' · Start low to attract more bidders'}
                </div>
              </div>
            )}

            {/* Step 3: Shipping */}
            {step === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <StepLabel>Choose shipping method</StepLabel>
                {SHIP_OPTIONS.map(opt => (
                  <button key={opt.id} onClick={() => setShip(opt)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: '#fff', border: `2px solid ${ship?.id === opt.id ? '#3665F3' : '#e5e7eb'}`,
                      borderRadius: '14px', padding: '14px 16px', cursor: 'pointer',
                      transition: 'border-color 0.15s',
                    }}>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#111', marginBottom: '2px' }}>{opt.label}</div>
                      <div style={{ fontSize: '11px', color: '#888' }}>{opt.sub}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: BC, fontSize: '17px', fontWeight: 800, color: opt.cost === 0 ? '#16a34a' : '#111' }}>
                        {opt.cost === 0 ? 'FREE' : `$${opt.cost.toFixed(2)}`}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Step 4: Duration */}
            {step === 4 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <StepLabel>{fmt === 'auction' ? 'Auction duration' : 'Listing duration'}</StepLabel>
                {durOpts.map(opt => (
                  <button key={opt.days} onClick={() => setDur(opt)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: '#fff', border: `2px solid ${dur?.days === opt.days ? '#3665F3' : '#e5e7eb'}`,
                      borderRadius: '14px', padding: '14px 16px', cursor: 'pointer',
                      transition: 'border-color 0.15s',
                    }}>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#111', marginBottom: '2px' }}>{opt.label}</div>
                      <div style={{ fontSize: '11px', color: '#888' }}>{opt.note}</div>
                    </div>
                    {dur?.days === opt.days && (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3665F3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Step 5: Review */}
            {step === 5 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <StepLabel>Review your listing</StepLabel>

                <div style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                  {(([
                    { label: 'Format',   val: fmt === 'auction' ? 'Auction' : 'Buy It Now' },
                    ...(fmt === 'bin' && bestOffer ? [{ label: 'Best Offers', val: 'Enabled', color: '#3665F3' }] : []),
                    { label: 'Price',    val: `$${(price || 0).toFixed(2)}` },
                    { label: 'Shipping', val: ship ? (ship.cost === 0 ? 'Free' : `$${ship.cost.toFixed(2)}`) : '—' },
                    { label: 'Duration', val: dur?.label || '—' },
                    { label: 'eBay Fee (13%)', val: `-$${fee.toFixed(2)}`, color: '#E53238' },
                    { label: 'You receive', val: `$${payout.toFixed(2)}`, color: payout > 0 ? '#16a34a' : '#E53238', bold: true },
                  ] as { label: string; val: string; color?: string; bold?: boolean }[]).map((row, i, arr) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '12px 16px',
                      borderBottom: i < arr.length - 1 ? '1px solid #f3f4f6' : 'none',
                    }}>
                      <span style={{ fontSize: '13px', color: '#666' }}>{row.label}</span>
                      <span style={{ fontSize: row.bold ? '17px' : '14px', fontWeight: row.bold ? 800 : 600, color: row.color || '#111', fontFamily: row.bold ? BC : 'inherit' }}>{row.val}</span>
                    </div>
                  )))}
                </div>

                {payout <= 0 && (
                  <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: '#E53238', fontWeight: 600 }}>
                    ⚠ After fees and shipping, you would receive nothing. Lower your price or choose free shipping.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Nav buttons */}
          <div style={{
            padding: '12px 16px 16px', background: '#fff', borderTop: '1px solid #e5e7eb',
            display: 'flex', gap: '10px', flexShrink: 0,
          }}>
            <button onClick={goBack}
              style={{
                flex: 1, padding: '14px', borderRadius: '12px', border: '1.5px solid #e5e7eb',
                background: '#fff', color: '#333', fontSize: '15px', fontWeight: 700,
                cursor: 'pointer', fontFamily: BC, letterSpacing: '0.3px',
              }}>
              Back
            </button>
            <button onClick={goNext} disabled={!canAdvance()}
              style={{
                flex: 2, padding: '14px', borderRadius: '12px', border: 'none',
                background: canAdvance() ? '#3665F3' : '#e5e7eb',
                color: canAdvance() ? '#fff' : '#aaa',
                fontSize: '15px', fontWeight: 700, cursor: canAdvance() ? 'pointer' : 'default',
                fontFamily: BC, letterSpacing: '0.5px',
                transition: 'background 0.2s, color 0.2s',
              }}>
              {step === 5 ? 'List Item' : 'Continue →'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ margin: '12px 16px 0' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: '#888', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>{children}</div>
    </div>
  )
}

function ListingRow({ children, tint }: { children: React.ReactNode; tint?: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      background: tint || '#fff', border: '1px solid #e5e7eb',
      borderRadius: '14px', padding: '10px 12px',
    }}>
      {children}
    </div>
  )
}

function StepLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: '16px', fontWeight: 700, color: '#111', marginBottom: '4px' }}>{children}</div>
}

const boBtn = (bg: string, color: string, border: string): React.CSSProperties => ({
  flex: 1, padding: '10px', borderRadius: '10px', border: border, background: bg, color,
  fontSize: '13px', fontWeight: 700, fontFamily: BC, cursor: 'pointer',
})

function BestOfferPanel({ offer, listPrice, onAccept, onDecline, onCounter }: {
  offer: EbayOffer; listPrice: number
  onAccept: () => void; onDecline: () => void; onCounter: (price: number) => void
}) {
  const [mode, setMode] = useState<'menu' | 'counter'>('menu')
  const [counterVal, setCounterVal] = useState(() => Math.round((offer.amount + listPrice) / 2))
  const pctOfAsk = listPrice > 0 ? Math.round((offer.amount / listPrice) * 100) : 0
  const counterBad = counterVal <= offer.amount || counterVal > listPrice

  return (
    <div style={{ background: '#fff', border: '1.5px solid #3665F3', borderRadius: '14px', padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#eef2ff', color: '#3665F3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '13px', fontFamily: BC, flexShrink: 0 }}>
          {offer.user[0].toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{offer.user}</div>
          <div style={{ fontSize: '10px', color: '#888' }}>sent an offer · {pctOfAsk}% of ask</div>
        </div>
        <div style={{ fontFamily: BC, fontSize: '20px', fontWeight: 800, color: '#3665F3', flexShrink: 0 }}>${offer.amount.toFixed(2)}</div>
      </div>

      {mode === 'menu' ? (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={onAccept} style={boBtn('#3665F3', '#fff', 'none')}>Accept</button>
          <button onClick={() => setMode('counter')} style={boBtn('#fff', '#3665F3', '1.5px solid #3665F3')}>Counter</button>
          <button onClick={onDecline} style={boBtn('#fff', '#666', '1.5px solid #e5e7eb')}>Decline</button>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch', marginBottom: '6px' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', border: '1.5px solid #e5e7eb', borderRadius: '10px', padding: '8px 12px' }}>
              <span style={{ color: '#888', fontFamily: BC, fontWeight: 700 }}>$</span>
              <input type="number" value={counterVal} min={offer.amount + 1} max={listPrice}
                onChange={e => setCounterVal(Math.max(0, Math.round(Number(e.target.value) || 0)))}
                style={{ flex: 1, border: 'none', outline: 'none', fontFamily: BC, fontSize: '17px', fontWeight: 800, color: '#111', marginLeft: '4px', width: '100%' }} />
            </div>
            <button disabled={counterBad} onClick={() => onCounter(counterVal)}
              style={{ ...boBtn('#3665F3', '#fff', 'none'), flex: 'none', padding: '10px 18px', opacity: counterBad ? 0.5 : 1, cursor: counterBad ? 'default' : 'pointer' }}>Send</button>
          </div>
          <div style={{ fontSize: '10px', color: '#888', marginBottom: '8px' }}>Counter above ${offer.amount.toFixed(2)} and up to your ask ${listPrice.toFixed(2)}.</div>
          <button onClick={() => setMode('menu')} style={boBtn('#fff', '#666', '1.5px solid #e5e7eb')}>Cancel</button>
        </div>
      )}
    </div>
  )
}
