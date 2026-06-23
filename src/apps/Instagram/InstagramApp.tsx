import { useState, useEffect, useMemo, useRef } from 'react'
import { usePhoneStore } from '../../store/usePhoneStore'
import { useGameStore } from '../../store/useGameStore'
import { useNotificationStore } from '../../store/useNotificationStore'
import { genIgOffers, sellerRespond, followUpForUser, makeUnsolicitedOffer } from './igLogic'
import { RARITY_META, CARDS } from '../PackMarket/packData'
import type { Card, IgOffer } from '../../types'
import type { Rarity } from '../PackMarket/packData'

type Tab = 'home' | 'search' | 'activity' | 'profile'
type Overlay = null | 'post' | 'inbox' | 'thread' | 'edit'

const IG_GRADIENT = 'linear-gradient(45deg,#feda75,#fa7e1e 25%,#d62976 55%,#962fbf 78%,#4f5bd5)'
const BC = "'Barlow Condensed', sans-serif"

// ─── seeded RNG (stable per-card flavor) ───
function makeRng(str: string) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) }
  return () => {
    h += 0x6D2B79F5; let t = h
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const COMMENTS = [
  'absolute heater', 'this is clean', 'PC grail right here', "what's your asking?",
  'need this in my collection', 'grail status', 'incredible card', 'lmk if for sale',
  'so clean', 'dream card', 'centering is perfect', 'one of one vibes', 'gem mint fs',
  'this would complete my set', 'top tier pull', 'how much?',
]
const COMMENTERS = [
  'hoop_collector22', 'nba_grails', 'tradebinder_og', 'cardflip_king', 'wax_wizard',
  'pcards_daily', 'slab_society', 'court_kings_co', 'the_break_room', 'mint_or_bust',
]
const SELLERS = ['vintage_vault', 'slab_society', 'breakroom_bob', 'gem_mint_gary', 'the_card_plug', 'pristine_pulls', 'hobby_hank', 'wax_and_wane']

// ─── Explore deals: more cards in reach (and better haggling) as you grow ───
function dealTier(followers: number) {
  if (followers >= 2500) return { count: 16, maxVal: Infinity, label: 'Insider access' }
  if (followers >= 800)  return { count: 11, maxVal: Infinity, label: 'Trusted buyer' }
  if (followers >= 250)  return { count: 7,  maxVal: 800,      label: 'Growing reach' }
  if (followers >= 60)   return { count: 5,  maxVal: 350,      label: 'Getting noticed' }
  return                        { count: 3,  maxVal: 200,      label: 'New on the scene' }
}

const BUY_RARITY: Record<string, Card['rarity']> = { common: 'common', uncommon: 'uncommon', rare: 'rare', chase: 'legendary' }

export interface Deal {
  id: string
  cardId: string
  playerName: string
  cardSet: string
  variant: string
  rarity: string
  market: number   // also the seller's asking price — you bargain down from here
  seller: string
  sellerAvatar: string
  imageUrl: string
}

const SELLER_COLORS = ['#E53238', '#3665F3', '#a855f7', '#F5AF02', '#00AC4E', '#FB923C', '#06b6d4', '#ec4899']

interface BargainMsg {
  from: 'seller' | 'you'
  text: string
  cash?: number
  cardName?: string
  cardValue?: number
}
interface BargainSession {
  deal: Deal
  messages: BargainMsg[]
  round: number
  status: 'open' | 'accepted' | 'walked'
  counterPrice?: number   // seller's standing counter you can accept (cash only)
}

function genDeals(followers: number, seedNum: number): Deal[] {
  const tier = dealTier(followers)
  const rng = makeRng('deals-' + seedNum + '-' + tier.count)
  const pool = CARDS.filter(c => c.actualEbayPrice <= tier.maxVal)
  const arr = [...pool]
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1));[arr[i], arr[j]] = [arr[j], arr[i]] }
  return arr.slice(0, Math.min(tier.count, arr.length)).map((c, i) => {
    const si = Math.floor(rng() * SELLERS.length)
    return {
      id: `${seedNum}-${c.id}-${i}`, cardId: c.id, playerName: c.playerName, cardSet: c.cardSet,
      variant: c.variant, rarity: c.rarity, market: c.actualEbayPrice,
      seller: SELLERS[si], sellerAvatar: SELLER_COLORS[si % SELLER_COLORS.length], imageUrl: c.imageUrl,
    }
  })
}

function relTime(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60); if (m < 60) return `${m}m`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}
function expiresIn(ts: number) {
  const ms = ts - Date.now()
  if (ms <= 0) return 'expired'
  const s = Math.floor(ms / 1000), m = Math.floor(s / 60)
  return m > 0 ? `${m}m ${s % 60}s left` : `${s}s left`
}

// ─── tiny icon set ───
const I = {
  home: (a: boolean) => <svg width="26" height="26" viewBox="0 0 24 24" fill={a ? '#000' : 'none'} stroke="#000" strokeWidth={a ? 0 : 1.9} strokeLinejoin="round"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>,
  search: (a: boolean) => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth={a ? 2.6 : 1.9} strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/></svg>,
  heart: (a: boolean) => <svg width="26" height="26" viewBox="0 0 24 24" fill={a ? '#ed4956' : 'none'} stroke={a ? '#ed4956' : '#000'} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7.5-4.7-10-9.3C.6 8.5 2.2 5 5.5 5 7.7 5 9.2 6.3 12 9c2.8-2.7 4.3-4 6.5-4 3.3 0 4.9 3.5 3.5 6.7C19.5 16.3 12 21 12 21z"/></svg>,
  plus: () => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1.9" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="5.5"/><path d="M12 8v8M8 12h8"/></svg>,
  paperplane: () => <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"><path d="M22 3 11 13"/><path d="M22 3l-7 18-4-8-8-4z"/></svg>,
  comment: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1.8" strokeLinejoin="round"><path d="M21 11.5A8.5 8.5 0 0 1 12 20a9 9 0 0 1-4-.9L3 20l1.3-4A8.4 8.4 0 0 1 3.5 11.5 8.5 8.5 0 0 1 12 3a8.5 8.5 0 0 1 9 8.5z"/></svg>,
  share: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"><path d="M22 3 11 13"/><path d="M22 3l-7 18-4-8-8-4z"/></svg>,
  bookmark: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1.8" strokeLinejoin="round"><path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1z"/></svg>,
  back: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  grid: (a: boolean) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a ? '#000' : '#999'} strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="1.5"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/></svg>,
  tag: (a: boolean) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={a ? '#000' : '#999'} strokeWidth="1.8" strokeLinejoin="round"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z"/><circle cx="12" cy="9" r="2.2"/></svg>,
  verified: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="#3897f0"><path d="M12 1l2.4 2.1 3.1-.5 1.3 2.9 2.9 1.3-.5 3.1L23 12l-2.1 2.4.5 3.1-2.9 1.3-1.3 2.9-3.1-.5L12 23l-2.4-2.1-3.1.5-1.3-2.9L2.3 17l.5-3.1L1 12l2.1-2.4-.5-3.1L5.5 5.2 6.8 2.3l3.1.5z"/><path d="m8.5 12.2 2.3 2.3 4.5-4.7" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  menu: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>,
  dots: () => <svg width="22" height="22" viewBox="0 0 24 24" fill="#000"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>,
}

function Avatar({ color, label, size = 38, ring = false }: { color: string; label: string; size?: number; ring?: boolean }) {
  const isImg = color.startsWith('data:') || color.startsWith('/')
  const inner = (
    <div style={{
      width: size, height: size, borderRadius: '50%', overflow: 'hidden',
      background: isImg ? '#222' : color,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      fontSize: size * 0.42, fontWeight: 700, color: '#fff', fontFamily: BC,
      border: ring ? '2px solid #fff' : 'none',
    }}>
      {isImg ? <img src={color} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : label[0].toUpperCase()}
    </div>
  )
  if (!ring) return inner
  return (
    <div style={{ padding: '2px', borderRadius: '50%', background: IG_GRADIENT, flexShrink: 0 }}>{inner}</div>
  )
}

function RarityTag({ rarity }: { rarity: string }) {
  const meta = RARITY_META[(rarity as Rarity)] ?? RARITY_META.common
  return <span style={{ fontSize: '10px', fontWeight: 700, color: meta.textColor, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{meta.label}</span>
}

export default function InstagramApp() {
  const { closeApp } = usePhoneStore()
  const { collection, updateCard, addEarnings, spendCash, addCard, removeCard, bankroll, stats, igProfile, setIgProfile } = useGameStore()
  const pushNotif = useNotificationStore(s => s.push)

  const [tab, setTab] = useState<Tab>('home')
  const [overlay, setOverlay] = useState<Overlay>(null)
  const [activeOffer, setActiveOffer] = useState<{ offer: IgOffer; card: Card } | null>(null)
  const [tradeConfirm, setTradeConfirm] = useState<{ offer: IgOffer; card: Card } | null>(null)
  const [bargain, setBargain] = useState<BargainSession | null>(null)
  const [offerCash, setOfferCash] = useState(0)
  const [offerCardCid, setOfferCardCid] = useState<string | null>(null)
  const [cardPicker, setCardPicker] = useState(false)
  const [boughtDeals, setBoughtDeals] = useState<Set<string>>(new Set())
  const [dealSeed, setDealSeed] = useState(() => Math.floor(Date.now() / 60000))
  const [menuOpen, setMenuOpen] = useState(false)
  const [postMenu, setPostMenu] = useState<string | null>(null)
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [, setTick] = useState(0)
  const [counterMode, setCounterMode] = useState(false)
  const [counterCash, setCounterCash] = useState(0)
  const [counterResult, setCounterResult] = useState<{ offerId: string; price: number; accepted: boolean } | null>(null)

  useEffect(() => {
    const id = setInterval(() => {
      setTick(t => t + 1)
      const now = Date.now()
      const { collection: coll, updateCard: upd } = useGameStore.getState()
      const push = useNotificationStore.getState().push

      // 1) Buyers nudge you if you let a pending offer sit unanswered.
      coll.forEach(card => {
        if (card.sold) return
        const offers = card.igOffers
        if (!offers || !offers.length) return
        let changed = false
        const next = offers.map(o => {
          if (o.status !== 'pending' || o.arrivedAt > now || o.expiresAt <= now) return o
          const frac = (now - o.arrivedAt) / (o.expiresAt - o.arrivedAt)
          const want = frac > 0.75 ? 2 : frac > 0.4 ? 1 : 0
          const have = o.followUps?.length ?? 0
          if (want <= have) return o
          const adds: { text: string; at: number }[] = []
          for (let k = have; k < want; k++) adds.push({ text: followUpForUser(o.user), at: now })
          changed = true
          return { ...o, followUps: [...(o.followUps || []), ...adds] }
        })
        if (changed) upd(card.cid, { igOffers: next })
      })

      // 2) Occasionally a buyer DMs about a card you never even listed.
      const pendingUns = coll.filter(c => !c.sold && (c.igOffers || []).some(o => o.unsolicited && o.status === 'pending' && o.expiresAt > now)).length
      if (pendingUns < 2 && Math.random() < 0.04) {
        const candidates = coll.filter(c => !c.sold && !c.listed && !c.igPostedAt && !(c.igOffers && c.igOffers.length))
        if (candidates.length) {
          const card = candidates[Math.floor(Math.random() * candidates.length)]
          const offer = makeUnsolicitedOffer(card, now)
          upd(card.cid, { igOffers: [offer] })
          push('instagram', 'New DM', `@${offer.user} wants to buy your ${card.playerName}`)
        }
      }
    }, 2000)
    return () => clearInterval(id)
  }, [])

  // ── derived data ──
  const igPosts = collection.filter(c => !!c.igPostedAt && c.listed && !c.sold)
  const igSold = collection.filter(c => c.platform === 'instagram' && c.sold)
  const available = collection.filter(c => !c.sold && !c.listed && !c.igPostedAt)

  function visibleOffers(card: Card) {
    const now = Date.now()
    return (card.igOffers || []).filter(o => o.arrivedAt <= now)
  }
  const allConversations = useMemo(() => {
    const list: { offer: IgOffer; card: Card }[] = []
    // Posted cards AND any card with an unsolicited DM you never listed.
    collection
      .filter(c => !c.sold && c.igOffers && c.igOffers.length > 0)
      .forEach(card => visibleOffers(card).forEach(offer => list.push({ offer, card })))
    return list.sort((a, b) => {
      const ap = a.offer.status === 'pending' && a.offer.expiresAt > Date.now() ? 0 : 1
      const bp = b.offer.status === 'pending' && b.offer.expiresAt > Date.now() ? 0 : 1
      if (ap !== bp) return ap - bp
      return b.offer.arrivedAt - a.offer.arrivedAt
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collection])

  const unreadCount = allConversations.filter(c => c.offer.status === 'pending' && c.offer.expiresAt > Date.now()).length

  // Followers start at 0 and grow as you close deals (sales + trades + total earnings)
  const followers = igSold.length * 60 + Math.floor(stats.allEarned / 25)
  const totalPosts = igPosts.length + igSold.length
  const verified = igSold.length >= 8 || stats.allEarned >= 10000

  const tier = dealTier(followers)
  const deals = useMemo(
    () => genDeals(followers, dealSeed).filter(d => !boughtDeals.has(d.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dealSeed, tier.count, boughtDeals]
  )

  function openBargain(deal: Deal) {
    setBargain({
      deal, round: 0, status: 'open',
      messages: [{ from: 'seller', text: `Asking $${deal.market.toFixed(2)} for the ${deal.playerName}. Open to offers — cash, cards, or both.` }],
    })
    setOfferCash(Math.round(deal.market * 0.85))
    setOfferCardCid(null)
    setCardPicker(false)
  }

  function finalizeBuy(deal: Deal, cash: number, tradeCid: string | null) {
    if (bankroll < cash) return false
    spendCash(cash, { name: deal.playerName, note: 'Bought on Instagram', category: 'instagram' })
    if (tradeCid) removeCard(tradeCid)
    addCard({
      cid: `buy-${Date.now()}`,
      playerName: deal.playerName, cardSet: deal.cardSet, variant: deal.variant,
      rarity: BUY_RARITY[deal.rarity] ?? 'common',
      actualEbayPrice: deal.market, imageUrl: deal.imageUrl,
      pulledAt: Date.now(), sold: false, listed: false, sellPrice: null,
    })
    setBoughtDeals(s => new Set(s).add(deal.id))
    pushNotif('instagram', 'Purchase complete', `You bought ${deal.playerName} for $${cash.toFixed(2)}${tradeCid ? ' + a card' : ''}`)
    return true
  }

  function sendOffer() {
    if (!bargain || bargain.status !== 'open') return
    const tradeCard = offerCardCid ? collection.find(c => c.cid === offerCardCid) : null
    const cardValue = tradeCard ? tradeCard.actualEbayPrice : 0
    const offerValue = offerCash + cardValue
    if (offerValue <= 0 || offerCash > bankroll) return

    const round = bargain.round + 1
    const youMsg: BargainMsg = {
      from: 'you',
      text: tradeCard ? `$${offerCash.toFixed(2)} + my ${tradeCard.playerName}` : `$${offerCash.toFixed(2)}`,
      cash: offerCash, cardName: tradeCard?.playerName, cardValue,
    }
    const resp = sellerRespond({ asking: bargain.deal.market, offerValue, followers, round })
    const sellerMsg: BargainMsg = { from: 'seller', text: resp.message }

    if (resp.action === 'accept') {
      const ok = finalizeBuy(bargain.deal, offerCash, offerCardCid)
      if (!ok) { // safety: can't afford the cash they accepted
        setBargain({ ...bargain, round, messages: [...bargain.messages, youMsg, { from: 'seller', text: "Looks like your cash didn't clear — come back when you've got it." }] })
        return
      }
      setBargain({ ...bargain, round, status: 'accepted', messages: [...bargain.messages, youMsg, sellerMsg] })
    } else if (resp.action === 'counter') {
      setBargain({ ...bargain, round, counterPrice: resp.counter, messages: [...bargain.messages, youMsg, sellerMsg] })
    } else if (resp.action === 'walk') {
      setBargain({ ...bargain, round, status: 'walked', messages: [...bargain.messages, youMsg, sellerMsg] })
    } else {
      setBargain({ ...bargain, round, counterPrice: undefined, messages: [...bargain.messages, youMsg, sellerMsg] })
    }
  }

  function acceptCounter() {
    if (!bargain || bargain.counterPrice == null) return
    const price = bargain.counterPrice
    const ok = finalizeBuy(bargain.deal, price, null)
    if (!ok) {
      setBargain({ ...bargain, messages: [...bargain.messages, { from: 'seller', text: "You don't have the cash for that right now." }] })
      return
    }
    setBargain({ ...bargain, status: 'accepted', messages: [...bargain.messages, { from: 'you', text: `Accepted your counter — $${price.toFixed(2)}.` }, { from: 'seller', text: 'Perfect, sending it your way 📦' }] })
  }

  // ── actions ──
  function postCard(card: Card) {
    const postedAt = Date.now()
    const offers = genIgOffers(card, postedAt)
    updateCard(card.cid, { listed: true, platform: 'instagram', igPostedAt: postedAt, igOffers: offers })
    const first = offers[0]
    if (first) {
      const delay = first.arrivedAt - Date.now()
      if (delay > 0) setTimeout(() => pushNotif('instagram', 'New DM', `@${first.user} sent you an offer on ${card.playerName}`), delay)
    }
    setOverlay(null)
    setTab('home')
  }

  function settleOthers(card: Card, keepId: string) {
    return (card.igOffers || []).map(o =>
      o.id === keepId ? { ...o, status: 'accepted' as const }
        : o.status === 'pending' ? { ...o, status: 'declined' as const } : o)
  }

  function acceptMoney(card: Card, offer: IgOffer) {
    updateCard(card.cid, { sold: true, listed: false, sellPrice: offer.amount!, platform: 'instagram', igOffers: settleOthers(card, offer.id) })
    addEarnings(offer.amount!, { name: card.playerName, note: `Sold to @${offer.user}`, category: 'instagram' })
    pushNotif('instagram', 'Sale complete', `${card.playerName} sold to @${offer.user} for $${offer.amount!.toFixed(2)}`)
    setActiveOffer(null); setOverlay(null)
  }

  function acceptTrade(card: Card, offer: IgOffer) {
    if (!offer.tradeCard) return
    if (offer.cashSide === 'seller' && offer.amount && bankroll < offer.amount) return
    if (offer.cashSide === 'seller' && offer.amount) spendCash(offer.amount, { name: `@${offer.user}`, note: `Trade sweetener · ${card.playerName}`, category: 'instagram' })
    if (offer.cashSide === 'buyer' && offer.amount) addEarnings(offer.amount, { name: `@${offer.user}`, note: `Trade sweetener · ${card.playerName}`, category: 'instagram' })
    updateCard(card.cid, { sold: true, listed: false, sellPrice: offer.tradeCard.value, platform: 'instagram', igOffers: settleOthers(card, offer.id) })
    const real = CARDS.find(c => c.playerName === offer.tradeCard!.playerName && c.cardSet === offer.tradeCard!.cardSet)
    addCard({
      cid: `trade-${Date.now()}`,
      playerName: offer.tradeCard.playerName,
      cardSet: offer.tradeCard.cardSet,
      variant: real?.variant || 'Base',
      rarity: (offer.tradeCard.rarity as Card['rarity']),
      actualEbayPrice: offer.tradeCard.value,
      imageUrl: offer.tradeCard.imageUrl || real?.imageUrl || '',
      pulledAt: Date.now(), sold: false, listed: false, sellPrice: null,
    })
    pushNotif('instagram', 'Trade complete', `You received ${offer.tradeCard.playerName} from @${offer.user}`)
    setTradeConfirm(null); setActiveOffer(null); setOverlay(null)
  }

  function declineOffer(card: Card, offer: IgOffer) {
    updateCard(card.cid, { igOffers: (card.igOffers || []).map(o => o.id === offer.id ? { ...o, status: 'declined' as const } : o) })
  }

  function sendCounter(card: Card, offer: IgOffer, price: number) {
    const ratio = price / card.actualEbayPrice
    const acceptChance = ratio <= 0.95 ? 0.88 : ratio <= 1.0 ? 0.68 : ratio <= 1.1 ? 0.38 : 0.12
    const accepted = Math.random() < acceptChance
    if (accepted) {
      updateCard(card.cid, { sold: true, listed: false, sellPrice: price, platform: 'instagram', igOffers: settleOthers(card, offer.id) })
      addEarnings(price, { name: card.playerName, note: `Sold to @${offer.user}`, category: 'instagram' })
      pushNotif('instagram', 'Counter accepted!', `@${offer.user} accepted $${price.toFixed(2)} for ${card.playerName}`)
    } else {
      updateCard(card.cid, { igOffers: (card.igOffers || []).map(o => o.id === offer.id ? { ...o, status: 'declined' as const } : o) })
    }
    setCounterResult({ offerId: offer.id, price, accepted })
    setCounterMode(false)
  }

  function unpost(card: Card) {
    updateCard(card.cid, { listed: false, platform: undefined, igOffers: undefined, igPostedAt: undefined })
    setPostMenu(null)
  }

  function toggleLike(id: string) {
    setLikedPosts(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  // current live versions
  const liveActiveOffer = activeOffer ? (() => {
    const card = collection.find(c => c.cid === activeOffer.card.cid)
    const offer = card?.igOffers?.find(o => o.id === activeOffer.offer.id)
    return card && offer ? { card, offer } : activeOffer
  })() : null

  // ═══════════════════════════════════════════════════════
  //  OVERLAYS (full-screen, above tabs)
  // ═══════════════════════════════════════════════════════

  // ── TRADE CONFIRM ──
  if (tradeConfirm) {
    const { offer, card } = tradeConfirm
    const tc = offer.tradeCard!
    const canAfford = offer.cashSide !== 'seller' || !offer.amount || bankroll >= offer.amount
    return (
      <Sheet title="Confirm trade" onBack={() => setTradeConfirm(null)}>
        <div style={{ padding: '20px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '22px' }}>
            <TradeCardBox label="You give" name={card.playerName} set={card.cardSet} value={card.actualEbayPrice} img={card.imageUrl} />
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2" strokeLinecap="round"><path d="M7 8h13l-3-3M17 16H4l3 3"/></svg>
            <TradeCardBox label="You get" name={tc.playerName} set={tc.cardSet} value={tc.value} img={tc.imageUrl} />
          </div>
          {offer.amount && offer.cashSide && (
            <div style={{ background: offer.cashSide === 'buyer' ? '#f0fdf4' : '#fff7ed', border: `1px solid ${offer.cashSide === 'buyer' ? '#86efac' : '#fed7aa'}`, borderRadius: '12px', padding: '14px 16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#555' }}>{offer.cashSide === 'buyer' ? `@${offer.user} adds cash` : 'You add cash'}</span>
              <span style={{ fontFamily: BC, fontSize: '20px', fontWeight: 800, color: offer.cashSide === 'buyer' ? '#16a34a' : '#ea580c' }}>{offer.cashSide === 'buyer' ? '+' : '−'}${offer.amount.toFixed(2)}</span>
            </div>
          )}
          {!canAfford && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '12px', padding: '12px 14px', marginBottom: '16px', fontSize: '13px', color: '#dc2626' }}>Not enough bankroll for the ${offer.amount?.toFixed(2)} you'd add.</div>}
          <GradientButton disabled={!canAfford} onClick={() => acceptTrade(card, offer)}>Confirm trade</GradientButton>
          <button onClick={() => setTradeConfirm(null)} style={ghostBtn}>Cancel</button>
        </div>
      </Sheet>
    )
  }

  // ── BARGAIN: pick a card to add to your offer ──
  if (bargain && cardPicker) {
    return (
      <Sheet title="Add a card to your offer" onBack={() => setCardPicker(false)}>
        <div style={{ padding: '12px 14px' }}>
          {available.length === 0 ? (
            <Empty title="No cards to trade" sub="You need spare cards in your collection to add to an offer." />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {available.map(card => {
                const meta = RARITY_META[(card.rarity as Rarity)] ?? RARITY_META.common
                return (
                  <button key={card.cid} onClick={() => { setOfferCardCid(card.cid); setCardPicker(false) }} style={{ textAlign: 'left', background: '#fff', border: '1px solid #efefef', borderRadius: '14px', overflow: 'hidden', cursor: 'pointer', padding: 0 }}>
                    <div style={{ position: 'relative', height: '120px', background: '#f3f4f6' }}>
                      {card.imageUrl ? <img src={card.imageUrl} alt={card.playerName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <div style={{ width: '100%', height: '100%', background: meta.color }} />}
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: meta.textColor }} />
                    </div>
                    <div style={{ padding: '8px 10px 10px' }}>
                      <div style={{ fontFamily: BC, fontSize: '14px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.playerName}</div>
                      <div style={{ fontFamily: BC, fontSize: '14px', fontWeight: 800, color: '#16a34a' }}>${card.actualEbayPrice.toFixed(2)}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </Sheet>
    )
  }

  // ── BARGAIN: negotiation thread ──
  if (bargain) {
    const { deal, messages, status, counterPrice } = bargain
    const tradeCard = offerCardCid ? collection.find(c => c.cid === offerCardCid) : null
    const offerValue = offerCash + (tradeCard?.actualEbayPrice || 0)
    const tooMuchCash = offerCash > bankroll
    const canSend = status === 'open' && offerValue > 0 && !tooMuchCash
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff' }}>
        <TopBar>
          <button onClick={() => setBargain(null)} style={iconBtn}>{I.back()}</button>
          <Avatar color={deal.sellerAvatar} label={deal.seller} size={34} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '15px', fontWeight: 700 }}>{deal.seller}</div>
            <div style={{ fontSize: '11px', color: '#8e8e8e' }}>Seller · usually replies instantly</div>
          </div>
        </TopBar>

        <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* listing card */}
          <div style={{ alignSelf: 'flex-start', maxWidth: '80%', border: '1px solid #efefef', borderRadius: '16px', overflow: 'hidden', background: '#fafafa' }}>
            <div style={{ height: '140px', background: '#f3f4f6' }}>
              {deal.imageUrl && <img src={deal.imageUrl} alt={deal.playerName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
            </div>
            <div style={{ padding: '8px 12px' }}>
              <div style={{ fontFamily: BC, fontWeight: 700, fontSize: '15px' }}>{deal.playerName}</div>
              <div style={{ fontSize: '11px', color: '#8e8e8e' }}>{deal.cardSet}</div>
              <div style={{ fontFamily: BC, fontSize: '16px', fontWeight: 800, color: '#16a34a', marginTop: '2px' }}>Asking ${deal.market.toFixed(2)}</div>
            </div>
          </div>

          {messages.map((m, i) => (
            <div key={i} style={{ alignSelf: m.from === 'you' ? 'flex-end' : 'flex-start', maxWidth: '78%', background: m.from === 'you' ? '#3897f0' : '#efefef', color: m.from === 'you' ? '#fff' : '#000', borderRadius: m.from === 'you' ? '18px 18px 4px 18px' : '18px 18px 18px 4px', padding: '10px 14px', fontSize: '14px', lineHeight: 1.35 }}>
              {m.text}
            </div>
          ))}

          {status === 'accepted' && (
            <div style={{ alignSelf: 'center', textAlign: 'center', margin: '8px 0', padding: '14px 18px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '14px', width: '100%' }}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#16a34a' }}>Deal closed!</div>
              <div style={{ fontSize: '13px', color: '#15803d', marginTop: '2px' }}>{deal.playerName} is now in your binder.</div>
            </div>
          )}
          {status === 'walked' && (
            <div style={{ alignSelf: 'center', textAlign: 'center', margin: '8px 0', padding: '14px 18px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '14px', width: '100%' }}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#dc2626' }}>Seller walked away</div>
              <div style={{ fontSize: '13px', color: '#b91c1c', marginTop: '2px' }}>Build your reputation with sales and they'll deal more.</div>
            </div>
          )}
        </div>

        {/* composer / result actions */}
        {status === 'open' ? (
          <div style={{ borderTop: '1px solid #efefef', padding: '10px 14px 14px' }}>
            {counterPrice != null && (
              <button onClick={acceptCounter} disabled={bankroll < counterPrice} style={{ width: '100%', marginBottom: '10px', padding: '11px', borderRadius: '10px', border: 'none', background: bankroll < counterPrice ? '#efefef' : '#16a34a', color: bankroll < counterPrice ? '#aaa' : '#fff', fontSize: '14px', fontWeight: 700, fontFamily: BC, cursor: bankroll < counterPrice ? 'default' : 'pointer' }}>
                Accept their ${counterPrice.toFixed(2)}
              </button>
            )}
            {/* cash row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: '#8e8e8e', width: '60px' }}>Your cash</span>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', border: `1px solid ${tooMuchCash ? '#fca5a5' : '#dbdbdb'}`, borderRadius: '10px', padding: '8px 12px' }}>
                <span style={{ color: '#8e8e8e', fontFamily: BC, fontWeight: 700 }}>$</span>
                <input type="number" value={offerCash} min={0} onChange={e => setOfferCash(Math.max(0, Math.round(Number(e.target.value) || 0)))}
                  style={{ flex: 1, border: 'none', outline: 'none', fontFamily: BC, fontSize: '17px', fontWeight: 800, color: '#000', marginLeft: '4px', width: '100%' }} />
              </div>
            </div>
            {/* card chip */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', color: '#8e8e8e', width: '60px' }}>Your card</span>
              {tradeCard ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #dbdbdb', borderRadius: '10px', padding: '6px 10px' }}>
                  <div style={{ width: '26px', height: '34px', borderRadius: '4px', overflow: 'hidden', background: '#f3f4f6', flexShrink: 0 }}>
                    {tradeCard.imageUrl && <img src={tradeCard.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tradeCard.playerName}</div>
                    <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700 }}>${tradeCard.actualEbayPrice.toFixed(2)} value</div>
                  </div>
                  <button onClick={() => setOfferCardCid(null)} style={{ background: 'none', border: 'none', color: '#8e8e8e', fontSize: '18px', cursor: 'pointer', padding: '0 4px' }}>×</button>
                </div>
              ) : (
                <button onClick={() => setCardPicker(true)} style={{ flex: 1, textAlign: 'left', border: '1px dashed #cbcbcb', borderRadius: '10px', padding: '10px 12px', background: '#fafafa', color: '#3897f0', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                  + Add a card to sweeten the offer
                </button>
              )}
            </div>
            {/* total + send */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: '#8e8e8e' }}>Offer value</span>
              <span style={{ fontFamily: BC, fontSize: '18px', fontWeight: 800, color: '#000' }}>${offerValue.toFixed(2)}</span>
            </div>
            {tooMuchCash && <div style={{ fontSize: '12px', color: '#dc2626', marginBottom: '8px' }}>You only have ${bankroll.toFixed(2)} in cash.</div>}
            <GradientButton disabled={!canSend} onClick={sendOffer}>{bargain.round === 0 ? 'Send offer' : 'Send new offer'}</GradientButton>
          </div>
        ) : (
          <div style={{ borderTop: '1px solid #efefef', padding: '12px 14px' }}>
            <button onClick={() => setBargain(null)} style={{ ...ghostBtn, marginTop: 0 }}>Done</button>
          </div>
        )}
      </div>
    )
  }

  // ── POST PICKER ──
  if (overlay === 'post') {
    return (
      <Sheet title="New post" onBack={() => setOverlay(null)}>
        <div style={{ padding: '12px 14px' }}>
          {available.length === 0 ? (
            <Empty title="No cards to post" sub="Open packs to get cards you can sell here." />
          ) : (
            <>
              <div style={{ fontSize: '12px', color: '#8e8e8e', fontWeight: 600, padding: '4px 2px 12px' }}>Pick a card from your collection</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {available.map(card => {
                  const meta = RARITY_META[(card.rarity as Rarity)] ?? RARITY_META.common
                  return (
                    <button key={card.cid} onClick={() => postCard(card)} style={{ textAlign: 'left', background: '#fff', border: '1px solid #efefef', borderRadius: '14px', overflow: 'hidden', cursor: 'pointer', padding: 0 }}>
                      <div style={{ position: 'relative', height: '130px', background: '#f3f4f6' }}>
                        {card.imageUrl ? <img src={card.imageUrl} alt={card.playerName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <div style={{ width: '100%', height: '100%', background: meta.color }} />}
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: meta.textColor }} />
                      </div>
                      <div style={{ padding: '8px 10px 10px' }}>
                        <div style={{ fontFamily: BC, fontSize: '15px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{card.playerName}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                          <RarityTag rarity={card.rarity} />
                          <span style={{ fontFamily: BC, fontSize: '15px', fontWeight: 800, color: '#16a34a' }}>${card.actualEbayPrice.toFixed(0)}</span>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </Sheet>
    )
  }

  // ── INBOX (DM list) ──
  if (overlay === 'inbox') {
    return (
      <Sheet title={`${igProfile.handle}`} subtitle="Messages" onBack={() => setOverlay(null)}>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {allConversations.length === 0 ? (
            <Empty title="No messages yet" sub="Post a card and collectors will DM you offers." />
          ) : allConversations.map(({ offer, card }) => {
            const pending = offer.status === 'pending' && offer.expiresAt > Date.now()
            const preview = offer.type === 'trade'
              ? `Trade: ${offer.tradeCard!.playerName}${offer.amount ? (offer.cashSide === 'buyer' ? ` +$${offer.amount}` : ` (you +$${offer.amount})`) : ''}`
              : `Offer: $${offer.amount!.toFixed(2)}`
            return (
              <button key={offer.id} onClick={() => { setActiveOffer({ offer, card }); setCounterMode(false); setCounterResult(null); setOverlay('thread') }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                <Avatar color={offer.avatar} label={offer.user} size={54} ring={pending} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: pending ? 700 : 500, color: '#000' }}>{offer.user}</div>
                  <div style={{ fontSize: '13px', color: pending ? '#000' : '#8e8e8e', fontWeight: pending ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {preview} · {pending ? expiresIn(offer.expiresAt) : offer.status}
                  </div>
                </div>
                <div style={{ width: '42px', height: '54px', borderRadius: '6px', overflow: 'hidden', background: '#f3f4f6', flexShrink: 0 }}>
                  {card.imageUrl && <img src={card.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
                {pending && <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#3897f0', flexShrink: 0 }} />}
              </button>
            )
          })}
        </div>
      </Sheet>
    )
  }

  // ── DM THREAD ──
  if (overlay === 'thread' && liveActiveOffer) {
    const { offer, card } = liveActiveOffer
    const expired = offer.expiresAt < Date.now() && offer.status === 'pending'
    const status = expired ? 'expired' : offer.status
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff' }}>
        <TopBar>
          <button onClick={() => setOverlay('inbox')} style={iconBtn}>{I.back()}</button>
          <Avatar color={offer.avatar} label={offer.user} size={34} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '15px', fontWeight: 700 }}>{offer.user}</div>
            <div style={{ fontSize: '11px', color: '#8e8e8e' }}>Collector · Active now</div>
          </div>
        </TopBar>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', background: '#fff', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* shared post bubble */}
          <div style={{ alignSelf: 'flex-start', maxWidth: '78%' }}>
            <div style={{ fontSize: '11px', color: '#8e8e8e', marginBottom: '4px', paddingLeft: '4px' }}>{offer.unsolicited ? 'noticed your card' : 'shared your post'}</div>
            <div style={{ border: '1px solid #efefef', borderRadius: '16px', overflow: 'hidden', background: '#fafafa' }}>
              <div style={{ height: '150px', background: '#f3f4f6' }}>
                {card.imageUrl && <img src={card.imageUrl} alt={card.playerName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
              </div>
              <div style={{ padding: '8px 12px' }}>
                <div style={{ fontFamily: BC, fontWeight: 700, fontSize: '15px' }}>{card.playerName}</div>
                <div style={{ fontSize: '11px', color: '#8e8e8e' }}>{card.cardSet} · est. ${card.actualEbayPrice.toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* message bubble */}
          <div style={{ alignSelf: 'flex-start', maxWidth: '78%', background: '#efefef', borderRadius: '18px 18px 18px 4px', padding: '10px 14px', fontSize: '14px', color: '#000' }}>
            {offer.message}
          </div>

          {/* offer bubble */}
          {(() => {
            const myCounter = counterResult?.offerId === offer.id ? counterResult : null
            const payStyle = offer.user.charCodeAt(0) % 2 === 0 ? 'apple' : 'paypal'
            const fmtAmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            return (
              <div style={{ alignSelf: 'flex-start', maxWidth: '85%', width: '100%' }}>
                {offer.type === 'money' ? (
                  // Apple Cash / PayPal style payment bubble
                  <div style={{ borderRadius: '20px', overflow: 'hidden', border: `1.5px solid ${status === 'accepted' ? '#86efac' : '#e0e0e0'}` }}>
                    {payStyle === 'apple' ? (
                      <div style={{ background: '#1c1c1e', padding: '18px 22px 22px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '14px' }}>
                          <svg width="14" height="17" viewBox="0 0 14 17" fill="white"><path d="M11.7 9c0-2.5 2.1-3.7 2.2-3.8-1.2-1.7-3-2-3.7-2-1.6-.1-3 .9-3.8.9-.8 0-2-.9-3.3-.9-1.7 0-3.2 1-4 2.4C-2.6 8.5-1.3 13 .3 15.5c.8 1.2 1.7 2.5 3 2.5 1.2-.1 1.6-.8 3.1-.8 1.5 0 1.8.8 3.1.8 1.3 0 2.1-1.2 2.9-2.4.6-.8 1-1.7 1.2-1.8-.1 0-2-.8-2-2.8zM9.4 2.6C10.1 1.8 10.5.7 10.3-.3c-1 .1-2.1.6-2.8 1.4-.6.7-1.1 1.7-.9 2.7 1 .1 2-.4 2.8-1.2z"/></svg>
                          <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '15px', fontWeight: 500 }}>Cash</span>
                        </div>
                        <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', fontSize: '46px', fontWeight: 200, color: '#fff', letterSpacing: '-2px', lineHeight: 1 }}>${fmtAmt(offer.amount!)}</div>
                        <div style={{ marginTop: '10px', fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>
                          {status === 'pending' ? expiresIn(offer.expiresAt) : status === 'accepted' ? '✓ Accepted' : status === 'expired' ? 'Expired' : 'Declined'}
                        </div>
                      </div>
                    ) : (
                      <div style={{ background: '#fff', padding: '18px 22px 22px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
                          <div style={{ display: 'flex' }}>
                            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#003087', zIndex: 1 }} />
                            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#009cde', marginLeft: '-8px' }} />
                          </div>
                          <span style={{ color: '#003087', fontSize: '15px', fontWeight: 700, letterSpacing: '-0.3px' }}>PayPal</span>
                        </div>
                        <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', fontSize: '46px', fontWeight: 300, color: '#003087', letterSpacing: '-2px', lineHeight: 1 }}>${fmtAmt(offer.amount!)}</div>
                        <div style={{ marginTop: '10px', fontSize: '12px', color: '#aaa' }}>
                          {status === 'pending' ? expiresIn(offer.expiresAt) : status === 'accepted' ? '✓ Accepted' : status === 'expired' ? 'Expired' : 'Declined'}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  // Trade offer bubble (original style)
                  <div style={{ border: '1.5px solid', borderColor: status === 'accepted' ? '#86efac' : '#dbdbdb', borderRadius: '16px', overflow: 'hidden' }}>
                    <div style={{ background: IG_GRADIENT, padding: '8px 14px', color: '#fff', fontSize: '12px', fontWeight: 700, letterSpacing: '0.3px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>TRADE OFFER</span>
                      {status === 'pending' && <span>{expiresIn(offer.expiresAt)}</span>}
                    </div>
                    <div style={{ padding: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontFamily: BC, fontWeight: 700, fontSize: '17px' }}>{offer.tradeCard!.playerName}</div>
                          <div style={{ fontSize: '11px', color: '#8e8e8e' }}>{offer.tradeCard!.cardSet}</div>
                          <RarityTag rarity={offer.tradeCard!.rarity} />
                        </div>
                        <span style={{ fontFamily: BC, fontSize: '20px', fontWeight: 800, color: '#555' }}>${offer.tradeCard!.value.toFixed(2)}</span>
                      </div>
                      {offer.cashSide && offer.amount && (
                        <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #efefef', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', color: '#8e8e8e' }}>{offer.cashSide === 'buyer' ? `@${offer.user} adds cash` : 'You add cash'}</span>
                          <span style={{ fontFamily: BC, fontSize: '17px', fontWeight: 800, color: offer.cashSide === 'buyer' ? '#16a34a' : '#ea580c' }}>{offer.cashSide === 'buyer' ? '+' : '−'}${offer.amount.toFixed(2)}</span>
                        </div>
                      )}
                      {status !== 'pending' && (
                        <div style={{ marginTop: '12px', textAlign: 'center', fontSize: '13px', fontWeight: 700, color: status === 'accepted' ? '#16a34a' : status === 'expired' ? '#f59e0b' : '#8e8e8e' }}>
                          {status === 'accepted' ? 'You accepted this offer' : status === 'expired' ? 'This offer expired' : 'You declined this offer'}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* follow-up nudges if you left them waiting */}
                {offer.followUps && offer.followUps.map((f, fi) => (
                  <div key={fi} style={{ marginTop: '8px', display: 'flex' }}>
                    <div style={{ background: '#efefef', color: '#000', borderRadius: '18px 18px 18px 4px', padding: '9px 13px', fontSize: '14px', lineHeight: 1.35, maxWidth: '85%' }}>
                      {f.text}
                    </div>
                  </div>
                ))}

                {/* counter result bubble */}
                {myCounter && (
                  <div style={{ marginTop: '10px', padding: '12px 14px', background: myCounter.accepted ? '#f0fdf4' : '#fef2f2', border: `1px solid ${myCounter.accepted ? '#86efac' : '#fca5a5'}`, borderRadius: '14px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: myCounter.accepted ? '#16a34a' : '#dc2626' }}>
                      {myCounter.accepted ? `@${offer.user} accepted your counter!` : `@${offer.user} passed on your counter.`}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '3px' }}>
                      {myCounter.accepted ? `Sold for $${myCounter.price.toFixed(2)}` : 'They stuck to their original offer price.'}
                    </div>
                  </div>
                )}

                {/* action buttons */}
                {status === 'pending' && !myCounter && (
                  counterMode ? (
                    <div style={{ marginTop: '10px' }}>
                      <div style={{ fontSize: '12px', color: '#8e8e8e', marginBottom: '6px', fontWeight: 600 }}>Your counter price</div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch', marginBottom: '8px' }}>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', border: '1px solid #dbdbdb', borderRadius: '10px', padding: '8px 12px' }}>
                          <span style={{ color: '#8e8e8e', fontFamily: BC, fontWeight: 700 }}>$</span>
                          <input type="number" value={counterCash} min={(offer.amount ?? 0) + 1}
                            onChange={e => setCounterCash(Math.max(0, Math.round(Number(e.target.value) || 0)))}
                            style={{ flex: 1, border: 'none', outline: 'none', fontFamily: BC, fontSize: '17px', fontWeight: 800, color: '#000', marginLeft: '4px', width: '100%' }} />
                        </div>
                        <GradientButton compact disabled={counterCash <= (offer.amount ?? 0)} onClick={() => sendCounter(card, offer, counterCash)}>Send</GradientButton>
                      </div>
                      <button onClick={() => setCounterMode(false)} style={{ ...ghostBtn, marginTop: 0 }}>Cancel</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                      <GradientButton onClick={() => offer.type === 'trade' ? setTradeConfirm({ offer, card }) : acceptMoney(card, offer)} compact>Accept</GradientButton>
                      {offer.type === 'money' && (
                        <button onClick={() => { setCounterMode(true); setCounterCash(Math.round(card.actualEbayPrice * 0.92)) }} style={{ ...ghostBtn, marginTop: 0, flex: 1 }}>Counter</button>
                      )}
                      <button onClick={() => declineOffer(card, offer)} style={{ ...ghostBtn, marginTop: 0, flex: 1 }}>Decline</button>
                    </div>
                  )
                )}
              </div>
            )
          })()}
        </div>

        {/* fake composer */}
        <div style={{ padding: '8px 14px 14px', borderTop: '1px solid #efefef', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ flex: 1, border: '1px solid #dbdbdb', borderRadius: '99px', padding: '9px 16px', fontSize: '13px', color: '#bbb' }}>Message...</div>
        </div>
      </div>
    )
  }

  // ── EDIT PROFILE ──
  if (overlay === 'edit') return <EditProfile profile={igProfile} onSave={(u) => { setIgProfile(u); setOverlay(null) }} onCancel={() => setOverlay(null)} />

  // ═══════════════════════════════════════════════════════
  //  MAIN TABBED SHELL
  // ═══════════════════════════════════════════════════════
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff', position: 'relative' }}>

      {/* ── TOP BAR per tab ── */}
      {tab === 'home' && (
        <TopBar>
          <span style={{ fontFamily: "'Dancing Script','Segoe Script',cursive", fontSize: '26px', fontWeight: 700, lineHeight: 1, color: '#000' }}>Instagram</span>
          <div style={{ flex: 1 }} />
          <button onClick={() => setOverlay('post')} style={iconBtn} aria-label="New post">{I.plus()}</button>
          <button onClick={() => setOverlay('inbox')} style={{ ...iconBtn, position: 'relative' }} aria-label="Messages">
            {I.paperplane()}
            {unreadCount > 0 && <Badge n={unreadCount} />}
          </button>
        </TopBar>
      )}
      {tab === 'search' && (
        <TopBar>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', background: '#efefef', borderRadius: '10px', padding: '9px 12px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8e8e8e" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search players & sets"
              style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '14px', color: '#000' }} />
            {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8e8e8e', fontSize: '16px' }}>×</button>}
          </div>
        </TopBar>
      )}
      {tab === 'activity' && <TopBar><span style={{ fontSize: '18px', fontWeight: 700 }}>Notifications</span></TopBar>}
      {tab === 'profile' && (
        <TopBar>
          <span style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>{igProfile.handle} {verified && I.verified()}</span>
          <div style={{ flex: 1 }} />
          <button onClick={() => setOverlay('post')} style={iconBtn}>{I.plus()}</button>
          <button onClick={() => setMenuOpen(v => !v)} style={iconBtn}>{I.menu()}</button>
        </TopBar>
      )}

      {/* profile menu dropdown */}
      {menuOpen && tab === 'profile' && (
        <>
          <div onClick={() => setMenuOpen(false)} style={{ position: 'absolute', inset: 0, zIndex: 40 }} />
          <div style={{ position: 'absolute', top: '52px', right: '12px', zIndex: 50, background: '#fff', borderRadius: '14px', boxShadow: '0 8px 30px rgba(0,0,0,0.18)', border: '1px solid #efefef', overflow: 'hidden', width: '190px' }}>
            <MenuItem onClick={() => { setMenuOpen(false); setOverlay('edit') }} label="Edit profile" />
            <MenuItem onClick={() => { setMenuOpen(false); setTab('home'); closeApp() }} label="Close app" danger />
          </div>
        </>
      )}

      {/* ── SCROLL CONTENT ── */}
      <div style={{ flex: 1, overflowY: 'auto', background: '#fff' }}>
        {tab === 'home' && <Feed posts={igPosts} liked={likedPosts} onLike={toggleLike} profile={igProfile} verified={verified}
          postMenu={postMenu} setPostMenu={setPostMenu} onUnpost={unpost} onOpenOffers={(card: Card) => { const o = visibleOffers(card)[0]; if (o) { setActiveOffer({ offer: o, card }); setCounterMode(false); setCounterResult(null); setOverlay('thread') } else { setOverlay('inbox') } }}
          visibleOffersCount={(c: Card) => visibleOffers(c).length} onPost={() => setOverlay('post')} />}

        {tab === 'search' && <Explore search={search} deals={deals} followers={followers} tierLabel={tier.label}
          onBargain={(d: Deal) => openBargain(d)} onRefresh={() => { setBoughtDeals(new Set()); setDealSeed(s => s + 1) }} />}

        {tab === 'activity' && <Activity conversations={allConversations} onOpen={(offer: IgOffer, card: Card) => { setActiveOffer({ offer, card }); setCounterMode(false); setCounterResult(null); setOverlay('thread') }} />}

        {tab === 'profile' && <Profile profile={igProfile} verified={verified} posts={igPosts} sold={igSold} totalPosts={totalPosts} followers={followers}
          onEdit={() => setOverlay('edit')} onPost={() => setOverlay('post')} onOpenPost={(card: Card) => { const o = visibleOffers(card)[0]; if (o) { setActiveOffer({ offer: o, card }); setCounterMode(false); setCounterResult(null); setOverlay('thread') } }} />}
      </div>

      {/* ── BOTTOM NAV ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', height: '50px', borderTop: '1px solid #efefef', background: '#fff', flexShrink: 0 }}>
        <NavBtn onClick={() => setTab('home')}>{I.home(tab === 'home')}</NavBtn>
        <NavBtn onClick={() => setTab('search')}>{I.search(tab === 'search')}</NavBtn>
        <NavBtn onClick={() => setOverlay('post')}>{I.plus()}</NavBtn>
        <NavBtn onClick={() => setTab('activity')}>
          <span style={{ position: 'relative' }}>{I.heart(tab === 'activity')}{unreadCount > 0 && <Badge n={unreadCount} small />}</span>
        </NavBtn>
        <NavBtn onClick={() => setTab('profile')}>
          <div style={{ outline: tab === 'profile' ? '2px solid #000' : 'none', outlineOffset: '1px', borderRadius: '50%' }}>
            <Avatar color={igProfile.avatar} label={igProfile.handle} size={26} />
          </div>
        </NavBtn>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
//  SUB-COMPONENTS
// ═══════════════════════════════════════════════════════

function Feed({ posts, liked, onLike, profile, verified, postMenu, setPostMenu, onUnpost, onOpenOffers, visibleOffersCount, onPost }: any) {
  const stories = useMemo(() => {
    const pool = ['hoop_collector22', 'nba_grails', 'tradebinder_og', 'wax_wizard', 'pcards_daily', 'slab_society', 'court_kings_co', 'mint_or_bust']
    const colors = ['#E53238', '#3665F3', '#a855f7', '#F5AF02', '#00AC4E', '#FB923C', '#06b6d4', '#ec4899']
    return pool.map((u, i) => ({ user: u, color: colors[i % colors.length] }))
  }, [])

  return (
    <div>
      {/* stories */}
      <div style={{ display: 'flex', gap: '14px', padding: '12px 14px', overflowX: 'auto', borderBottom: '1px solid #efefef' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <Avatar color={profile.avatar} label={profile.handle} size={58} />
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: '20px', height: '20px', borderRadius: '50%', background: '#3897f0', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '15px', fontWeight: 700, lineHeight: 1 }}>+</div>
          </div>
          <span style={{ fontSize: '11px', color: '#000' }}>Your story</span>
        </div>
        {stories.map(s => (
          <div key={s.user} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flexShrink: 0, width: '62px' }}>
            <Avatar color={s.color} label={s.user} size={58} ring />
            <span style={{ fontSize: '11px', color: '#000', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '62px' }}>{s.user}</span>
          </div>
        ))}
      </div>

      {posts.length === 0 ? (
        <div style={{ padding: '50px 30px', textAlign: 'center' }}>
          <div style={{ width: '70px', height: '70px', borderRadius: '50%', border: '2px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="#000" stroke="none"/></svg>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 300, marginBottom: '6px' }}>Share Your First Card</div>
          <div style={{ fontSize: '14px', color: '#8e8e8e', marginBottom: '18px' }}>Post a card and collectors will send you offers and trades.</div>
          <button onClick={onPost} style={{ background: '#3897f0', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 20px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>Create post</button>
        </div>
      ) : posts.map((card: Card) => {
        const rng = makeRng(card.cid)
        const meta = RARITY_META[(card.rarity as Rarity)] ?? RARITY_META.common
        const baseLikes = Math.round(card.actualEbayPrice * 0.4) + Math.floor(rng() * 90) + 14
        const offerCount = visibleOffersCount(card)
        const isLiked = liked.has(card.cid)
        const likes = baseLikes + (isLiked ? 1 : 0)
        const nComments = 1 + Math.floor(rng() * 3)
        const comments = Array.from({ length: nComments }, () => ({ u: COMMENTERS[Math.floor(rng() * COMMENTERS.length)], t: COMMENTS[Math.floor(rng() * COMMENTS.length)] }))
        return (
          <div key={card.cid} style={{ borderBottom: '1px solid #efefef', position: 'relative' }}>
            {/* header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px' }}>
              <Avatar color={profile.avatar} label={profile.handle} size={34} ring />
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700 }}>{profile.handle}</span>
                {verified && I.verified()}
              </div>
              <button onClick={() => setPostMenu(postMenu === card.cid ? null : card.cid)} style={iconBtn}>{I.dots()}</button>
            </div>
            {postMenu === card.cid && (
              <>
                <div onClick={() => setPostMenu(null)} style={{ position: 'fixed', inset: 0, zIndex: 30 }} />
                <div style={{ position: 'absolute', top: '46px', right: '12px', zIndex: 40, background: '#fff', borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.18)', border: '1px solid #efefef', width: '200px', overflow: 'hidden' }}>
                  <MenuItem label="Remove from Instagram" danger onClick={() => onUnpost(card)} />
                </div>
              </>
            )}

            {/* image */}
            <div onDoubleClick={() => onLike(card.cid)} style={{ position: 'relative', width: '100%', aspectRatio: '1/1', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {card.imageUrl ? <img src={card.imageUrl} alt={card.playerName} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : <div style={{ width: '100%', height: '100%', background: meta.color }} />}
              {offerCount > 0 && (
                <button onClick={() => onOpenOffers(card)} style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', borderRadius: '99px', padding: '6px 12px', color: '#fff', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3897f0' }} />{offerCount} offer{offerCount !== 1 ? 's' : ''}
                </button>
              )}
              {offerCount >= 2 && (
                <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', borderRadius: '99px', padding: '5px 10px' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="#ff6a1f"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
                  <span style={{ color: '#fff', fontSize: '11px', fontWeight: 800, letterSpacing: '0.3px' }}>Hot</span>
                </div>
              )}
            </div>

            {/* action bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '10px 14px 4px' }}>
              <button onClick={() => onLike(card.cid)} style={iconBtn}>{I.heart(isLiked)}</button>
              <button onClick={() => onOpenOffers(card)} style={iconBtn}>{I.comment()}</button>
              <button onClick={() => onOpenOffers(card)} style={iconBtn}>{I.share()}</button>
              <div style={{ flex: 1 }} />
              <button style={iconBtn}>{I.bookmark()}</button>
            </div>

            {/* likes + caption + comments */}
            <div style={{ padding: '0 14px 12px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>{likes.toLocaleString()} likes</div>
              <div style={{ fontSize: '14px', lineHeight: 1.4 }}>
                <span style={{ fontWeight: 700 }}>{profile.handle}</span>{' '}
                {card.playerName} — {card.cardSet}. {card.variant && card.variant !== 'Base' ? card.variant + '. ' : ''}
                <span style={{ color: '#00376b' }}>#cards #nba #{card.rarity} #forsale</span>
              </div>
              <div style={{ fontSize: '13px', color: '#8e8e8e', marginTop: '4px' }}>Asking ${card.actualEbayPrice.toFixed(2)} · open to trades</div>
              {offerCount > 0 && (
                <button onClick={() => onOpenOffers(card)} style={{ background: 'none', border: 'none', padding: '6px 0 0', color: '#8e8e8e', fontSize: '14px', cursor: 'pointer' }}>View all {offerCount} offer{offerCount !== 1 ? 's' : ''} in DMs</button>
              )}
              {comments.map((c, i) => (
                <div key={i} style={{ fontSize: '14px', marginTop: '3px' }}><span style={{ fontWeight: 700 }}>{c.u}</span> {c.t}</div>
              ))}
              <div style={{ fontSize: '11px', color: '#8e8e8e', marginTop: '6px', textTransform: 'uppercase' }}>{relTime(card.igPostedAt!)} ago</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Explore({ search, deals, followers, tierLabel, onBargain, onRefresh }: {
  search: string; deals: Deal[]; followers: number; tierLabel: string
  onBargain: (d: Deal) => void; onRefresh: () => void
}) {
  const filtered = search.trim()
    ? deals.filter(d => (d.playerName + ' ' + d.cardSet + ' ' + d.seller).toLowerCase().includes(search.toLowerCase()))
    : deals
  const nextTierAt = followers < 60 ? 60 : followers < 250 ? 250 : followers < 800 ? 800 : followers < 2500 ? 2500 : null

  return (
    <div>
      {/* reach banner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: '1px solid #efefef' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#d62976' }} />{tierLabel}
          </div>
          <div style={{ fontSize: '12px', color: '#8e8e8e', marginTop: '2px' }}>
            {nextTierAt ? `${(nextTierAt - followers).toLocaleString()} more followers = more listings & better haggling` : 'Top tier — sellers deal their lowest with you'}
          </div>
        </div>
        <button onClick={onRefresh} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#efefef', border: 'none', borderRadius: '99px', padding: '7px 12px', fontSize: '12px', fontWeight: 700, color: '#262626', cursor: 'pointer' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#262626" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>
          Refresh
        </button>
      </div>

      {filtered.length === 0 ? (
        <Empty title={search.trim() ? 'No listings match' : 'No listings right now'} sub={search.trim() ? 'Try another player or set.' : 'Refresh or grow your following for more.'} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '12px' }}>
          {filtered.map(d => {
            const meta = RARITY_META[(BUY_RARITY[d.rarity] as Rarity)] ?? RARITY_META.common
            return (
              <div key={d.id} style={{ background: '#fff', border: '1px solid #efefef', borderRadius: '14px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ position: 'relative', height: '130px', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {d.imageUrl ? <img src={d.imageUrl} alt={d.playerName} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : <div style={{ width: '100%', height: '100%', background: meta.color }} />}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: meta.textColor }} />
                </div>
                <div style={{ padding: '8px 10px 10px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontFamily: BC, fontSize: '15px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.playerName}</div>
                  <div style={{ fontSize: '10px', color: '#8e8e8e', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>@{d.seller}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                    <span style={{ fontSize: '10px', color: '#8e8e8e' }}>asking</span>
                    <span style={{ fontFamily: BC, fontSize: '18px', fontWeight: 800, color: '#000' }}>${d.market.toFixed(2)}</span>
                  </div>
                  <button onClick={() => onBargain(d)} style={{
                    marginTop: '8px', width: '100%', padding: '8px', borderRadius: '8px', border: 'none',
                    background: IG_GRADIENT, color: '#fff',
                    fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: BC, letterSpacing: '0.3px',
                  }}>
                    Make offer
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Activity({ conversations, onOpen }: any) {
  if (conversations.length === 0) return <Empty title="Activity On Instagram" sub="Likes and offers on your posts will show up here." />
  return (
    <div style={{ padding: '6px 0' }}>
      <div style={{ fontSize: '15px', fontWeight: 700, padding: '8px 16px' }}>New</div>
      {conversations.map(({ offer, card }: any) => {
        const pending = offer.status === 'pending' && offer.expiresAt > Date.now()
        return (
          <button key={offer.id} onClick={() => onOpen(offer, card)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
            <Avatar color={offer.avatar} label={offer.user} size={44} />
            <div style={{ flex: 1, fontSize: '14px', lineHeight: 1.35 }}>
              <span style={{ fontWeight: 700 }}>{offer.user}</span>{' '}
              {offer.type === 'trade' ? 'proposed a trade for ' : 'offered $' + offer.amount!.toFixed(2) + ' on '}
              <span style={{ fontWeight: 700 }}>{card.playerName}</span>.{' '}
              <span style={{ color: '#8e8e8e' }}>{pending ? expiresIn(offer.expiresAt) : offer.status}</span>
            </div>
            <div style={{ width: '44px', height: '44px', borderRadius: '6px', overflow: 'hidden', background: '#f3f4f6', flexShrink: 0 }}>
              {card.imageUrl && <img src={card.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
          </button>
        )
      })}
    </div>
  )
}

function Profile({ profile, verified, posts, sold, totalPosts, followers, onEdit, onPost, onOpenPost }: any) {
  const [gridTab, setGridTab] = useState<'posts' | 'sold'>('posts')
  const items: { card: Card; isSold: boolean }[] = gridTab === 'posts'
    ? posts.map((c: Card) => ({ card: c, isSold: false }))
    : sold.map((c: Card) => ({ card: c, isSold: true }))

  return (
    <div>
      {/* header */}
      <div style={{ padding: '14px 16px 6px', display: 'flex', alignItems: 'center', gap: '22px' }}>
        <Avatar color={profile.avatar} label={profile.handle} size={84} ring />
        <div style={{ flex: 1, display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
          <Stat n={totalPosts} label="Posts" />
          <Stat n={followers >= 1000 ? (followers / 1000).toFixed(1) + 'k' : followers} label="Followers" />
          <Stat n={sold.length} label="Sales" />
        </div>
      </div>
      {/* name + bio */}
      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>{profile.name} {verified && I.verified()}</div>
        <div style={{ fontSize: '13px', color: '#8e8e8e' }}>Sports Card Dealer</div>
        <div style={{ fontSize: '14px', whiteSpace: 'pre-line', marginTop: '4px', lineHeight: 1.4 }}>{profile.bio}</div>
      </div>
      {/* buttons */}
      <div style={{ display: 'flex', gap: '8px', padding: '0 16px 14px' }}>
        <button onClick={onEdit} style={profileBtn}>Edit profile</button>
        <button onClick={onPost} style={profileBtn}>New post</button>
      </div>
      {/* highlights */}
      <div style={{ display: 'flex', gap: '18px', padding: '4px 16px 14px', overflowX: 'auto' }}>
        {['Grails', 'Sales', 'PC', 'Mail Day'].map((h, i) => (
          <div key={h} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
            <div style={{ width: '58px', height: '58px', borderRadius: '50%', border: '1px solid #dbdbdb', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1.4">{
                i === 0 ? <path d="M6 9V3h12v6a6 6 0 0 1-12 0zM4 5h2M18 5h2M9 21h6M12 15v6" strokeLinecap="round" strokeLinejoin="round" />
                : i === 1 ? <><path d="M12 1v22" strokeLinecap="round" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeLinecap="round" /></>
                : i === 2 ? <path d="M12 21s-7-4.4-9.2-8.6C1.3 9.4 3 6 6 6c2 0 3.2 1.2 6 4 2.8-2.8 4-4 6-4 3 0 4.7 3.4 3.2 6.4C19 16.6 12 21 12 21z" strokeLinejoin="round" />
                : <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="m3 8 9 6 9-6" strokeLinecap="round" strokeLinejoin="round" /></>
              }</svg>
            </div>
            <span style={{ fontSize: '11px' }}>{h}</span>
          </div>
        ))}
      </div>
      {/* grid tabs */}
      <div style={{ display: 'flex', borderTop: '1px solid #efefef' }}>
        <button onClick={() => setGridTab('posts')} style={{ flex: 1, padding: '10px', background: 'none', border: 'none', borderBottom: gridTab === 'posts' ? '1.5px solid #000' : '1.5px solid transparent', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}>{I.grid(gridTab === 'posts')}</button>
        <button onClick={() => setGridTab('sold')} style={{ flex: 1, padding: '10px', background: 'none', border: 'none', borderBottom: gridTab === 'sold' ? '1.5px solid #000' : '1.5px solid transparent', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}>{I.tag(gridTab === 'sold')}</button>
      </div>
      {/* grid */}
      {items.length === 0 ? (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#8e8e8e', fontSize: '14px' }}>
          {gridTab === 'posts' ? 'No active posts. Tap New post to list a card.' : 'No sales yet. Accept an offer to make your first sale.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2px' }}>
          {items.map(({ card, isSold }) => (
            <button key={card.cid} onClick={() => !isSold && onOpenPost(card)} style={{ position: 'relative', aspectRatio: '1/1', background: '#f3f4f6', overflow: 'hidden', border: 'none', padding: 0, cursor: isSold ? 'default' : 'pointer' }}>
              {card.imageUrl && <img src={card.imageUrl} alt={card.playerName} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isSold ? 0.55 : 1 }} />}
              {isSold && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.25)' }}>
                  <span style={{ color: '#fff', fontSize: '11px', fontWeight: 800, letterSpacing: '1px' }}>SOLD</span>
                  <span style={{ color: '#86efac', fontFamily: BC, fontSize: '15px', fontWeight: 800 }}>${(card.sellPrice || 0).toFixed(0)}</span>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
      <div style={{ height: '20px' }} />
    </div>
  )
}

function EditProfile({ profile, onSave, onCancel }: { profile: any; onSave: (u: any) => void; onCancel: () => void }) {
  const [handle, setHandle] = useState(profile.handle)
  const [name, setName] = useState(profile.name)
  const [bio, setBio] = useState(profile.bio)
  const [avatar, setAvatar] = useState(profile.avatar)
  const fileRef = useRef<HTMLInputElement>(null)
  const swatches = ['#7b2ff7', '#E53238', '#3665F3', '#00AC4E', '#F5AF02', '#ec4899', '#06b6d4', '#000000']

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return
    const r = new FileReader(); r.onload = ev => setAvatar(ev.target?.result as string); r.readAsDataURL(f)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff' }}>
      <TopBar>
        <button onClick={onCancel} style={{ ...iconBtn, fontSize: '15px', width: 'auto' }}>Cancel</button>
        <span style={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: '16px' }}>Edit profile</span>
        <button onClick={() => onSave({ handle: handle.trim() || profile.handle, name: name.trim() || profile.name, bio, avatar })} style={{ background: 'none', border: 'none', color: '#3897f0', fontWeight: 700, fontSize: '15px', cursor: 'pointer', padding: '6px' }}>Done</button>
      </TopBar>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickFile} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <Avatar color={avatar} label={handle} size={88} ring />
          <button onClick={() => fileRef.current?.click()} style={{ background: 'none', border: 'none', color: '#3897f0', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}>Change profile photo</button>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {swatches.map(s => (
              <button key={s} onClick={() => setAvatar(s)} style={{ width: '30px', height: '30px', borderRadius: '50%', background: s, border: avatar === s ? '3px solid #3897f0' : '2px solid #fff', boxShadow: '0 0 0 1px #dbdbdb', cursor: 'pointer' }} />
            ))}
          </div>
        </div>
        <Field label="Name" value={name} onChange={setName} />
        <Field label="Username" value={handle} onChange={setHandle} prefix="@" />
        <Field label="Bio" value={bio} onChange={setBio} multiline />
      </div>
    </div>
  )
}

// ─── shared bits ───
function TopBar({ children }: any) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderBottom: '1px solid #efefef', background: '#fff', flexShrink: 0, minHeight: '50px' }}>{children}</div>
}
function Sheet({ title, subtitle, onBack, children }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff' }}>
      <TopBar>
        <button onClick={onBack} style={iconBtn}>{I.back()}</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '16px', fontWeight: 700 }}>{title}</div>
          {subtitle && <div style={{ fontSize: '11px', color: '#8e8e8e' }}>{subtitle}</div>}
        </div>
      </TopBar>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>{children}</div>
    </div>
  )
}
function NavBtn({ onClick, children }: any) {
  return <button onClick={onClick} style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer' }}>{children}</button>
}
function Stat({ n, label }: { n: any; label: string }) {
  return <div><div style={{ fontSize: '18px', fontWeight: 700, lineHeight: 1.1 }}>{n}</div><div style={{ fontSize: '13px', color: '#262626' }}>{label}</div></div>
}
function MenuItem({ label, onClick, danger }: any) {
  return <button onClick={onClick} style={{ width: '100%', textAlign: 'left', padding: '13px 16px', background: 'none', border: 'none', borderBottom: '1px solid #f3f3f3', fontSize: '14px', fontWeight: 600, color: danger ? '#ed4956' : '#000', cursor: 'pointer' }}>{label}</button>
}
function Badge({ n, small }: { n: number; small?: boolean }) {
  return <span style={{ position: 'absolute', top: small ? '-2px' : '0', right: small ? '-4px' : '2px', minWidth: '16px', height: '16px', padding: '0 4px', borderRadius: '99px', background: '#ed4956', color: '#fff', fontSize: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #fff' }}>{n}</span>
}
function Empty({ title, sub }: { title: string; sub: string }) {
  return <div style={{ padding: '60px 30px', textAlign: 'center' }}><div style={{ fontSize: '17px', fontWeight: 700, marginBottom: '6px' }}>{title}</div><div style={{ fontSize: '14px', color: '#8e8e8e' }}>{sub}</div></div>
}
function GradientButton({ children, onClick, disabled, compact }: any) {
  return <button onClick={onClick} disabled={disabled} style={{ flex: compact ? 2 : undefined, width: compact ? undefined : '100%', padding: compact ? '11px' : '13px', borderRadius: '10px', border: 'none', background: disabled ? '#dbdbdb' : IG_GRADIENT, color: disabled ? '#999' : '#fff', fontSize: '15px', fontWeight: 700, cursor: disabled ? 'default' : 'pointer', fontFamily: BC, letterSpacing: '0.3px' }}>{children}</button>
}
function TradeCardBox({ label, name, set, value, img }: any) {
  return (
    <div style={{ flex: 1, background: '#fff', borderRadius: '14px', padding: '12px', border: '1px solid #efefef', textAlign: 'center' }}>
      <div style={{ fontSize: '10px', color: '#8e8e8e', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</div>
      {img ? <img src={img} alt={name} style={{ width: '100%', height: '86px', objectFit: 'contain', marginBottom: '6px' }} /> : <div style={{ height: '86px', background: '#f3f4f6', borderRadius: '8px', marginBottom: '6px' }} />}
      <div style={{ fontWeight: 700, fontSize: '13px', fontFamily: BC }}>{name}</div>
      <div style={{ fontSize: '11px', color: '#8e8e8e' }}>{set}</div>
      <div style={{ fontWeight: 800, fontSize: '15px', color: '#16a34a', fontFamily: BC, marginTop: '4px' }}>${value.toFixed(2)}</div>
    </div>
  )
}
function Field({ label, value, onChange, prefix, multiline }: any) {
  return (
    <div style={{ display: 'flex', alignItems: multiline ? 'flex-start' : 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid #efefef' }}>
      <label style={{ width: '90px', fontSize: '14px', fontWeight: 600, flexShrink: 0, paddingTop: multiline ? '4px' : 0 }}>{label}</label>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
        {prefix && <span style={{ color: '#8e8e8e', fontSize: '15px' }}>{prefix}</span>}
        {multiline
          ? <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} style={{ flex: 1, border: 'none', outline: 'none', resize: 'none', fontSize: '15px', fontFamily: 'inherit', color: '#000' }} />
          : <input value={value} onChange={e => onChange(e.target.value)} style={{ flex: 1, border: 'none', outline: 'none', fontSize: '15px', color: '#000' }} />}
      </div>
    </div>
  )
}

const iconBtn: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#000' }
const ghostBtn: React.CSSProperties = { width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #dbdbdb', background: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer', color: '#262626', marginTop: '10px' }
const profileBtn: React.CSSProperties = { flex: 1, padding: '7px', borderRadius: '8px', border: '1px solid #dbdbdb', background: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer', color: '#000' }
