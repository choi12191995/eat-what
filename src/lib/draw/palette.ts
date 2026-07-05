/** Fixed wheel segment palette (≤10 segments) — readable with dark labels in both themes. */
export const WHEEL_PALETTE = [
  '#fbbf24',
  '#fb7185',
  '#34d399',
  '#60a5fa',
  '#f472b6',
  '#a78bfa',
  '#fb923c',
  '#4ade80',
  '#38bdf8',
  '#facc15',
] as const

export function wheelColor(index: number): string {
  return WHEEL_PALETTE[index % WHEEL_PALETTE.length]!
}
