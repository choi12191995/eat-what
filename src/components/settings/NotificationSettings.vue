<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { watchDebounced } from '@vueuse/core'

import {
  disablePush,
  enablePush,
  getExistingSubscription,
  pushSupport,
  sendTestPush,
  syncPrefs,
} from '@/lib/push/client'
import { useSettingsStore } from '@/stores/settings'

const { t } = useI18n()
const settings = useSettingsStore()

const support = pushSupport()
const state = ref<'off' | 'pending' | 'on' | 'denied'>('off')
const testState = ref<'idle' | 'sending' | 'sent' | 'failed'>('idle')
const showServerError = ref(false)

const tz = Intl.DateTimeFormat().resolvedOptions().timeZone

/** Monday-first display order over JS weekday numbers */
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]
const MEALS = [
  { id: 'lunch', emoji: '🍜' },
  { id: 'dinner', emoji: '🍚' },
] as const

onMounted(async () => {
  if (support !== 'ok') return
  if (Notification.permission === 'denied') {
    state.value = 'denied'
    return
  }
  if (Notification.permission === 'granted' && (await getExistingSubscription())) {
    state.value = 'on'
  }
})

async function enable() {
  state.value = 'pending'
  showServerError.value = false
  const result = await enablePush(settings.notifications, settings.locale)
  if (result.ok) {
    state.value = 'on'
  } else if (result.reason === 'denied') {
    state.value = 'denied'
  } else {
    state.value = 'off'
    showServerError.value = true
  }
}

async function disable() {
  await disablePush()
  state.value = 'off'
}

function toggleDay(meal: 'lunch' | 'dinner', day: number) {
  const days = settings.notifications[meal].days
  const i = days.indexOf(day)
  if (i >= 0) days.splice(i, 1)
  else days.push(day)
}

// Push edits (times/days/toggles, or a language switch) to the worker
watchDebounced(
  () => JSON.stringify(settings.notifications) + settings.locale,
  async () => {
    if (state.value !== 'on') return
    const sub = await getExistingSubscription()
    if (sub) await syncPrefs(sub, settings.notifications, settings.locale)
  },
  { debounce: 800 },
)

async function onTest() {
  testState.value = 'sending'
  testState.value = (await sendTestPush()) ? 'sent' : 'failed'
  setTimeout(() => (testState.value = 'idle'), 4000)
}
</script>

<template>
  <section class="mb-8">
    <h2 class="mb-2 text-sm font-semibold tracking-wide text-stone-500 uppercase dark:text-stone-400">
      🔔 {{ t('settings.notif.title') }}
    </h2>
    <p class="mb-3 text-xs text-stone-500 dark:text-stone-400">
      {{ t('settings.notif.intro', { tz }) }}
    </p>

    <p
      v-if="support === 'iosInstall'"
      class="rounded-xl bg-sky-50 px-3 py-2.5 text-xs leading-relaxed text-sky-800 dark:bg-sky-950 dark:text-sky-200"
    >
      📲 {{ t('settings.notif.iosInstall') }}
    </p>
    <p v-else-if="support === 'unsupported'" class="text-xs text-stone-400 dark:text-stone-500">
      {{ t('settings.notif.unsupported') }}
    </p>

    <template v-else>
      <p
        v-if="state === 'denied'"
        class="rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-800 dark:bg-amber-950 dark:text-amber-200"
      >
        {{ t('settings.notif.denied') }}
      </p>

      <template v-else-if="state !== 'on'">
        <button
          type="button"
          class="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          :disabled="state === 'pending'"
          @click="enable"
        >
          {{ state === 'pending' ? '…' : t('settings.notif.enable') }}
        </button>
        <p v-if="showServerError" class="mt-2 text-xs font-semibold text-amber-600">
          {{ t('settings.notif.serverError') }}
        </p>
      </template>

      <template v-else>
        <div class="space-y-3">
          <div
            v-for="meal in MEALS"
            :key="meal.id"
            class="rounded-2xl border border-stone-200 p-3.5 dark:border-stone-800"
          >
            <label class="flex cursor-pointer items-center justify-between">
              <span class="text-sm font-bold">{{ meal.emoji }} {{ t(`history.${meal.id}`) }}</span>
              <input
                v-model="settings.notifications[meal.id].enabled"
                type="checkbox"
                class="h-5 w-5 accent-orange-500"
              />
            </label>
            <div v-if="settings.notifications[meal.id].enabled" class="mt-3 space-y-2.5">
              <label class="flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400">
                {{ t('settings.notif.time') }}
                <input
                  v-model="settings.notifications[meal.id].time"
                  type="time"
                  required
                  class="rounded-lg border border-stone-300 bg-transparent px-2 py-1 text-sm font-semibold text-stone-800 dark:border-stone-700 dark:text-stone-100"
                />
              </label>
              <div class="flex gap-1.5">
                <button
                  v-for="d in DAY_ORDER"
                  :key="d"
                  type="button"
                  class="h-8 w-8 rounded-full text-xs font-bold transition-colors"
                  :class="
                    settings.notifications[meal.id].days.includes(d)
                      ? 'bg-orange-500 text-white'
                      : 'bg-stone-100 text-stone-400 dark:bg-stone-800 dark:text-stone-500'
                  "
                  @click="toggleDay(meal.id, d)"
                >
                  {{ t(`settings.notif.day${d}`) }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <p class="mt-3 text-[11px] leading-relaxed text-stone-400 dark:text-stone-500">
          🔒 {{ t('settings.notif.privacy') }}
        </p>
        <div class="mt-2 flex items-center gap-4">
          <button
            type="button"
            class="rounded-xl border border-orange-300 bg-orange-500/10 px-3 py-2 text-xs font-semibold text-orange-600 disabled:opacity-50 dark:border-orange-800 dark:text-orange-400"
            :disabled="testState === 'sending'"
            @click="onTest"
          >
            {{
              testState === 'sending'
                ? '…'
                : testState === 'sent'
                  ? '✅ ' + t('settings.notif.testSent')
                  : testState === 'failed'
                    ? t('settings.notif.testFailed')
                    : t('settings.notif.test')
            }}
          </button>
          <button
            type="button"
            class="text-xs text-stone-400 underline dark:text-stone-500"
            @click="disable"
          >
            {{ t('settings.notif.disableAll') }}
          </button>
        </div>
      </template>
    </template>
  </section>
</template>
