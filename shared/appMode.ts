export const APP_MODES = ['dev', 'demo', 'production'] as const

export type AppMode = (typeof APP_MODES)[number]

export function parseAppMode(value: string | undefined): AppMode {
  if (value === 'demo' || value === 'production') return value
  return 'dev'
}

export function shouldSeedDemoData(mode: AppMode): boolean {
  return mode === 'dev' || mode === 'demo'
}
