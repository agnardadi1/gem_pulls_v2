import { create } from 'zustand'
import type { Notification, AppId } from '../types'

interface NotificationState {
  notifications: Notification[]
  push: (appId: AppId, title: string, body: string) => void
  dismiss: (id: string) => void
  dismissAll: () => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],

  push: (appId, title, body) => {
    const note: Notification = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      appId,
      title,
      body,
      timestamp: Date.now(),
    }
    set((s) => ({ notifications: [note, ...s.notifications].slice(0, 6) }))
  },

  dismiss: (id) =>
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),

  dismissAll: () => set({ notifications: [] }),
}))
