import * as Sentry from '@sentry/react'

const TAG_COMMUNITY_ID = 'community_id'
const TAG_COMMUNITY_NAME = 'community_name'

/** Set Sentry user + community context after login. */
export function identifyUser({ userId, email, communityId, communityName }) {
  Sentry.setUser({ id: userId, email })
  if (communityId) {
    Sentry.setTag(TAG_COMMUNITY_ID, communityId)
    Sentry.setTag(TAG_COMMUNITY_NAME, communityName ?? 'unknown')
  }
}

/** Update only the community tags without touching the user identity. */
export function setCommunityTags(communityId, communityName) {
  Sentry.setTag(TAG_COMMUNITY_ID, communityId ?? null)
  Sentry.setTag(TAG_COMMUNITY_NAME, communityName ?? null)
}

/** Clear Sentry user context on sign-out. */
export function clearUser() {
  Sentry.setUser(null)
  Sentry.setTag(TAG_COMMUNITY_ID, null)
  Sentry.setTag(TAG_COMMUNITY_NAME, null)
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
