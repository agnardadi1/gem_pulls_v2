import type { Card, IgOffer } from '../../types'
import { CARDS } from '../PackMarket/packData'

const PERSONAS = [
  { user: 'cardflip_king',    avatar: '#E53238', style: 'lowball' },
  { user: 'hoop_collector22', avatar: '#3665F3', style: 'fair' },
  { user: 'nba_grails',       avatar: '#a855f7', style: 'collector' },
  { user: 'tradebinder_og',   avatar: '#F5AF02', style: 'trader' },
  { user: 'GrailHunter_IG',   avatar: '#00AC4E', style: 'grail' },
  { user: 'pcards_daily',     avatar: '#FB923C', style: 'fair' },
  { user: 'wax_wizard',       avatar: '#06b6d4', style: 'trader' },
  { user: 'quickflip_cody',   avatar: '#ec4899', style: 'flipper' },
  { user: 'sameday_sales',    avatar: '#14b8a6', style: 'flipper' },
  { user: 'lowball_larry',    avatar: '#f59e0b', style: 'lowball' },
]

// Map rarity from packData to Card rarity type
const rarityMap: Record<string, string> = { common: 'common', uncommon: 'uncommon', rare: 'rare', chase: 'legendary' }

const TRADE_CARDS = CARDS.map(c => ({
  playerName: c.playerName,
  cardSet: c.cardSet,
  rarity: rarityMap[c.rarity] ?? 'common',
  value: c.actualEbayPrice,
  imageUrl: c.imageUrl,
}))

const MESSAGES = {
  lowball: [
    "yo lmk if you wanna move this 👀",
    "I'll take it off your hands",
    "not a grail tbh, make an offer?",
    "interested, what's your bottom dollar?",
  ],
  fair: [
    "beautiful card! would love to add this to my PC",
    "been looking for one of these 🔥",
    "fair offer, hope we can work something out!",
    "solid card. let me know!",
  ],
  collector: [
    "this fits perfectly in my collection 🙏",
    "been hunting this one for months",
    "PC collector here, would treasure this!",
    "need this one bad, offering well",
  ],
  trader: [
    "got something you might want in return 👀",
    "check my offer, I think it's fair + cash",
    "1-for-1? I'll sweeten the deal",
    "trade bait! lmk what you think",
  ],
  grail: [
    "name your price, this is a grail for me 🏆",
    "I NEED this card. anything on your wishlist?",
    "been searching everywhere. offering top $",
    "this completes my collection. serious offer 🙌",
  ],
  flipper: [
    "can pay instantly, trying to flip it this week ⚡",
    "quick cash offer — can send right now if we agree",
    "doing a show this weekend, need it fast. deal?",
    "ready to buy today, no lowball games 🤝",
  ],
}

// Nudges sent if you leave a pending offer sitting too long.
const FOLLOWUPS: Record<string, string[]> = {
  lowball:   ["you still got this?", "offer still stands if you wanna move it 👀", "lmk, I can go a hair higher maybe"],
  fair:      ["still available? would love to lock it in", "any update on this one? 🙏", "hope you'll consider my offer!"],
  collector: ["please don't sell it out from under me 🙏", "still hoping to land this for my PC", "my offer's still good whenever you're ready"],
  trader:    ["my trade's still on the table 👀", "lmk if you wanna work something out", "can add a little more to sweeten it"],
  grail:     ["I'm serious about this one, still here 🏆", "name your number, I'll make it work", "still my #1 want — let's talk"],
  flipper:   ["cash is ready, just say the word ⚡", "still wanna grab this today if it's open", "tick tock — got a buyer lined up 😅"],
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function genIgOffers(card: Card, postedAt: number): IgOffer[] {
  const mkt = card.actualEbayPrice
  const offers: IgOffer[] = []
  const now = postedAt

  // How many offers based on card value — higher value = more attention
  const count = mkt >= 500 ? randInt(5, 7) : mkt >= 200 ? randInt(4, 6) : mkt >= 75 ? randInt(2, 4) : mkt >= 25 ? randInt(1, 3) : randInt(1, 2)
  const usedPersonas = new Set<string>()

  for (let i = 0; i < count; i++) {
    let persona = pick(PERSONAS)
    let attempts = 0
    while (usedPersonas.has(persona.user) && attempts < 10) {
      persona = pick(PERSONAS)
      attempts++
    }
    usedPersonas.add(persona.user)

    // Arrive staggered: 1–8 min after posting
    const arriveDelay = randInt(60, 480) * 1000
    const arrivedAt = now + arriveDelay
    const expiresAt = arrivedAt + randInt(10, 20) * 60 * 1000 // 10–20 min to respond

    const tradeChance = persona.style === 'trader' ? 0.78
      : persona.style === 'grail' ? 0.70
      : persona.style === 'flipper' ? 0.12   // flippers want quick cash, rarely trade
      : 0.42
    const isTrade = Math.random() < tradeChance

    if (isTrade) {
      // Only trade cards whose value is within 50%–160% of market — no fallback to random
      const candidates = TRADE_CARDS.filter(tc =>
        tc.value >= mkt * 0.5 && tc.value <= mkt * 1.6
      )
      if (candidates.length === 0) {
        // No sensible trade card available — fall through to money offer below
      } else {
        const tradeCard = pick(candidates)

        // Sweetener covers most of the gap: buyer pays 75–95%, seller pays 60–80%
        const diff = mkt - tradeCard.value
        let cashSide: 'buyer' | 'seller' | undefined
        let amount: number | undefined

        if (Math.abs(diff) > 10) {
          if (diff > 0) {
            cashSide = 'buyer'
            amount = Math.round(Math.abs(diff) * (0.75 + Math.random() * 0.20))
          } else {
            cashSide = 'seller'
            amount = Math.round(Math.abs(diff) * (0.60 + Math.random() * 0.20))
          }
        }

        offers.push({
          id: `${card.cid}-${i}`,
          user: persona.user,
          avatar: persona.avatar,
          type: 'trade',
          tradeCard: { ...tradeCard },
          cashSide,
          amount,
          message: pick(MESSAGES[persona.style as keyof typeof MESSAGES]),
          arrivedAt,
          expiresAt,
          status: 'pending',
        })
        continue
      }
    }

    // Money offer (default or fallback when no trade card matched)
    const pctMap: Record<string, number> = {
      lowball:   0.45 + Math.random() * 0.15,
      fair:      0.75 + Math.random() * 0.15,
      collector: 0.85 + Math.random() * 0.15,
      grail:     1.0  + Math.random() * 0.25,
      trader:    0.70 + Math.random() * 0.15,
      flipper:   0.60 + Math.random() * 0.15,  // quick cash, leaves room to flip
    }
    const pct = pctMap[persona.style] ?? 0.75
    const amount = Math.round(mkt * pct * 100) / 100

    offers.push({
      id: `${card.cid}-${i}`,
      user: persona.user,
      avatar: persona.avatar,
      type: 'money',
      amount,
      message: pick(MESSAGES[persona.style as keyof typeof MESSAGES]),
      arrivedAt,
      expiresAt,
      status: 'pending',
    })
  }

  return offers.sort((a, b) => a.arrivedAt - b.arrivedAt)
}

// ─── Buy-side bargaining ───
// You offer cash and/or one of your cards. The seller's willingness to come
// down off their asking price scales with your following (rep). Low rep =
// they hold near asking and reject lowballs; high rep = they deal.

const ACCEPT_MSGS = [
  "Deal — pleasure doing business 🤝", "Sold! I'll get it shipped.",
  "Yeah I can do that. It's yours.", "Works for me, let's lock it in.",
  "Alright, you've got yourself a card.",
]
const WALK_MSGS = [
  "We're too far apart. I'll keep it listed.", "Nah, I've got other buyers. Good luck.",
  "Gonna pass — appreciate the interest though.",
]

export interface SellerResponse {
  action: 'accept' | 'counter' | 'decline' | 'walk'
  counter?: number
  message: string
}

export function sellerRespond(opts: {
  asking: number; offerValue: number; followers: number; round: number
}): SellerResponse {
  const { asking, offerValue, followers, round } = opts
  // Rep discount: 0 followers → seller floor 92% of asking; 5k+ → 70%
  const rep = Math.min(followers / 5000, 1)
  const floor = asking * (0.92 - rep * 0.22)
  const ratio = offerValue / floor

  // Patience runs out after 3 rounds of haggling
  if (round > 3) {
    if (offerValue >= floor) return { action: 'accept', message: pick(ACCEPT_MSGS) }
    return { action: 'walk', message: pick(WALK_MSGS) }
  }

  if (offerValue >= floor) return { action: 'accept', message: pick(ACCEPT_MSGS) }

  // How much lowballing they tolerate before flat-out declining.
  // Low rep = intolerant (declines more), high rep = patient (counters).
  const declineRatio = followers < 100 ? 0.90 : followers < 500 ? 0.78 : followers < 1500 ? 0.68 : 0.58
  if (ratio < declineRatio) {
    const message = followers < 100
      ? "That's way too low — you're new around here, I need to see close to asking."
      : followers < 500
        ? "Too low for me, sorry. Come up a good bit."
        : "Can't do that one, but I'm listening if you're serious."
    return { action: 'decline', message }
  }

  // Counter somewhere between their floor and the asking price
  const counter = Math.round(Math.min(asking, (offerValue + floor) / 2 + asking * 0.04) * 100) / 100
  return { action: 'counter', counter, message: `Can't quite do that. I'll let it go for $${counter.toFixed(2)}.` }
}

// ─── Follow-up nudges + unsolicited DMs ───

const STYLE_BY_USER: Record<string, string> = Object.fromEntries(PERSONAS.map(p => [p.user, p.style]))

// A nudge in the tone of whoever made the offer, used when you leave it sitting.
export function followUpForUser(user: string): string {
  return pick(FOLLOWUPS[STYLE_BY_USER[user] ?? 'fair'] ?? FOLLOWUPS.fair)
}

const UNSOLICITED_MSGS = [
  "saw you pulled the {name} — not even listed but I'd buy it right now 👀",
  "a buddy showed me your {name}. serious cash offer if you'll let it go",
  "long shot, but would you sell the {name}? cash ready 🤝",
  "I know it's not posted but I had to ask about the {name}…",
]

// An out-of-the-blue cash offer on a card you never listed. Buyers are keen,
// so the number runs a touch above a typical money offer.
export function makeUnsolicitedOffer(card: Card, now: number): IgOffer {
  const buyers = PERSONAS.filter(p => p.style !== 'trader')
  const persona = pick(buyers)
  const pct = 0.82 + Math.random() * 0.26 // 82–108% of market
  const amount = Math.round(card.actualEbayPrice * pct * 100) / 100
  return {
    id: `uns-${card.cid}-${now}`,
    user: persona.user,
    avatar: persona.avatar,
    type: 'money',
    amount,
    message: pick(UNSOLICITED_MSGS).replace('{name}', card.playerName),
    arrivedAt: now,
    expiresAt: now + randInt(8, 15) * 60 * 1000,
    status: 'pending',
    unsolicited: true,
  }
}
