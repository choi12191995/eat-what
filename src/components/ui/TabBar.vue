<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

const { t } = useI18n()
const route = useRoute()

const tabs = [
  { to: '/', key: 'nav.home', icon: '🎡' },
  { to: '/history', key: 'nav.history', icon: '🕘' },
  { to: '/settings', key: 'nav.settings', icon: '⚙️' },
]
</script>

<template>
  <nav
    class="fixed inset-x-0 bottom-0 border-t border-orange-200/60 bg-orange-50/90 backdrop-blur dark:border-stone-800 dark:bg-stone-950/90"
    :style="{ paddingBottom: 'env(safe-area-inset-bottom)' }"
  >
    <div class="mx-auto flex max-w-md">
      <RouterLink
        v-for="tab in tabs"
        :key="tab.to"
        :to="tab.to"
        class="flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors"
        :class="
          route.path === tab.to
            ? 'font-semibold text-orange-600 dark:text-orange-400'
            : 'text-stone-500 dark:text-stone-400'
        "
      >
        <span class="text-xl leading-none" aria-hidden="true">{{ tab.icon }}</span>
        <span>{{ t(tab.key) }}</span>
      </RouterLink>
    </div>
  </nav>
</template>
