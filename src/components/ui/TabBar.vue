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
  <!-- Floating capsule nav, iOS 26 style: detached from the edges, glass
       material, pill highlight on the active tab -->
  <nav
    class="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-6"
    :style="{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.75rem)' }"
  >
    <div class="liquid-glass pointer-events-auto flex items-center rounded-full p-1.5">
      <RouterLink
        v-for="tab in tabs"
        :key="tab.to"
        :to="tab.to"
        class="flex min-w-[4.5rem] flex-col items-center gap-0.5 rounded-full px-4 py-1.5 text-[11px] transition-colors duration-200 active:scale-95"
        :class="
          route.path === tab.to
            ? 'bg-orange-500/15 font-semibold text-orange-600 dark:bg-orange-400/20 dark:text-orange-300'
            : 'text-stone-500 dark:text-stone-300'
        "
      >
        <span class="text-xl leading-none" aria-hidden="true">{{ tab.icon }}</span>
        <span>{{ t(tab.key) }}</span>
      </RouterLink>
    </div>
  </nav>
</template>
