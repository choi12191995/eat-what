import { usePreferredReducedMotion } from '@vueuse/core'

/** Vibration is Android-only in practice; feature-detected, respects reduced motion. */
export function useHaptics() {
  const motion = usePreferredReducedMotion()

  function vibrate(pattern: number | number[]) {
    if (motion.value === 'reduce') return
    try {
      navigator.vibrate?.(pattern)
    } catch {
      // some browsers throw on unsupported patterns — haptics are best-effort
    }
  }

  return {
    tap: () => vibrate(40),
    land: () => vibrate([40, 60, 140]),
  }
}
