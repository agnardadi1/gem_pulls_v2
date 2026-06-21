import { useState, useEffect } from 'react'
import { usePhoneStore } from '../../store/usePhoneStore'
import { useGameStore } from '../../store/useGameStore'
import { useNotificationStore } from '../../store/useNotificationStore'
import { genIgOffers } from './igLogic'
import { RARITY_META } from '../PackMarket/packData'
import type { Card, IgOffer } from '../../types'
import type { Rarity } from '../PackMarket/packData'

type View = 'feed' | 'post-pick' | 'offers'

const IG_GRADIENT = 'linear-gradient(45deg, #f9ce34, #ee2a7b 40%, #6228d7)'
const BC = "'Barlow Condensed', sans-serif"

function IgAvatar({ color, user, size = 36 }: { color: string; user: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, fontSize: size * 0.4, fontWeight: 800, color: 'white',
      fontFamily: BC,
    }}>
      {user[0].toUpperCase()}
    </div>
  )
}

function RarityDot({ rarity }: { rarity: string }) {
  const meta = RARITY_META[(rarity as Rarity)] ?? RARITY_META.common
  return (
    <span style={{
      fontSize: '10px', fontWeight: 700, color: meta.textColor,
      letterSpacing: '0.5px', textTransform: 'uppercase',
    }}>
      {meta.label}
    </span>
  )
}

function timeLeft(expiresAt: number) {
  const ms = expiresAt - Date.now()
  if (ms <= 0) return 'Expired'
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  if (m > 0) return `${m}m ${s % 60}s`
  return `${s}s`
}

export default function InstagramApp() {
  const { closeApp } = usePhoneStore()
  const { collection, updateCard, addEarnings, spendBankroll, addCard, bankroll } = useGameStore()
  const pushNotif = useNotificationStore(s => s.push)
  const [view, setView] = useState<View>('feed')
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)
  const [, setTick] = useState(0)
  const [tradeConfirm, setTradeConfirm] = useState<{ offer: IgOffer; card: Card } | null>(null)

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 3000)
    return () => clearInterval(id)
  }, [])

  const posted = collection.filter(c => c.platform === 'instagram' && c.listed && !c.sold)
  const available = collection.filter(c => !c.sold && !c.listed)

  function postCard(card: Card) {
    const postedAt = Date.now()
    const offers = genIgOffers(card, postedAt)
    updateCard(card.cid, { listed: true, platform: 'instagram', igPostedAt: postedAt, igOffers: offers })
    const firstOffer = offers[0]
    if (firstOffer) {
      const delay = firstOffer.arrivedAt - Date.now()
      if (delay > 0) {
        setTimeout(() => {
          pushNotif('instagram', 'New DM!', `@${firstOffer.user} made an offer on ${card.playerName}`)
        }, delay)
      }
    }
    setView('feed')
  }

  function acceptMoneyOffer(card: Card, offer: IgOffer) {
    const updatedOffers = (card.igOffers || []).map(o =>
      o.id === offer.id
        ? { ...o, status: 'accepted' as const }
        : o.status === 'pending' ? { ...o, status: 'declined' as const } : o
    )
    updateCard(card.cid, { sold: true, listed: false, sellPrice: offer.amount!, platform: 'instagram', igOffers: updatedOffers })
    addEarnings(offer.amount!)
    pushNotif('instagram', 'Card Sold!', `${card.playerName} sold to @${offer.user} for $${offer.amount!.toFixed(2)}`)
    setSelectedCard(null)
    setView('feed')
  }

  function acceptTradeOffer(card: Card, offer: IgOffer) {
    if (!offer.tradeCard) return
    if (offer.cashSide === 'seller' && offer.amount && bankroll < offer.amount) return
    if (offer.cashSide === 'seller' && offer.amount) spendBankroll(offer.amount)
    if (offer.cashSide === 'buyer' && offer.amount) addEarnings(offer.amount)
    const updatedOffers = (card.igOffers || []).map(o =>
      o.id === offer.id
        ? { ...o, status: 'accepted' as const }
        : o.status === 'pending' ? { ...o, status: 'declined' as const } : o
    )
    updateCard(card.cid, { sold: true, listed: false, sellPrice: offer.tradeCard.value, platform: 'instagram', igOffers: updatedOffers })
    const newCard: Card = {
      cid: `trade-${Date.now()}`,
      playerName: offer.tradeCard.playerName,
      cardSet: offer.tradeCard.cardSet,
      variant: 'Base',
      rarity: offer.tradeCard.rarity as Card['rarity'],
      actualEbayPrice: offer.tradeCard.value,
      imageUrl: '',
      pulledAt: Date.now(),
      sold: false,
      listed: false,
      sellPrice: null,
    }
    addCard(newCard)
    pushNotif('instagram', 'Trade Complete!', `Got ${offer.tradeCard.playerName} from @${offer.user}`)
    setTradeConfirm(null)
    setSelectedCard(null)
    setView('feed')
  }

  function declineOffer(card: Card, offer: IgOffer) {
    const updatedOffers = (card.igOffers || []).map(o =>
      o.id === offer.id ? { ...o, status: 'declined' as const } : o
    )
    updateCard(card.cid, { igOffers: updatedOffers })
  }

  function unpostCard(card: Card) {
    updateCard(card.cid, { listed: false, platform: undefined, igOffers: undefined, igPostedAt: undefined })
    setSelectedCard(null)
    setView('feed')
  }

  function visibleOffers(card: Card) {
    const now = Date.now()
    return (card.igOffers || []).filter(o => o.arrivedAt <= now)
  }

  function pendingCount(card: Card) {
    const now = Date.now()
    return visibleOffers(card).filter(o => o.status === 'pending' && o.expiresAt > now).length
  }

  // ── TRADE CONFIRM MODAL ──
  if (tradeConfirm) {
    const { offer, card } = tradeConfirm
    const tc = offer.tradeCard!
    const canAfford = offer.cashSide !== 'seller' || !offer.amount || bankroll >= offer.amount
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fafafa' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', background: '#fff', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => setTradeConfirm(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span style={{ fontWeight: 700, fontSize: '16px' }}>Confirm Trade</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div style={{ flex: 1, background: '#fff', borderRadius: '12px', padding: '12px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: '#999', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>You give</div>
              {card.imageUrl
                ? <img src={card.imageUrl} alt={card.playerName} style={{ width: '100%', height: '80px', objectFit: 'contain', marginBottom: '6px' }} />
                : <div style={{ height: '80px', background: '#f3f4f6', borderRadius: '8px', marginBottom: '6px' }} />
              }
              <div style={{ fontWeight: 700, fontSize: '13px', fontFamily: BC }}>{card.playerName}</div>
              <div style={{ fontSize: '11px', color: '#666' }}>{card.cardSet}</div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#16a34a', fontFamily: BC, marginTop: '4px' }}>${card.actualEbayPrice.toFixed(2)}</div>
            </div>
            <div style={{ fontSize: '22px', color: '#999', flexShrink: 0 }}>⇄</div>
            <div style={{ flex: 1, background: '#fff', borderRadius: '12px', padding: '12px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: '#999', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>You get</div>
              <div style={{ height: '80px', background: '#f3f4f6', borderRadius: '8px', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5"><rect x="2" y="3" width="14" height="18" rx="2"/></svg>
              </div>
              <div style={{ fontWeight: 700, fontSize: '13px', fontFamily: BC }}>{tc.playerName}</div>
              <div style={{ fontSize: '11px', color: '#666' }}>{tc.cardSet}</div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#16a34a', fontFamily: BC, marginTop: '4px' }}>${tc.value.toFixed(2)}</div>
            </div>
          </div>

          {offer.amount && offer.cashSide && (
            <div style={{
              background: offer.cashSide === 'buyer' ? '#f0fdf4' : '#fff7ed',
              border: `1px solid ${offer.cashSide === 'buyer' ? '#86efac' : '#fed7aa'}`,
              borderRadius: '10px', padding: '12px 16px', marginBottom: '16px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: '13px', color: '#555' }}>
                {offer.cashSide === 'buyer' ? `@${offer.user} adds` : 'You add'}
              </span>
              <span style={{ fontFamily: BC, fontSize: '18px', fontWeight: 800, color: offer.cashSide === 'buyer' ? '#16a34a' : '#ea580c' }}>
                {offer.cashSide === 'buyer' ? '+' : '-'}${offer.amount.toFixed(2)}
              </span>
            </div>
          )}

          {!canAfford && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#dc2626' }}>
              Not enough bankroll to cover the ${offer.amount?.toFixed(2)} sweetener.
            </div>
          )}

          <button onClick={() => acceptTradeOffer(card, offer)} disabled={!canAfford} style={{
            width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
            background: canAfford ? IG_GRADIENT : '#e5e7eb',
            color: canAfford ? '#fff' : '#aaa',
            fontSize: '15px', fontWeight: 700, cursor: canAfford ? 'pointer' : 'default',
            fontFamily: BC, letterSpacing: '0.5px', marginBottom: '10px',
          }}>
            Accept Trade
          </button>
          <button onClick={() => setTradeConfirm(null)} style={{
            width: '100%', padding: '12px', borderRadius: '12px',
            border: '1px solid #e5e7eb', background: '#fff',
            fontSize: '14px', fontWeight: 600, cursor: 'pointer', color: '#333',
          }}>
            Cancel
          </button>
        </div>
      </div>
    )
  }

  // ── OFFERS VIEW ──
  if (view === 'offers' && selectedCard) {
    const card = collection.find(c => c.cid === selectedCard.cid) || selectedCard
    const offers = visibleOffers(card)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fafafa' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', background: '#fff', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => { setView('feed'); setSelectedCard(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '15px' }}>{card.playerName}</div>
            <div style={{ fontSize: '11px', color: '#888' }}>{offers.length} DM{offers.length !== 1 ? 's' : ''} · ${card.actualEbayPrice.toFixed(2)} market</div>
          </div>
          <button onClick={() => unpostCard(card)} style={{
            fontSize: '11px', color: '#888', background: 'none',
            border: '1px solid #e5e7eb', borderRadius: '99px', padding: '4px 10px', cursor: 'pointer',
          }}>
            Remove
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          {offers.length === 0 && (
            <div style={{ textAlign: 'center', color: '#aaa', marginTop: '40px', fontSize: '14px' }}>
              No offers yet — check back soon
            </div>
          )}
          {offers.map(offer => {
            const now = Date.now()
            const expired = offer.expiresAt < now && offer.status === 'pending'
            const effectiveStatus = expired ? 'expired' : offer.status
            return (
              <div key={offer.id} style={{
                background: '#fff', borderRadius: '14px', padding: '14px',
                border: `1px solid ${effectiveStatus === 'accepted' ? '#86efac' : '#e5e7eb'}`,
                marginBottom: '10px',
                opacity: effectiveStatus === 'declined' || effectiveStatus === 'expired' ? 0.5 : 1,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <IgAvatar color={offer.avatar} user={offer.user} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '13px' }}>@{offer.user}</div>
                    <div style={{ fontSize: '11px', color: '#999', fontStyle: 'italic' }}>"{offer.message}"</div>
                  </div>
                  {effectiveStatus === 'pending' && <div style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 700 }}>{timeLeft(offer.expiresAt)}</div>}
                  {effectiveStatus === 'accepted' && <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700 }}>✓ Accepted</div>}
                  {effectiveStatus === 'declined' && <div style={{ fontSize: '11px', color: '#999' }}>Declined</div>}
                  {effectiveStatus === 'expired' && <div style={{ fontSize: '11px', color: '#f59e0b' }}>Expired</div>}
                </div>

                {offer.type === 'money' ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f9fafb', borderRadius: '8px', padding: '10px 12px', marginBottom: effectiveStatus === 'pending' ? '10px' : 0 }}>
                    <span style={{ fontSize: '12px', color: '#666' }}>Cash offer</span>
                    <span style={{ fontFamily: BC, fontSize: '20px', fontWeight: 800, color: '#16a34a' }}>${offer.amount!.toFixed(2)}</span>
                  </div>
                ) : (
                  <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '10px 12px', marginBottom: effectiveStatus === 'pending' ? '10px' : 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: offer.cashSide ? '8px' : 0 }}>
                      <div>
                        <div style={{ fontFamily: BC, fontSize: '15px', fontWeight: 700 }}>{offer.tradeCard!.playerName}</div>
                        <div style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>{offer.tradeCard!.cardSet}</div>
                        <RarityDot rarity={offer.tradeCard!.rarity} />
                      </div>
                      <span style={{ fontFamily: BC, fontSize: '18px', fontWeight: 800, color: '#555' }}>${offer.tradeCard!.value.toFixed(2)}</span>
                    </div>
                    {offer.cashSide && offer.amount && (
                      <div style={{ paddingTop: '6px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: '#888' }}>
                          {offer.cashSide === 'buyer' ? `@${offer.user} adds cash` : 'You add cash'}
                        </span>
                        <span style={{ fontFamily: BC, fontSize: '14px', fontWeight: 700, color: offer.cashSide === 'buyer' ? '#16a34a' : '#ea580c' }}>
                          {offer.cashSide === 'buyer' ? '+' : '-'}${offer.amount.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {effectiveStatus === 'pending' && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => offer.type === 'trade' ? setTradeConfirm({ offer, card }) : acceptMoneyOffer(card, offer)}
                      style={{
                        flex: 2, padding: '10px', borderRadius: '8px', border: 'none',
                        background: IG_GRADIENT, color: '#fff',
                        fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: BC,
                      }}>
                      Accept
                    </button>
                    <button onClick={() => declineOffer(card, offer)} style={{
                      flex: 1, padding: '10px', borderRadius: '8px',
                      border: '1px solid #e5e7eb', background: '#fff',
                      fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: '#555',
                    }}>
                      Decline
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── PICK CARD VIEW ──
  if (view === 'post-pick') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fafafa' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', background: '#fff', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => setView('feed')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span style={{ fontWeight: 700, fontSize: '16px' }}>Post a Card</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          {available.length === 0 && (
            <div style={{ textAlign: 'center', color: '#aaa', marginTop: '60px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>No cards available</div>
              <div style={{ fontSize: '12px', marginTop: '6px' }}>Open some packs first!</div>
            </div>
          )}
          {available.map(card => {
            const meta = RARITY_META[(card.rarity as Rarity)] ?? RARITY_META.common
            return (
              <div key={card.cid} onClick={() => postCard(card)} style={{
                background: '#fff', borderRadius: '12px', padding: '12px',
                border: '1px solid #e5e7eb', marginBottom: '10px',
                display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer',
              }}>
                <div style={{ width: '52px', height: '68px', borderRadius: '6px', overflow: 'hidden', background: '#f3f4f6', flexShrink: 0 }}>
                  {card.imageUrl
                    ? <img src={card.imageUrl} alt={card.playerName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    : <div style={{ width: '100%', height: '100%', background: meta.color }} />
                  }
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: BC, fontSize: '16px', fontWeight: 700 }}>{card.playerName}</div>
                  <div style={{ fontSize: '11px', color: '#888', marginBottom: '2px' }}>{card.cardSet}</div>
                  <RarityDot rarity={card.rarity} />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: BC, fontSize: '18px', fontWeight: 800, color: '#16a34a' }}>${card.actualEbayPrice.toFixed(2)}</div>
                  <div style={{ fontSize: '10px', color: '#aaa' }}>market</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── FEED VIEW ──
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fafafa' }}>
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid #e5e7eb', background: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <button onClick={closeApp} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          <span style={{ fontSize: '14px', fontWeight: 600 }}>Home</span>
        </button>
        <span style={{
          fontFamily: "'Dancing Script', 'Segoe Script', cursive",
          fontSize: '22px', fontWeight: 700,
          background: IG_GRADIENT, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          Instagram
        </span>
        <button onClick={() => setView('post-pick')} style={{
          background: IG_GRADIENT, border: 'none', borderRadius: '8px',
          padding: '6px 12px', color: '#fff', fontSize: '13px', fontWeight: 700,
          cursor: 'pointer', fontFamily: BC,
        }}>
          + Post
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
        {posted.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80%', gap: '12px', textAlign: 'center' }}>
            <svg width="56" height="56" viewBox="0 0 60 60" fill="none">
              <defs><linearGradient id="ig-e" x1="0" y1="60" x2="60" y2="0"><stop stopColor="#f9ce34"/><stop offset="0.5" stopColor="#ee2a7b"/><stop offset="1" stopColor="#6228d7"/></linearGradient></defs>
              <rect width="60" height="60" rx="13" fill="url(#ig-e)"/>
              <rect x="15" y="15" width="30" height="30" rx="9" stroke="white" strokeWidth="3" fill="none"/>
              <circle cx="30" cy="30" r="7.5" stroke="white" strokeWidth="3" fill="none"/>
              <circle cx="40.5" cy="19.5" r="2" fill="white"/>
            </svg>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#333' }}>No posts yet</div>
            <div style={{ fontSize: '13px', color: '#aaa' }}>Post a card to get DM offers from collectors</div>
            <button onClick={() => setView('post-pick')} style={{
              marginTop: '8px', padding: '10px 24px', borderRadius: '10px', border: 'none',
              background: IG_GRADIENT, color: '#fff', fontSize: '14px', fontWeight: 700,
              cursor: 'pointer', fontFamily: BC,
            }}>
              Post a Card
            </button>
          </div>
        ) : (
          posted.map(card => {
            const meta = RARITY_META[(card.rarity as Rarity)] ?? RARITY_META.common
            const pending = pendingCount(card)
            const totalOffers = visibleOffers(card).length
            return (
              <div key={card.cid} style={{
                background: '#fff', borderRadius: '14px', overflow: 'hidden',
                border: '1px solid #e5e7eb', marginBottom: '14px',
              }}>
                <div style={{ position: 'relative', height: '180px', background: '#f3f4f6' }}>
                  {card.imageUrl
                    ? <img src={card.imageUrl} alt={card.playerName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    : <div style={{ width: '100%', height: '100%', background: meta.color }} />
                  }
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: meta.textColor }} />
                  {pending > 0 && (
                    <div style={{
                      position: 'absolute', top: '10px', right: '10px',
                      background: '#ee2a7b', borderRadius: '99px',
                      padding: '3px 8px', color: '#fff', fontSize: '11px', fontWeight: 700,
                    }}>
                      {pending} DM{pending !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
                <div style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <div style={{ fontFamily: BC, fontSize: '17px', fontWeight: 700 }}>{card.playerName}</div>
                    <div style={{ fontFamily: BC, fontSize: '18px', fontWeight: 800, color: '#16a34a' }}>${card.actualEbayPrice.toFixed(2)}</div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#888', marginBottom: '10px' }}>
                    {card.cardSet} · <RarityDot rarity={card.rarity} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: '#aaa' }}>{totalOffers} offer{totalOffers !== 1 ? 's' : ''}</span>
                    <button onClick={() => { setSelectedCard(card); setView('offers') }} style={{
                      padding: '7px 16px', borderRadius: '8px', border: 'none',
                      background: pending > 0 ? IG_GRADIENT : '#f3f4f6',
                      color: pending > 0 ? '#fff' : '#333',
                      fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: BC,
                    }}>
                      View DMs
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
