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

/** Fisher–Yates shuffle (non-mutating) driven by cryptoRandomInt. */
export function shuffle<T>(arr: readonly T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = cryptoRandomInt(i + 1)
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}
