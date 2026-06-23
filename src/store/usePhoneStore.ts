import { create } from 'zustand'
import type { AppId } from '../types'

// A one-shot request to list a specific card on a marketplace, handed off
// from the Binder so the target app can jump straight into its listing flow.
export interface ListIntent {
  cid: string
  platform: 'ebay' | 'instagram'
}

interface PhoneState {
  activeApp: AppId | null
  listIntent: ListIntent | null
  openApp: (id: AppId) => void
  closeApp: () => void
  requestList: (cid: string, platform: 'ebay' | 'instagram') => void
  clearListIntent: () => void
}

export const usePhoneStore = create<PhoneState>()((set) => ({
  activeApp: null,
  listIntent: null,
  openApp: (id) => set({ activeApp: id }),
  closeApp: () => set({ activeApp: null }),
  requestList: (cid, platform) => set({ activeApp: platform, listIntent: { cid, platform } }),
  clearListIntent: () => set({ listIntent: null }),
}))
