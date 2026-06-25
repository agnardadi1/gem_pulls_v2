import { useGameStore } from '../store/useGameStore'
import { useNotificationStore } from '../store/useNotificationStore'
import { followUpForUser } from '../apps/Instagram/igLogic'
import { makeEbayOffer } from '../apps/eBay/ebayLogic'
import { isUnlocked } from './appUnlocks'

// Per-tick probability (the world ticks every ~3s from Phone).
const EBAY_OFFER_CHANCE = 0.045      // per eligible Best Offer listing

// Advances the "world" — buyer DMs and eBay offers — on a global cadence so
// they keep arriving (and notifying) regardless of which app is open. Reads
// and writes the stores via getState so it's safe to call from a bare timer.
export function runWorldTick() {
  const now = Date.now()
  const { collection, updateCard, level } = useGameStore.getState()
  const push = useNotificationStore.getState().push

  // Locked apps don't generate any activity — no offers for marketplaces the
  // player can't even open yet.
  const igOpen = isUnlocked('instagram', level)
  const ebayOpen = isUnlocked('ebay', level)

  // ── Instagram: arrival notifications + follow-up nudges ──
  if (igOpen) collection.forEach(card => {
    if (card.sold) return
    const offers = card.igOffers
    if (!offers || !offers.length) return
    let changed = false
    const next = offers.map(o => {
      if (o.arrivedAt > now) return o  // not yet arrived

      // Fire arrival notification exactly once
      if (!o.notified) {
        push('instagram', 'New DM', `@${o.user} sent you an offer on ${card.playerName}`)
        changed = true
        return { ...o, notified: true }
      }

      if (o.status !== 'pending' || o.expiresAt <= now) return o

      // Follow-up nudges for pending offers left sitting
      const frac = (now - o.arrivedAt) / (o.expiresAt - o.arrivedAt)
      const want = frac > 0.75 ? 2 : frac > 0.4 ? 1 : 0
      const have = o.followUps?.length ?? 0
      if (want <= have) return o
      const adds: { text: string; at: number }[] = []
      for (let k = have; k < want; k++) adds.push({ text: followUpForUser(o.user), at: now })
      changed = true
      return { ...o, followUps: [...(o.followUps || []), ...adds] }
    })
    if (changed) updateCard(card.cid, { igOffers: next })
  })

  // ── eBay: expire stale Best Offers, occasionally surface a new one ──
  if (ebayOpen) collection.forEach(c => {
    if (!(c.platform === 'ebay' && c.listed && !c.sold && c.ebayBestOffer)) return
    let offers = c.ebayOffers || []
    let changed = false
    offers = offers.map(o => {
      if (o.status === 'pending' && o.expiresAt <= now) { changed = true; return { ...o, status: 'expired' as const } }
      return o
    })
    const hasPending = offers.some(o => o.status === 'pending')
    const beforeEnd = now < (c.auctionEndTime || 0)
    if (!hasPending && offers.length < 3 && beforeEnd && Math.random() < EBAY_OFFER_CHANCE) {
      const offer = makeEbayOffer(c.ebayPrice || 0, now)
      offers = [...offers, offer]
      changed = true
      push('ebay', 'New offer', `${offer.user} offered $${offer.amount.toFixed(2)} for ${c.playerName}`)
    }
    if (changed) updateCard(c.cid, { ebayOffers: offers })
  })
}
