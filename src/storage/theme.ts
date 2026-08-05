export type ThemeMode = 'dark' | 'light' | 'system'

export function getStoredTheme(): ThemeMode {
  const stored = localStorage.getItem('dark')
  if (stored === null) return 'dark' // default
  if (stored === 'system') return 'system'
  return stored === 'true' ? 'dark' : 'light'
}

export function applyTheme(mode: ThemeMode): void {
  const root = document.documentElement

  if (mode === 'system') {
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.setAttribute('data-theme', systemDark ? 'dark' : 'light')
  } else {
    root.setAttribute('data-theme', mode)
  }

  localStorage.setItem('dark', mode === 'system' ? 'system' : mode === 'dark' ? 'true' : 'false')
}

export function initTheme(): void {
  const mode = getStoredTheme()
  applyTheme(mode)

  // Listen for system changes
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  media.addEventListener('change', () => {
    if (getStoredTheme() === 'system') {
      applyTheme('system')
    }
  })
}