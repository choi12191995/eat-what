<script setup lang="ts">
/**
 * Pointer-driven slider — one thumb (pass only `hi`) or a dual-thumb range
 * (pass `lo` too). Custom rather than <input type=range> because dual native
 * thumbs need pointer-events tricks that are flaky in iOS Safari, and this
 * keeps styling identical in both modes.
 */
import { computed, ref } from 'vue'

const props = defineProps<{
  min: number
  max: number
  step: number
  hi: number
  /** Present ⇒ dual-thumb range slider */
  lo?: number
  ariaLabel?: string
}>()
const emit = defineEmits<{ 'update:hi': [v: number]; 'update:lo': [v: number] }>()

const trackEl = ref<HTMLDivElement | null>(null)
const dual = computed(() => props.lo !== undefined)

const pct = (v: number) => ((v - props.min) / (props.max - props.min)) * 100
const loPct = computed(() => (dual.value ? pct(props.lo!) : 0))
const hiPct = computed(() => pct(props.hi))

function valueFromX(clientX: number): number {
  const rect = trackEl.value!.getBoundingClientRect()
  const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
  const raw = props.min + ratio * (props.max - props.min)
  const snapped = Math.round(raw / props.step) * props.step
  return Math.min(props.max, Math.max(props.min, snapped))
}

function setThumb(thumb: 'lo' | 'hi', v: number) {
  if (thumb === 'lo') emit('update:lo', Math.min(v, props.hi))
  else emit('update:hi', dual.value ? Math.max(v, props.lo!) : v)
}

let active: 'lo' | 'hi' = 'hi'
function onPointerDown(e: PointerEvent) {
  if (!trackEl.value) return
  const v = valueFromX(e.clientX)
  // Grab whichever thumb is closer; ties go to the one that can still move
  active =
    dual.value && (Math.abs(v - props.lo!) < Math.abs(v - props.hi) || v < props.lo!)
      ? 'lo'
      : 'hi'
  setThumb(active, v)
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}
function onPointerMove(e: PointerEvent) {
  if (!(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) return
  setThumb(active, valueFromX(e.clientX))
}

function onKey(thumb: 'lo' | 'hi', e: KeyboardEvent) {
  const current = thumb === 'lo' ? props.lo! : props.hi
  let next: number | null = null
  if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = current + props.step
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = current - props.step
  else if (e.key === 'Home') next = props.min
  else if (e.key === 'End') next = props.max
  if (next === null) return
  e.preventDefault()
  setThumb(thumb, Math.min(props.max, Math.max(props.min, next)))
}
</script>

<template>
  <div
    class="touch-none px-3 py-3"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
  >
    <div ref="trackEl" class="relative h-1.5 rounded-full bg-stone-200 dark:bg-stone-700">
      <span
        class="absolute inset-y-0 rounded-full bg-orange-500"
        :style="{ left: `${loPct}%`, right: `${100 - hiPct}%` }"
      />
      <span
        v-if="dual"
        role="slider"
        tabindex="0"
        :aria-label="(ariaLabel ?? '') + ' min'"
        :aria-valuemin="min"
        :aria-valuemax="max"
        :aria-valuenow="lo"
        class="absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-orange-500 bg-white shadow-md outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
        :style="{ left: `${loPct}%` }"
        @keydown="onKey('lo', $event)"
      />
      <span
        role="slider"
        tabindex="0"
        :aria-label="ariaLabel"
        :aria-valuemin="min"
        :aria-valuemax="max"
        :aria-valuenow="hi"
        class="absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-orange-500 bg-white shadow-md outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
        :style="{ left: `${hiPct}%` }"
        @keydown="onKey('hi', $event)"
      />
    </div>
  </div>
</template>
