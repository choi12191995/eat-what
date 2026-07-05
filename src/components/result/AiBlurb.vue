<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import type { Restaurant } from '@/types/models'
import { aiConfigured, blurb } from '@/lib/ai/client'
import { useSettingsStore } from '@/stores/settings'

const props = defineProps<{ restaurant: Restaurant }>()

const { locale } = useI18n()
const settings = useSettingsStore()
const line = ref<string | null>(null)

watch(
  () => props.restaurant.id,
  async () => {
    line.value = null
    const cfg = {
      baseUrl: settings.aiBaseUrl,
      apiKey: settings.aiApiKey,
      model: settings.aiModel,
    }
    if (!aiConfigured(cfg)) return
    line.value = await blurb(cfg, props.restaurant, locale.value)
  },
  { immediate: true },
)
</script>

<template>
  <p v-if="line" class="text-sm text-stone-500 italic dark:text-stone-400">🤖 {{ line }}</p>
</template>
