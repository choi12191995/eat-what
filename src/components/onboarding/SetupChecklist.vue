<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { validateGoogleKey } from '@/lib/places/validateKey'
import { getCurrentLocation } from '@/composables/useOrigin'
import { useSettingsStore } from '@/stores/settings'

const { t } = useI18n()
const settings = useSettingsStore()

const keyDraft = ref(settings.googleApiKey)
const keyStatus = ref<'idle' | 'checking' | 'valid' | 'invalid' | 'network'>(
  settings.googleApiKey ? 'valid' : 'idle',
)
const locStatus = ref<'idle' | 'granted' | 'denied'>('idle')

const CONSOLE_LINKS = {
  project: 'https://console.cloud.google.com/projectcreate',
  library: 'https://console.cloud.google.com/apis/library/places.googleapis.com',
  credentials: 'https://console.cloud.google.com/apis/credentials',
  quotas: 'https://console.cloud.google.com/apis/api/places.googleapis.com/quotas',
}

const origin = computed(() => `${location.origin}/*`)

async function validate() {
  const key = keyDraft.value.trim()
  if (!key) return
  keyStatus.value = 'checking'
  const result = await validateGoogleKey(key)
  if (result.ok) {
    keyStatus.value = 'valid'
    settings.googleApiKey = key
  } else {
    keyStatus.value = result.reason === 'invalid' ? 'invalid' : 'network'
  }
}

async function grantLocation() {
  const fix = await getCurrentLocation()
  locStatus.value = fix.ok ? 'granted' : 'denied'
}

function close(dismiss: boolean) {
  if (dismiss) settings.setupDismissed = true
  settings.setupOpen = false
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="settings.setupOpen"
      class="fixed inset-0 z-[60] overflow-y-auto bg-orange-50 dark:bg-stone-950"
      role="dialog"
      aria-modal="true"
    >
      <div class="mx-auto max-w-md space-y-5 px-6 py-8 pb-24">
        <div>
          <h1 class="text-2xl font-black">🚀 {{ t('setup.title') }}</h1>
          <p class="mt-2 text-sm text-stone-600 dark:text-stone-400">{{ t('setup.intro') }}</p>
        </div>

        <!-- Step 1–3: Google console (manual ticks) -->
        <section
          v-for="step in (['project', 'restrict', 'cap'] as const)"
          :key="step"
          class="rounded-2xl border border-stone-200 p-4 dark:border-stone-800"
        >
          <label class="flex cursor-pointer items-start gap-3">
            <input
              v-model="settings.setupTicks[step]"
              type="checkbox"
              class="mt-1 h-5 w-5 accent-orange-500"
            />
            <span>
              <span class="block text-sm font-bold">{{ t(`setup.${step}T`) }}</span>
              <span class="mt-1 block text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                {{ t(`setup.${step}D`, { origin }) }}
              </span>
            </span>
          </label>
          <div class="mt-2 flex flex-wrap gap-3 pl-8 text-xs">
            <template v-if="step === 'project'">
              <a :href="CONSOLE_LINKS.project" target="_blank" rel="noopener" class="font-semibold text-orange-600 underline dark:text-orange-400">{{ t('setup.openConsole') }} ↗</a>
              <a :href="CONSOLE_LINKS.library" target="_blank" rel="noopener" class="font-semibold text-orange-600 underline dark:text-orange-400">{{ t('setup.enableApi') }} ↗</a>
            </template>
            <a v-else-if="step === 'restrict'" :href="CONSOLE_LINKS.credentials" target="_blank" rel="noopener" class="font-semibold text-orange-600 underline dark:text-orange-400">{{ t('setup.openCredentials') }} ↗</a>
            <a v-else :href="CONSOLE_LINKS.quotas" target="_blank" rel="noopener" class="font-semibold text-orange-600 underline dark:text-orange-400">{{ t('setup.openQuotas') }} ↗</a>
          </div>
        </section>

        <!-- Step 4: paste + validate -->
        <section class="rounded-2xl border border-stone-200 p-4 dark:border-stone-800">
          <p class="text-sm font-bold">
            <span v-if="keyStatus === 'valid'">✅</span><span v-else>🔑</span>
            {{ t('setup.keyT') }}
          </p>
          <p class="mt-1 text-xs text-stone-500 dark:text-stone-400">{{ t('setup.keyD') }}</p>
          <div class="mt-3 flex gap-2">
            <input
              v-model="keyDraft"
              type="text"
              autocomplete="off"
              spellcheck="false"
              :placeholder="t('setup.keyPlaceholder')"
              class="min-w-0 flex-1 rounded-xl border border-stone-300 bg-transparent px-3 py-2 font-mono text-xs outline-none focus:border-orange-500 dark:border-stone-700"
            />
            <button
              type="button"
              class="rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              :disabled="keyStatus === 'checking' || !keyDraft.trim()"
              @click="validate"
            >
              {{ keyStatus === 'checking' ? '…' : t('setup.validate') }}
            </button>
          </div>
          <p v-if="keyStatus === 'valid'" class="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            ✅ {{ t('setup.keyValid') }}
          </p>
          <p v-else-if="keyStatus === 'invalid'" class="mt-2 text-xs font-semibold text-red-500">
            {{ t('setup.keyInvalid') }}
          </p>
          <p v-else-if="keyStatus === 'network'" class="mt-2 text-xs font-semibold text-amber-600">
            {{ t('setup.keyNetwork') }}
          </p>
        </section>

        <!-- Step 5: location -->
        <section class="rounded-2xl border border-stone-200 p-4 dark:border-stone-800">
          <p class="text-sm font-bold">
            <span v-if="locStatus === 'granted'">✅</span><span v-else>📍</span>
            {{ t('setup.locT') }}
          </p>
          <p class="mt-1 text-xs text-stone-500 dark:text-stone-400">{{ t('setup.locD') }}</p>
          <button
            type="button"
            class="mt-3 rounded-xl border border-orange-300 bg-orange-500/10 px-4 py-2 text-sm font-semibold text-orange-600 dark:border-orange-800 dark:text-orange-400"
            @click="grantLocation"
          >
            {{ locStatus === 'granted' ? t('setup.locGranted') : t('setup.locGrant') }}
          </button>
          <p v-if="locStatus === 'denied'" class="mt-2 text-xs text-amber-600">
            {{ t('setup.locDenied') }}
          </p>
        </section>

        <div class="flex gap-2 pt-2">
          <button
            type="button"
            class="flex-1 rounded-xl border border-stone-300 px-3 py-3 text-sm text-stone-600 dark:border-stone-700 dark:text-stone-300"
            @click="close(true)"
          >
            🧪 {{ t('setup.useDemo') }}
          </button>
          <button
            type="button"
            class="flex-1 rounded-xl bg-orange-500 px-3 py-3 text-sm font-bold text-white shadow-md"
            @click="close(false)"
          >
            {{ t('setup.done') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
