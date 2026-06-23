import type { AppId } from '../types'

// Single source of truth for which level unlocks each app. Used by the home
// screen (lock UI), the Binder (which list actions to offer), and the world
// ticker (so locked apps don't generate offers/DMs).
export const APP_MIN_LEVEL: Record<AppId, number> = {
  'home': 1,
  'settings': 1,
  'pack-market': 1,
  'ebay': 1,
  'instagram': 2,
  'whatnot': 3,
  'paypal': 1,
}

export const isUnlocked = (app: AppId, level: number) => level >= (APP_MIN_LEVEL[app] ?? 1)
