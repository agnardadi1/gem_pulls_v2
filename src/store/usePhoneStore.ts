import { create } from 'zustand'
import type { AppId } from '../types'

interface PhoneState {
  activeApp: AppId | null
  openApp: (id: AppId) => void
  closeApp: () => void
}

export const usePhoneStore = create<PhoneState>()((set) => ({
  activeApp: null,
  openApp: (id) => set({ activeApp: id }),
  closeApp: () => set({ activeApp: null }),
}))
