<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePreferredReducedMotion } from '@vueuse/core'

import { cryptoRandomInt } from '@/lib/draw/random'
import { wheelColor } from '@/lib/draw/palette'

export interface WheelItem {
  id: string
  label: string
  emoji: string
}

const props = defineProps<{
  items: WheelItem[]
  /** Dimmed, purely decorative state before any draw */
  placeholder?: boolean
}>()

const SIZE = 400
const C = SIZE / 2
const R = 186
const LABEL_R = 122
const SPIN_SECONDS = 4.2

const rotation = ref(0)
const animating = ref(false)
const highlightIndex = ref<number | null>(null)
const motion = usePreferredReducedMotion()

const segAngle = computed(() => 360 / Math.max(props.items.length, 1))

function polar(r: number, deg: number): { x: number; y: number } {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: C + r * Math.cos(rad), y: C + r * Math.sin(rad) }
}

function arcPath(startDeg: number, endDeg: number): string {
  const s = polar(R, startDeg)
  const e = polar(R, endDeg)
  const largeArc = endDeg - startDeg > 180 ? 1 : 0
  return `M ${C} ${C} L ${s.x} ${s.y} A ${R} ${R} 0 ${largeArc} 1 ${e.x} ${e.y} Z`
}

interface Segment {
  item: WheelItem
  path: string
  color: string
  labelX: number
  labelY: number
  shortLabel: string
}

function truncate(label: string): string {
  const isCjk = /[㐀-鿿]/.test(label)
  const max = isCjk ? 5 : 9
  return label.length > max ? label.slice(0, max - 1) + '…' : label
}

const segments = computed<Segment[]>(() =>
  props.items.map((item, i) => {
    const start = i * segAngle.value
    const end = (i + 1) * segAngle.value
    const mid = (start + end) / 2
    const pos = polar(LABEL_R, mid)
    return {
      item,
      path: arcPath(start, end),
      color: wheelColor(i),
      labelX: pos.x,
      labelY: pos.y,
      shortLabel: truncate(item.label),
    }
  }),
)

/** Spin so the given segment lands under the top pointer. Resolves when landed. */
async function spin(winnerIndex: number): Promise<void> {
  const n = props.items.length
  if (n === 0 || winnerIndex < 0 || winnerIndex >= n) return
  highlightIndex.value = null
  const center = segAngle.value * (winnerIndex + 0.5)

  if (motion.value === 'reduce') {
    rotation.value = -center
    highlightIndex.value = winnerIndex
    await new Promise((resolve) => setTimeout(resolve, 400))
    return
  }

  const current = rotation.value
  const delta = (((-center - current) % 360) + 360) % 360
  // Jitter keeps the stop point varied *within* the winning segment —
  // pure theater; fairness comes from cryptoRandomInt upstream.
  const jitter = ((cryptoRandomInt(1000) / 1000 - 0.5) * 0.7) * segAngle.value
  const spins = 4 + cryptoRandomInt(3)

  animating.value = true
  rotation.value = current + spins * 360 + delta + jitter

  await new Promise<void>((resolve) => {
    const el = wheelGroup.value
    const done = () => {
      el?.removeEventListener('transitionend', done)
      clearTimeout(timer)
      resolve()
    }
    // Fallback in case transitionend is swallowed (hidden tab, etc.)
    const timer = setTimeout(done, SPIN_SECONDS * 1000 + 500)
    el?.addEventListener('transitionend', done)
  })
  animating.value = false
  highlightIndex.value = winnerIndex
}

const wheelGroup = ref<SVGGElement | null>(null)

defineExpose({ spin })
</script>

<template>
  <div class="relative mx-auto w-full max-w-90" :class="placeholder ? 'opacity-80' : ''">
    <svg :viewBox="`0 0 ${SIZE} ${SIZE}`" class="block w-full drop-shadow-xl" role="img">
      <!-- rotating wheel -->
      <g
        ref="wheelGroup"
        :style="{
          transform: `rotate(${rotation}deg)`,
          transformOrigin: `${C}px ${C}px`,
          transition: animating
            ? `transform ${SPIN_SECONDS}s cubic-bezier(0.12, 0, 0.06, 1)`
            : 'none',
          willChange: 'transform',
        }"
      >
        <circle v-if="items.length <= 1" :cx="C" :cy="C" :r="R" :fill="wheelColor(0)" />
        <template v-else>
          <path
            v-for="(seg, i) in segments"
            :key="seg.item.id"
            :d="seg.path"
            :fill="seg.color"
            :opacity="highlightIndex !== null && highlightIndex !== i ? 0.35 : 1"
            stroke="#fff7ed"
            stroke-width="2"
            class="transition-opacity duration-300"
          />
        </template>
        <!-- labels counter-rotate in sync so they stay horizontal mid-spin -->
        <g
          v-for="seg in segments"
          :key="`label-${seg.item.id}`"
          :style="{
            transform: `rotate(${-rotation}deg)`,
            transformOrigin: `${seg.labelX}px ${seg.labelY}px`,
            transition: animating
              ? `transform ${SPIN_SECONDS}s cubic-bezier(0.12, 0, 0.06, 1)`
              : 'none',
          }"
        >
          <text
            :x="seg.labelX"
            :y="seg.labelY - (placeholder ? 0 : 8)"
            text-anchor="middle"
            :font-size="placeholder ? 30 : 24"
          >
            {{ seg.item.emoji }}
          </text>
          <text
            v-if="!placeholder && seg.shortLabel"
            :x="seg.labelX"
            :y="seg.labelY + 16"
            text-anchor="middle"
            font-size="13"
            font-weight="600"
            fill="#1c1917"
          >
            {{ seg.shortLabel }}
          </text>
        </g>
      </g>

      <!-- rim + hub (static) -->
      <circle :cx="C" :cy="C" :r="R + 4" fill="none" stroke="#c2410c" stroke-width="8" />
      <circle :cx="C" :cy="C" r="34" fill="#fff7ed" stroke="#c2410c" stroke-width="5" />
      <text :x="C" :y="C + 9" text-anchor="middle" font-size="26">🍽️</text>

      <!-- pointer (static, top) -->
      <path
        :d="`M ${C - 16} 6 L ${C + 16} 6 L ${C} 44 Z`"
        fill="#dc2626"
        stroke="#fff7ed"
        stroke-width="3"
      />
    </svg>
  </div>
</template>
