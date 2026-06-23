export type Rarity = 'common' | 'uncommon' | 'rare' | 'ultra_rare' | 'legendary'

export interface Card {
  cid: string
  playerName: string
  cardSet: string
  variant: string
  rarity: Rarity
  actualEbayPrice: number
  imageUrl: string
  pulledAt: number
  sold: boolean
  listed: boolean
  sellPrice: number | null
  platform?: 'ebay' | 'instagram' | 'whatnot'
  dmUsed?: boolean
  // Instagram fields
  igPostedAt?: number
  igOffers?: IgOffer[]
  igCleared?: boolean
  // eBay fields
  ebayFormat?: 'auction' | 'bin'
  ebayPrice?: number
  ebayShipping?: string
  ebayShippingCost?: number
  auctionEndTime?: number
  ebayFailed?: boolean
  failReason?: string | null
  ebaySoldPrice?: number
  ebayFeeAmt?: number
  auctionCleared?: boolean
  bidEvents?: BidEvent[]
}

export interface BidEvent {
  t: number
  user: string
  amount: number
  type: 'bid' | 'sale'
}

export interface IgOffer {
  id: string
  user: string
  avatar: string        // color hex
  type: 'money' | 'trade'
  amount?: number       // money offer OR cash sweetener amount
  cashSide?: 'buyer' | 'seller' // who pays the sweetener
  tradeCard?: {         // the card they're offering in trade
    playerName: string
    cardSet: string
    rarity: string
    value: number
    imageUrl: string
  }
  message: string
  arrivedAt: number
  expiresAt: number
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  unsolicited?: boolean              // DM about a card you never listed
  followUps?: { text: string; at: number }[] // nudges if you ignore them
}

export interface EbayRep {
  feedback: number
  positive: number
  negative: number
}

export interface Stats {
  packs: number
  earned: number
  spent: number
  allCards: number
  allEarned: number
  allPacks: number
  bestBR: number
  bestPacks: number
  bestCard: { name: string; price: number } | null
}

export type AppId = 'home' | 'pack-market' | 'ebay' | 'instagram' | 'whatnot' | 'settings' | 'paypal'

export interface Notification {
  id: string
  appId: AppId
  title: string
  body: string
  timestamp: number
}

export type Screen = 'lock' | 'home' | AppId
