<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const DISMISS_KEY = 'ew.iosHintDismissed'
const dismissed = ref(localStorage.getItem(DISMISS_KEY) === '1')

const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
const isStandalone =
  window.matchMedia('(display-mode: standalone)').matches ||
  ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true)

const show = computed(() => isIos && !isStandalone && !dismissed.value)

function dismiss() {
  dismissed.value = true
  localStorage.setItem(DISMISS_KEY, '1')
}
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-x-4 bottom-28 z-40 mx-auto max-w-sm rounded-2xl border border-orange-200 bg-white p-4 shadow-xl dark:border-stone-700 dark:bg-stone-900"
  >
    <p class="text-sm font-semibold">📲 {{ t('pwa.iosTitle') }}</p>
    <p class="mt-1 text-xs text-stone-500 dark:text-stone-400">{{ t('pwa.iosHint') }}</p>
    <button
      type="button"
      class="mt-2 text-xs font-semibold text-orange-600 underline dark:text-orange-400"
      @click="dismiss"
    >
      {{ t('pwa.gotIt') }}
    </button>
  </div>
</template>
