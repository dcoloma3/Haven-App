import { useEffect, useState } from 'react'

// Per-device on/off preference for the seasonal background.
const OFF_KEY = 'haven_theme_off'
const CHANGE_EVENT = 'haven-theme-change'

export function isThemeOff() {
  try { return localStorage.getItem(OFF_KEY) === '1' } catch { return false }
}

export function setThemeOff(off) {
  try { off ? localStorage.setItem(OFF_KEY, '1') : localStorage.removeItem(OFF_KEY) } catch { /* ignore */ }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

// React to the off toggle changing (here or in another tab).
export function useThemeOff() {
  const [off, setOff] = useState(isThemeOff)
  useEffect(() => {
    const sync = () => setOff(isThemeOff())
    window.addEventListener(CHANGE_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])
  return off
}
