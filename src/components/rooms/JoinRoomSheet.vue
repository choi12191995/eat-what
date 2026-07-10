<script setup lang="ts">
/**
 * Join a friend's room from INSIDE the app — type the 6-char code or scan
 * the host's QR. This is the iOS-proof path: a tapped room link always
 * opens the browser (whose storage is separate from the installed PWA), so
 * joining here is what keeps the group record in the app. Scanned content
 * is never navigated to — only the extracted code, on our own origin.
 */
import { onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import BottomSheet from '@/components/ui/BottomSheet.vue'
import { fetchRoom, parseRoomCode } from '@/lib/rooms/client'
import { useHaptics } from '@/composables/useHaptics'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const router = useRouter()
const haptics = useHaptics()

const code = ref('')
const joining = ref(false)
const errorKey = ref<string | null>(null)

async function join(raw: string) {
  const roomId = parseRoomCode(raw)
  if (!roomId) {
    errorKey.value = 'room.joinInvalid'
    return
  }
  if (joining.value) return
  joining.value = true
  errorKey.value = null
  try {
    const room = await fetchRoom(roomId)
    if (!room) {
      errorKey.value = 'room.joinNotFound'
      return
    }
    haptics.tap()
    stopScan()
    emit('close')
    await router.push(`/room/${roomId}`)
  } finally {
    joining.value = false
  }
}

// --- camera scanner: BarcodeDetector where available, jsQR fallback ---
const scanning = ref(false)
const videoEl = ref<HTMLVideoElement | null>(null)
let stream: MediaStream | null = null
let scanTimer: ReturnType<typeof setInterval> | null = null

async function startScan() {
  errorKey.value = null
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
      audio: false,
    })
  } catch {
    errorKey.value = 'room.cameraDenied'
    return
  }
  scanning.value = true
  // wait a tick for the <video> to mount
  await new Promise((r) => setTimeout(r, 0))
  const video = videoEl.value
  if (!video || !stream) return stopScan()
  video.srcObject = stream
  await video.play().catch(() => undefined)

  type Detector = { detect(source: CanvasImageSource): Promise<{ rawValue: string }[]> }
  const BD = (
    window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }
  ).BarcodeDetector
  const detector = BD ? new BD({ formats: ['qr_code'] }) : null
  const jsqr = detector ? null : (await import('jsqr')).default
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d', { willReadFrequently: true })

  scanTimer = setInterval(async () => {
    if (!scanning.value || !video.videoWidth) return
    try {
      let text: string | null = null
      if (detector) {
        const codes = await detector.detect(video)
        text = codes[0]?.rawValue ?? null
      } else if (jsqr && ctx) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        ctx.drawImage(video, 0, 0)
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
        text = jsqr(img.data, img.width, img.height)?.data ?? null
      }
      if (text && parseRoomCode(text)) await join(text)
    } catch {
      // one bad frame is fine — keep scanning
    }
  }, 250)
}

function stopScan() {
  scanning.value = false
  if (scanTimer) clearInterval(scanTimer)
  scanTimer = null
  stream?.getTracks().forEach((track) => track.stop())
  stream = null
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      code.value = ''
      errorKey.value = null
    } else {
      stopScan()
    }
  },
)
onBeforeUnmount(stopScan)
</script>

<template>
  <BottomSheet :open="open" @close="emit('close')">
    <div class="space-y-4 px-6 pt-1 pb-4">
      <h2 class="text-lg font-bold">🔑 {{ t('room.joinTitle') }}</h2>

      <div class="flex gap-2">
        <input
          v-model="code"
          type="text"
          inputmode="text"
          autocapitalize="characters"
          autocomplete="off"
          spellcheck="false"
          maxlength="6"
          :placeholder="t('room.joinPlaceholder')"
          class="min-w-0 flex-1 rounded-2xl border border-stone-300 bg-transparent px-4 py-3 text-center text-lg font-black tracking-[0.3em] uppercase outline-none placeholder:text-sm placeholder:font-normal placeholder:tracking-normal placeholder:text-stone-400 focus:border-orange-500 dark:border-stone-700"
          @keyup.enter="join(code)"
        />
        <button
          type="button"
          class="rounded-2xl bg-orange-500 px-5 text-sm font-bold text-white active:scale-95 disabled:opacity-60"
          :disabled="joining || code.trim().length < 6"
          @click="join(code)"
        >
          {{ joining ? '…' : t('room.join') }}
        </button>
      </div>

      <p v-if="errorKey" class="text-sm text-red-500 dark:text-red-400">{{ t(errorKey) }}</p>

      <div v-if="scanning" class="overflow-hidden rounded-2xl border border-stone-200 dark:border-stone-800">
        <video ref="videoEl" playsinline muted class="block max-h-72 w-full object-cover" />
        <button
          type="button"
          class="w-full py-2.5 text-sm font-semibold text-stone-500 dark:text-stone-400"
          @click="stopScan"
        >
          ✕ {{ t('room.scanStop') }}
        </button>
      </div>
      <button
        v-else
        type="button"
        class="w-full rounded-2xl border border-stone-300 py-3 text-sm font-semibold text-stone-600 active:scale-95 dark:border-stone-700 dark:text-stone-300"
        @click="startScan"
      >
        📷 {{ t('room.scan') }}
      </button>

      <p class="text-xs text-stone-400 dark:text-stone-500">{{ t('room.joinHint') }}</p>
    </div>
  </BottomSheet>
</template>
