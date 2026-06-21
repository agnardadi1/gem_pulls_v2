import type { Card, EbayRep } from '../../types'

const EBAY_FEE = 0.13

const BIDDERS = [
  { id: 'flipper',   name: 'flipperking_cards',  maxPct: 0.55 },
  { id: 'bargain',   name: 'BargainBob77',        maxPct: 0.78 },
  { id: 'collector', name: 'nba_collector_og',    maxPct: 1.05 },
  { id: 'grader',    name: 'CardGrader99',        maxPct: 1.12 },
  { id: 'grail',     name: 'GrailHunter_NBA',     maxPct: 1.40 },
]

export function ebayRepInfo(rep: EbayRep) {
  const total = rep.positive + rep.negative
  if (total < 5) return { tier: 'New Seller', color: '#767676', mult: 1.0, maxCard: 300, desc: 'New sellers rarely attract buyers for cards over $300.' }
  const pct = total > 0 ? (rep.positive / total) * 100 : 100
  if (pct >= 99) return { tier: 'Power Seller', color: '#E53238', mult: 1.10, maxCard: Infinity, desc: 'Everyone trusts you. +10% price bonus.' }
  if (pct >= 96) return { tier: 'Top Rated',    color: '#3665F3', mult: 1.05, maxCard: Infinity, desc: 'Strong reputation. +5% price bonus.' }
  if (pct >= 90) return { tier: 'Established',  color: '#00AC4E', mult: 1.00, maxCard: Infinity, desc: 'Good rep. Full buyer pool available.' }
  if (pct >= 80) return { tier: 'Developing',   color: '#F5AF02', mult: 0.97, maxCard: Infinity, desc: 'Building rep. Slight price discount.' }
  return              { tier: 'At Risk',       color: '#E53238', mult: 0.90, maxCard: 500,      desc: 'Low rep. High-value cards rarely attract buyers.' }
}

export function genEbayBids(card: Card, endTime: number, rep: EbayRep) {
  const mkt = card.actualEbayPrice
  const fmt = card.ebayFormat!
  const listPrice = card.ebayPrice!
  const repInfo = ebayRepInfo(rep)
  const now = Date.now()
  const dur = endTime - now
  const events: { t: number; user: string; amount: number; type: 'bid' | 'sale' }[] = []
  const isNew = repInfo.tier === 'New Seller'

  if (fmt === 'bin') {
    const pct = listPrice / mkt
    const chance = pct < 0.30 ? 1.0 : pct > 1.5 ? 0 : pct > 1.2 ? (isNew ? 0.02 : 0.10)
      : pct > 1.0 ? (isNew && mkt > 300 ? 0.08 : 0.40)
      : pct > 0.85 ? (isNew && mkt > 300 ? 0.20 : 0.80) : 0.95
    if (Math.random() < chance) {
      const buyer = pct < 0.5 ? 'flipperking_cards' : pct > 1.1 && Math.random() < 0.3 ? 'GrailHunter_NBA' : 'nba_collector_og'
      const timeMax = pct < 0.20 ? 0.005 : pct < 0.40 ? 0.02 : pct < 0.60 ? 0.06 : pct < 0.80 ? 0.15 : pct < 0.90 ? 0.35 : pct <= 1.0 ? 0.60 : 0.90
      events.push({ t: now + Math.random() * dur * timeMax, user: buyer, amount: listPrice, type: 'sale' })
    }
    return events
  }

  // Auction bidder pool
  let pool = []
  if (mkt > 30) pool.push(BIDDERS.find(b => b.id === 'flipper')!)
  if (listPrice / mkt < 0.55) pool.push(BIDDERS.find(b => b.id === 'bargain')!)
  if (!isNew || mkt < 150) pool.push(BIDDERS.find(b => b.id === 'collector')!)
  if (!isNew && Math.random() < 0.4) pool.push(BIDDERS.find(b => b.id === 'grader')!)
  if (!isNew && mkt > 500 && Math.random() < 0.22) pool.push(BIDDERS.find(b => b.id === 'grail')!)

  const active = pool
    .filter(Boolean)
    .map(b => ({ name: b.name, max: Math.round(b.maxPct * mkt * repInfo.mult * (0.85 + Math.random() * 0.30) * 100) / 100 }))
    .filter(b => b.max >= listPrice)
    .sort((a, z) => z.max - a.max)

  if (!active.length) return events

  const winner = active[0]
  const runner = active[1]

  let finalPrice: number
  if (runner) {
    const inc = Math.max(1, Math.round(runner.max * 0.05 * 100) / 100)
    finalPrice = Math.min(winner.max, runner.max + inc)
  } else {
    finalPrice = winner.max
  }
  finalPrice = Math.round(finalPrice * 100) / 100

  const pool2 = runner ? [winner, runner] : [winner]
  const steps = 2 + Math.floor(Math.random() * (active.length + 2))
  let cur = listPrice, lastBidder: string | null = null
  let tCur = now + dur * 0.05
  const tStep = dur * 0.88 / (steps + 1)

  for (let i = 0; i < steps; i++) {
    const bidder = pool2.find(b => b.name !== lastBidder && b.max > cur)
    if (!bidder) break
    const target = Math.round((cur + (finalPrice - cur) * ((i + 1) / steps) * (0.6 + Math.random() * 0.8)) * 100) / 100
    const bid = Math.min(Math.max(target, cur + 0.50), finalPrice - 0.50)
    if (bid <= cur) continue
    tCur = Math.min(tCur + tStep * (0.5 + Math.random()), now + dur * 0.93)
    events.push({ t: tCur, user: bidder.name, amount: Math.round(bid * 100) / 100, type: 'bid' })
    cur = bid
    lastBidder = bidder.name
  }

  if (lastBidder === winner.name && runner && runner.max > cur + 0.50) {
    const rb = Math.round(Math.min(runner.max, finalPrice - 0.50) * 100) / 100
    if (rb > cur) events.push({ t: now + dur * 0.95, user: runner.name, amount: rb, type: 'bid' })
  }

  events.push({ t: now + dur * (0.97 + Math.random() * 0.02), user: winner.name, amount: finalPrice, type: 'bid' })
  return events
}

export function resolveEbay(card: Card, rep: EbayRep): { soldPrice: number | null; failReason: string | null; newRep: EbayRep } {
  const mkt = card.actualEbayPrice
  const events = card.bidEvents || []
  const now = Date.now()
  const repInfo = ebayRepInfo(rep)
  let soldPrice: number | null = null
  let failReason: string | null = null

  if (card.ebayFormat === 'bin') {
    const sale = events.find(e => e.type === 'sale' && e.t <= now)
    if (sale) soldPrice = sale.amount
    else {
      const pct = (card.ebayPrice || 0) / mkt
      if (pct > 1.5) failReason = 'Priced too high — no buyers at this price'
      else if (pct > 1.2) failReason = 'Above market price — listing expired'
      else if (repInfo.tier === 'New Seller' && mkt > 300) failReason = 'New sellers rarely attract buyers for high-value cards'
      else failReason = 'No buyers found — try lowering the price or use Auction'
    }
  } else {
    const pastBids = events.filter(e => e.type === 'bid' && e.t <= now)
    if (!pastBids.length) {
      const pct = (card.ebayPrice || 0) / mkt
      if (pct > 0.75) failReason = 'Starting bid too high — no bids received'
      else if (repInfo.tier === 'New Seller' && mkt > 300) failReason = 'Low rep limited bidder interest'
      else failReason = 'No bids received — try a lower start price'
    } else {
      soldPrice = pastBids[pastBids.length - 1].amount
    }
  }

  // Update rep — only completed sales affect feedback, not failed listings
  const newRep = { ...rep }
  if (soldPrice !== null) {
    newRep.feedback += 1
    newRep.positive += 1
  }

  // Net payout after fee + shipping
  if (soldPrice !== null) {
    const fee = Math.round(soldPrice * EBAY_FEE * 100) / 100
    const ship = card.ebayShippingCost || 0
    soldPrice = Math.max(0, Math.round((soldPrice - fee - ship) * 100) / 100)
  }

  return { soldPrice, failReason, newRep }
}

export const EBAY_FEE_RATE = EBAY_FEE

export const SHIP_OPTIONS = [
  { id: 'free',      label: 'Free Shipping',     sub: 'USPS Ground Tracked', cost: 0 },
  { id: 'ground',    label: 'Ground Advantage',  sub: 'USPS · ~$4.95 charged', cost: 4.95 },
  { id: 'priority',  label: 'Priority Mail',     sub: 'USPS · ~$8.75 charged', cost: 8.75 },
]

export const DUR_OPTIONS_AUCTION = [
  { days: 1,  ms: 60 * 1000,        label: '1 minute',  note: 'Quick flip' },
  { days: 3,  ms: 3 * 60 * 1000,    label: '3 minutes', note: 'Balanced' },
  { days: 7,  ms: 7 * 60 * 1000,    label: '7 minutes', note: 'Max bids' },
]

export const DUR_OPTIONS_BIN = [
  { days: 3,  ms: 3 * 60 * 1000,    label: '3 minutes', note: 'Quick sale' },
  { days: 7,  ms: 7 * 60 * 1000,    label: '7 minutes', note: 'Balanced' },
  { days: 30, ms: 30 * 60 * 1000,   label: '30 minutes', note: 'Most exposure' },
]
