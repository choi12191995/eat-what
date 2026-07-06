<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import confetti from 'canvas-confetti'

import {
  fetchRoom,
  hostToken,
  roomUrl,
  sendResult,
  sendVeto,
  voterId,
  type RoomView,
} from '@/lib/rooms/client'
import { cryptoRandomInt } from '@/lib/draw/random'
import { useHaptics } from '@/composables/useHaptics'

const { t } = useI18n()
const route = useRoute()
const haptics = useHaptics()

const roomId = computed(() => String(route.params.id ?? '').toUpperCase())
const room = ref<RoomView | null>(null)
const notFound = ref(false)
const copied = ref(false)
const spinning = ref(false)

const isHost = computed(() => !!hostToken(roomId.value))
const myVetoPlaced = computed(() =>
  room.value ? Object.values(room.value.vetoes).includes(voterId()) : false,
)
const alive = computed(() =>
  room.value ? room.value.candidates.filter((c) => !room.value!.vetoes[c.id]) : [],
)
const winner = computed(() =>
  room.value?.result
    ? (room.value.candidates.find((c) => c.id === room.value!.result!.placeId) ?? null)
    : null,
)

let timer: ReturnType<typeof setInterval> | null = null

async function refresh() {
  const view = await fetchRoom(roomId.value)
  if (!view) {
    // Only mark dead if we never loaded it — a poll blip shouldn't nuke the UI
    if (!room.value) notFound.value = true
    return
  }
  const hadResult = !!room.value?.result
  room.value = view
  if (view.result && !hadResult) {
    haptics.land()
    confetti({ particleCount: 120, spread: 70, origin: { y: 0.4 }, disableForReducedMotion: true })
    if (timer) clearInterval(timer)
  }
}

onMounted(async () => {
  await refresh()
  timer = setInterval(() => {
    if (document.visibilityState === 'visible' && !room.value?.result) void refresh()
  }, 3000)
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

async function veto(placeId: string) {
  if (myVetoPlaced.value || room.value?.result || spinning.value) return
  haptics.tap()
  const view = await sendVeto(roomId.value, placeId)
  if (view) room.value = view
}

async function finalDraw() {
  if (!isHost.value || !alive.value.length || spinning.value) return
  spinning.value = true
  haptics.tap()
  const pick = alive.value[cryptoRandomInt(alive.value.length)]!
  const view = await sendResult(roomId.value, pick.id)
  if (view) {
    room.value = view
    haptics.land()
    confetti({ particleCount: 120, spread: 70, origin: { y: 0.4 }, disableForReducedMotion: true })
    if (timer) clearInterval(timer)
  }
  spinning.value = false
}

async function shareRoom() {
  const url = roomUrl(roomId.value)
  if (navigator.share) {
    try {
      await navigator.share({ title: t('room.title'), url })
      return
    } catch {
      // cancelled — fall through
    }
  }
  try {
    await navigator.clipboard.writeText(url)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    // clipboard unavailable
  }
}
</script>

<template>
  <div class="mx-auto max-w-md px-6 pt-10">
    <h1 class="mb-1 text-2xl font-bold">👥 {{ t('room.title') }}</h1>
    <p class="mb-5 text-xs text-stone-400 dark:text-stone-500">#{{ roomId }}</p>

    <p v-if="notFound" class="text-sm text-stone-500 dark:text-stone-400">
      {{ t('room.expired') }}
    </p>

    <template v-else-if="room">
      <!-- winner -->
      <div
        v-if="winner"
        class="mb-6 rounded-3xl border-2 border-orange-400 bg-orange-50 p-6 text-center dark:bg-orange-950/40"
      >
        <p class="text-sm font-semibold text-orange-600 dark:text-orange-300">
          {{ t('room.winner') }}
        </p>
        <p class="mt-2 text-4xl" aria-hidden="true">{{ winner.emoji }}</p>
        <p class="mt-1 text-2xl font-black">{{ winner.name }}</p>
        <a
          v-if="winner.mapsUrl"
          :href="winner.mapsUrl"
          target="_blank"
          rel="noopener"
          class="mt-3 inline-block rounded-full border border-stone-300 px-4 py-1.5 text-sm font-semibold text-stone-600 dark:border-stone-700 dark:text-stone-300"
        >
          🗺️ {{ t('result.openInMaps') }}
        </a>
      </div>

      <template v-else>
        <p class="mb-3 text-sm text-stone-500 dark:text-stone-400">
          {{ myVetoPlaced ? t('room.waiting') : t('room.joinerHint') }}
        </p>
        <p class="mb-4 text-xs font-semibold text-stone-400 dark:text-stone-500">
          {{ t('room.left', { n: alive.length }) }}
        </p>
      </template>

      <!-- candidates -->
      <ul class="space-y-2">
        <li v-for="c in room.candidates" :key="c.id">
          <div
            class="flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition-all"
            :class="
              room.vetoes[c.id]
                ? 'border-red-200 bg-red-50/60 opacity-60 dark:border-red-950 dark:bg-red-950/30'
                : winner && winner.id === c.id
                  ? 'border-orange-400'
                  : 'border-stone-200 dark:border-stone-800'
            "
          >
            <span class="text-2xl" aria-hidden="true">{{ c.emoji }}</span>
            <span
              class="min-w-0 flex-1 truncate text-sm font-semibold"
              :class="room.vetoes[c.id] ? 'line-through decoration-red-400 decoration-2' : ''"
            >
              {{ c.name }}
            </span>
            <button
              v-if="!room.result && !room.vetoes[c.id] && !myVetoPlaced"
              type="button"
              class="rounded-full border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-500 active:scale-95 dark:border-red-900"
              @click="veto(c.id)"
            >
              🙅 {{ t('room.veto') }}
            </button>
            <span v-else-if="room.vetoes[c.id]" class="text-xs text-red-400">
              {{ t('room.vetoed') }}
            </span>
          </div>
        </li>
      </ul>

      <!-- actions -->
      <div v-if="!room.result" class="mt-6 space-y-2">
        <button
          v-if="isHost"
          type="button"
          class="w-full rounded-2xl bg-orange-500 py-3.5 text-lg font-black text-white shadow-lg active:scale-95 disabled:opacity-60"
          :disabled="spinning || !alive.length"
          @click="finalDraw"
        >
          {{ spinning ? '🎡 …' : t('room.finalSpin') }}
        </button>
        <button
          type="button"
          class="w-full rounded-2xl border border-stone-300 py-3 text-sm font-semibold text-stone-600 dark:border-stone-700 dark:text-stone-300"
          @click="shareRoom"
        >
          {{ copied ? '✅ ' + t('result.copied') : '🔗 ' + t('room.share') }}
        </button>
      </div>
    </template>
  </div>
</template>
