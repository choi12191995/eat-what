<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRegisterSW } from 'virtual:pwa-register/vue'

const { t } = useI18n()
const { needRefresh, updateServiceWorker } = useRegisterSW({ immediate: true })
</script>

<template>
  <Transition
    enter-active-class="transition duration-300"
    enter-from-class="translate-y-4 opacity-0"
    leave-active-class="transition duration-200"
    leave-to-class="opacity-0"
  >
    <button
      v-if="needRefresh"
      type="button"
      class="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white shadow-xl dark:bg-white dark:text-stone-900"
      @click="updateServiceWorker()"
    >
      ✨ {{ t('pwa.updated') }}
    </button>
  </Transition>
</template>
