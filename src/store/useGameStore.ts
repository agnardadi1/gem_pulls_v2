import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Card, EbayRep, Stats } from '../types'
import { usePayPalStore, type TxCategory } from './usePayPalStore'

// Metadata describing a money movement, logged to the PayPal ledger.
export interface TxMeta {
  name: string
  note: string
  category: TxCategory
}

export interface IgProfile {
  handle: string
  name: string
  bio: string
  avatar: string // hex color OR data URL
}

interface GameState {
  bankroll: number
  collection: Card[]
  ebayRep: EbayRep
  stats: Stats
  level: number
  wallpaper: string | null
  igProfile: IgProfile

  // Actions
  setBankroll: (amount: number) => void
  addCard: (card: Card) => void
  updateCard: (cid: string, updates: Partial<Card>) => void
  removeCard: (cid: string) => void
  addEarnings: (amount: number, meta?: TxMeta) => void
  spendBankroll: (amount: number, meta?: TxMeta) => void
  spendCash: (amount: number, meta?: TxMeta) => void
  resetRun: () => void
  setWallpaper: (dataUrl: string | null) => void
  setIgProfile: (updates: Partial<IgProfile>) => void
}

const defaultIgProfile = (): IgProfile => ({
  handle: 'gem.pulls',
  name: 'Gem Pulls',
  bio: 'Breaking wax & flipping grails daily.\nDM for deals — trades always open.',
  avatar: '#7b2ff7',
})

const defaultStats = (): Stats => ({
  packs: 0,
  earned: 0,
  spent: 0,
  allCards: 0,
  allEarned: 0,
  allPacks: 0,
  bestBR: 500,
  bestPacks: 0,
  bestCard: null,
})

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      bankroll: 500,
      collection: [],
      ebayRep: { feedback: 0, positive: 0, negative: 0 },
      stats: defaultStats(),
      level: 1,
      wallpaper: null,
      igProfile: defaultIgProfile(),

      setBankroll: (amount) => set({ bankroll: amount }),

      setIgProfile: (updates) => set((s) => ({ igProfile: { ...s.igProfile, ...updates } })),

      addCard: (card) =>
        set((s) => ({
          collection: [...s.collection, card],
          stats: { ...s.stats, allCards: s.stats.allCards + 1 },
        })),

      updateCard: (cid, updates) =>
        set((s) => ({
          collection: s.collection.map((c) =>
            c.cid === cid ? { ...c, ...updates } : c
          ),
        })),

      removeCard: (cid) =>
        set((s) => ({ collection: s.collection.filter((c) => c.cid !== cid) })),

      addEarnings: (amount, meta) => {
        set((s) => {
          const newBR = s.bankroll + amount
          const newAllEarned = s.stats.allEarned + amount
          const newLevel =
            newAllEarned >= 100000 ? 4
            : newAllEarned >= 25000 ? 3
            : newAllEarned >= 5000 ? 2
            : 1
          return {
            bankroll: newBR,
            level: newLevel,
            stats: {
              ...s.stats,
              earned: s.stats.earned + amount,
              allEarned: newAllEarned,
              bestBR: Math.max(s.stats.bestBR, newBR),
            },
          }
        })
        if (meta) usePayPalStore.getState().logTransaction({ ...meta, amount })
      },

      // Buying a pack — decrements bankroll and counts toward pack stats.
      spendBankroll: (amount, meta) => {
        set((s) => ({
          bankroll: s.bankroll - amount,
          stats: { ...s.stats, spent: s.stats.spent + amount, packs: s.stats.packs + 1, allPacks: s.stats.allPacks + 1 },
        }))
        if (meta) usePayPalStore.getState().logTransaction({ ...meta, amount: -amount })
      },

      // Generic cash spend (e.g. buying a card off Instagram) — no pack stats.
      spendCash: (amount, meta) => {
        set((s) => ({
          bankroll: s.bankroll - amount,
          stats: { ...s.stats, spent: s.stats.spent + amount },
        }))
        if (meta) usePayPalStore.getState().logTransaction({ ...meta, amount: -amount })
      },

      setWallpaper: (dataUrl) => set({ wallpaper: dataUrl }),

      resetRun: () => {
        usePayPalStore.getState().clearLedger()
        set((s) => ({
          bankroll: 500,
          level: 1,
          collection: [],
          ebayRep: { feedback: 0, positive: 0, negative: 0 },
          stats: {
            ...defaultStats(),
            allCards: s.stats.allCards,
            allEarned: s.stats.allEarned,
            allPacks: s.stats.allPacks,
            bestBR: s.stats.bestBR,
            bestPacks: Math.max(s.stats.bestPacks, s.stats.packs),
            bestCard: s.stats.bestCard,
          },
        }))
      },
    }),
    { name: 'gem-pulls-v1' }
  )
)
