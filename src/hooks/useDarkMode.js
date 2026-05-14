import { useState, useEffect } from 'react'

export function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    try {
      const saved = localStorage.getItem('haven_dark') === '1'
      // Apply synchronously to avoid flash of light content on page load
      if (saved) document.documentElement.classList.add('dark')
      return saved
    } catch {
      return false
    }
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    try {
      if (isDark) localStorage.setItem('haven_dark', '1')
      else localStorage.removeItem('haven_dark')
    } catch {}
  }, [isDark])

  return { isDark, toggle: () => setIsDark(d => !d) }
}
