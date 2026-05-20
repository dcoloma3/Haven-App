/**
 * Sentry user/community context helpers.
 *
 * Call `identifyUser()` once after login and `clearUser()` on sign-out.
 * This tags every subsequent error report with who was affected and which
 * community they were managing — making Sentry alerts actionable rather
 * than anonymous.
 */
import * as Sentry from '@sentry/react'

/**
 * Set Sentry user context after a successful login.
 * @param {{ userId: string, email: string, communityId?: string, communityName?: string }} params
 */
export function identifyUser({ userId, email, communityId, communityName }) {
  Sentry.setUser({ id: userId, email })
  if (communityId) {
    Sentry.setTag('community_id', communityId)
    Sentry.setTag('community_name', communityName ?? 'unknown')
  }
}

/**
 * Clear Sentry user context on sign-out.
 */
export function clearUser() {
  Sentry.setUser(null)
  Sentry.setTag('community_id', null)
  Sentry.setTag('community_name', null)
}

/**
 * Manually report a caught error to Sentry with extra context.
 * Use this inside catch blocks for errors you handle gracefully but still
 * want visibility into (e.g., a Supabase insert that fails silently).
 *
 * @param {Error|string} error
 * @param {{ [key: string]: string | number | boolean }} extras
 */
export function reportError(error, extras = {}) {
  Sentry.withScope(scope => {
    Object.entries(extras).forEach(([key, value]) => scope.setExtra(key, value))
    Sentry.captureException(typeof error === 'string' ? new Error(error) : error)
  })
}
