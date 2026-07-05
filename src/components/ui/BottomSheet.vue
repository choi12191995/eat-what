<script setup lang="ts">
defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-40 bg-black/50"
        aria-hidden="true"
        @click="emit('close')"
      />
    </Transition>
    <Transition
      enter-active-class="transition-transform duration-300 ease-out"
      leave-active-class="transition-transform duration-250 ease-in"
      enter-from-class="translate-y-full"
      leave-to-class="translate-y-full"
    >
      <div
        v-if="open"
        class="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white shadow-2xl dark:bg-stone-900"
        :style="{ paddingBottom: 'max(env(safe-area-inset-bottom), 1rem)' }"
        role="dialog"
        aria-modal="true"
      >
        <div class="sticky top-0 z-10 flex justify-center bg-white/90 pt-3 pb-2 backdrop-blur dark:bg-stone-900/90">
          <button
            class="h-1.5 w-12 rounded-full bg-stone-300 dark:bg-stone-700"
            aria-label="close"
            @click="emit('close')"
          />
        </div>
        <slot />
      </div>
    </Transition>
  </Teleport>
</template>
