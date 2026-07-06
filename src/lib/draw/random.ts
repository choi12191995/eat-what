/** Uniform random int in [0, maxExclusive) using rejection sampling on WebCrypto. */
export function cryptoRandomInt(maxExclusive: number): number {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
    throw new RangeError(`cryptoRandomInt: maxExclusive must be a positive integer, got ${maxExclusive}`)
  }
  const range = 0x1_0000_0000
  const limit = range - (range % maxExclusive)
  const buf = new Uint32Array(1)
  for (;;) {
    crypto.getRandomValues(buf)
    const v = buf[0]!
    if (v < limit) return v % maxExclusive
  }
}

/** Uniform random float in [0, 1) from WebCrypto. */
export function cryptoRandomFloat(): number {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0]! / 0x1_0000_0000
}

/** Index drawn proportionally to weights (non-positive weights count as 0). */
export function weightedRandomIndex(weights: readonly number[]): number {
  const clean = weights.map((w) => (Number.isFinite(w) && w > 0 ? w : 0))
  const total = clean.reduce((a, b) => a + b, 0)
  if (total <= 0) return cryptoRandomInt(weights.length)
  let r = cryptoRandomFloat() * total
  for (let i = 0; i < clean.length; i++) {
    r -= clean[i]!
    if (r < 0) return i
  }
  return clean.length - 1
}

/** Fisher–Yates shuffle (non-mutating) driven by cryptoRandomInt. */
export function shuffle<T>(arr: readonly T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = cryptoRandomInt(i + 1)
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}
