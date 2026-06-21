import type { Card, IgOffer } from '../../types'

const PERSONAS = [
  { user: 'cardflip_king',    avatar: '#E53238', style: 'lowball' },
  { user: 'hoop_collector22', avatar: '#3665F3', style: 'fair' },
  { user: 'nba_grails',       avatar: '#a855f7', style: 'collector' },
  { user: 'tradebinder_og',   avatar: '#F5AF02', style: 'trader' },
  { user: 'GrailHunter_IG',   avatar: '#00AC4E', style: 'grail' },
  { user: 'pcards_daily',     avatar: '#FB923C', style: 'fair' },
  { user: 'wax_wizard',       avatar: '#06b6d4', style: 'trader' },
]

const TRADE_CARDS = [
  { playerName: 'LeBron James',      cardSet: '2020 Prizm',         rarity: 'rare',      value: 85  },
  { playerName: 'Stephen Curry',     cardSet: '2021 Select',        rarity: 'ultra_rare', value: 120 },
  { playerName: 'Kevin Durant',      cardSet: '2019 Optic',         rarity: 'rare',      value: 65  },
  { playerName: 'Luka Dončić',       cardSet: '2022 Mosaic',        rarity: 'ultra_rare', value: 150 },
  { playerName: 'Jayson Tatum',      cardSet: '2021 Prizm',         rarity: 'uncommon',  value: 40  },
  { playerName: 'Nikola Jokić',      cardSet: '2020 Donruss',       rarity: 'rare',      value: 75  },
  { playerName: 'Joel Embiid',       cardSet: '2022 Hoops',         rarity: 'uncommon',  value: 35  },
  { playerName: 'Zion Williamson',   cardSet: '2019 Prizm RC',      rarity: 'ultra_rare', value: 200 },
  { playerName: 'Devin Booker',      cardSet: '2021 Select',        rarity: 'rare',      value: 90  },
  { playerName: 'Damian Lillard',    cardSet: '2020 Optic',         rarity: 'rare',      value: 55  },
  { playerName: 'Anthony Edwards',   cardSet: '2020 Mosaic RC',     rarity: 'ultra_rare', value: 180 },
  { playerName: 'Tyrese Haliburton', cardSet: '2020 Prizm RC',      rarity: 'uncommon',  value: 30  },
]

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

    const isTrade = (persona.style === 'trader' || persona.style === 'grail')
      ? Math.random() < 0.65
      : Math.random() < 0.25

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
          tradeCard: { ...tradeCard, imageUrl: '' },
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
