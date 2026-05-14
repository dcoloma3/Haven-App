import { useEffect } from 'react'

/**
 * Warns the user before leaving the page if there are unsaved changes.
 * @param {boolean} isDirty - Whether there are unsaved changes
 */
export function useUnsavedChanges(isDirty) {
  useEffect(() => {
    if (!isDirty) return

    function handleBeforeUnload(e) {
      e.preventDefault()
      // Standard way to trigger the browser's "leave page?" dialog
      e.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])
}
