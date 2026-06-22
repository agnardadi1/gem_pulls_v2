import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type TxCategory = 'pack' | 'ebay' | 'instagram' | 'whatnot' | 'transfer' | 'adjust'

export interface PayPalTransaction {
  id: string
  name: string        // headline, e.g. "Hobby Box" or "Stephen Curry"
  note: string        // sub line, e.g. "Opened a pack" / "Sold on eBay"
  amount: number      // positive = money in, negative = money out
  date: number        // timestamp
  category: TxCategory
}

interface PayPalState {
  // The balance is NOT stored here — useGameStore.bankroll is the single
  // source of truth. This store is purely the transaction ledger.
  transactions: PayPalTransaction[]
  logTransaction: (tx: Omit<PayPalTransaction, 'id' | 'date'>) => void
  clearLedger: () => void
}

export const usePayPalStore = create<PayPalState>()(
  persist(
    (set) => ({
      transactions: [],

      logTransaction: (tx) =>
        set((s) => ({
          transactions: [
            { ...tx, id: Math.random().toString(36).slice(2), date: Date.now() },
            ...s.transactions,
          ].slice(0, 200), // cap history
        })),

      clearLedger: () => set({ transactions: [] }),
    }),
    { name: 'gem-pulls-paypal' }
  )
)
