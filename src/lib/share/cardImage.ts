import type { Restaurant } from '@/types/models'

export interface CardImageInput {
  restaurant: Restaurant
  emoji: string
  /** Hero color (winner's wheel segment color) */
  color: string
  /** Pre-formatted lines, already localized */
  priceText?: string | null
  distanceText?: string | null
  cuisineText?: string | null
  footer: string
}

const W = 1080
const H = 1350

function roundedRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath()
  c.moveTo(x + r, y)
  c.arcTo(x + w, y, x + w, y + h, r)
  c.arcTo(x + w, y + h, x, y + h, r)
  c.arcTo(x, y + h, x, y, r)
  c.arcTo(x, y, x + w, y, r)
  c.closePath()
}

/** Ellipsize a line to fit maxWidth at the current font. */
function fitLine(c: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (c.measureText(text).width <= maxWidth) return text
  let out = text
  while (out.length > 1 && c.measureText(`${out}…`).width > maxWidth) out = out.slice(0, -1)
  return `${out}…`
}

/**
 * Draws the shareable result card — emoji-art on the winner's color.
 * Deliberately no Google photo: cross-origin images taint the canvas.
 */
export function drawCardImage(input: CardImageInput): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const c = canvas.getContext('2d')!
  const font = (weight: number, px: number) =>
    `${weight} ${px}px -apple-system, 'PingFang TC', 'Noto Sans TC', sans-serif`

  // hero gradient
  const grad = c.createLinearGradient(0, 0, W, H)
  grad.addColorStop(0, `${input.color}bb`)
  grad.addColorStop(1, input.color)
  c.fillStyle = grad
  c.fillRect(0, 0, W, H)

  // big emoji
  c.font = '300px sans-serif'
  c.textAlign = 'center'
  c.textBaseline = 'middle'
  c.fillText(input.emoji, W / 2, 400)

  // white card
  const cardY = 690
  c.save()
  c.shadowColor = 'rgba(0,0,0,0.25)'
  c.shadowBlur = 40
  c.shadowOffsetY = 12
  c.fillStyle = '#ffffff'
  roundedRect(c, 60, cardY, W - 120, H - cardY - 130, 48)
  c.fill()
  c.restore()

  const r = input.restaurant
  const textX = W / 2
  const maxTextW = W - 240
  c.fillStyle = '#1c1917'
  c.font = font(800, 72)
  c.fillText(fitLine(c, r.name, maxTextW), textX, cardY + 110)

  let y = cardY + 210
  if (r.rating) {
    c.font = font(600, 48)
    c.fillStyle = '#f59e0b'
    const stars = '★'.repeat(Math.round(r.rating))
    const count = r.userRatingCount ? `  (${r.userRatingCount})` : ''
    c.fillText(`${stars}  ${r.rating.toFixed(1)}${count}`, textX, y)
    y += 90
  }

  c.font = font(500, 44)
  c.fillStyle = '#57534e'
  const infoLine = [input.priceText, input.distanceText].filter(Boolean).join('   ·   ')
  if (infoLine) {
    c.fillText(fitLine(c, infoLine, maxTextW), textX, y)
    y += 80
  }
  if (input.cuisineText) {
    c.fillText(fitLine(c, input.cuisineText, maxTextW), textX, y)
    y += 80
  }
  if (r.address) {
    c.font = font(400, 36)
    c.fillStyle = '#a8a29e'
    c.fillText(fitLine(c, r.address, maxTextW), textX, y)
  }

  // footer
  c.font = font(600, 40)
  c.fillStyle = 'rgba(255,255,255,0.92)'
  c.fillText(input.footer, textX, H - 62)

  return canvas
}

/** Canvas → PNG share (files Web Share) with download fallback. Returns how it was delivered. */
export async function shareCardImage(
  canvas: HTMLCanvasElement,
  filename = 'eat-what.png',
): Promise<'shared' | 'downloaded' | 'failed'> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) return 'failed'
  const file = new File([blob], filename, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return 'shared'
    } catch {
      // cancelled — treat as done, don't force a download on the user
      return 'shared'
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'downloaded'
}
