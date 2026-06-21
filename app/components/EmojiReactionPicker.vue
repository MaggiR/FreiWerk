<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{ select: [emoji: string] }>()

const customEmoji = ref('')
const pickerRef = ref<HTMLElement | null>(null)

const quickEmojis = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '👏', '🎉', '💯']

function pick(emoji: string) {
  emit('select', emoji)
  open.value = false
  customEmoji.value = ''
}

function onCustomInput() {
  const match = customEmoji.value.match(/\p{Extended_Pictographic}/u)
  if (match) {
    pick(match[0])
  }
}

function onClickOutside(event: MouseEvent) {
  if (!open.value) return
  const el = pickerRef.value
  if (el && !el.contains(event.target as Node)) {
    open.value = false
  }
}

onMounted(() => document.addEventListener('click', onClickOutside, true))
onUnmounted(() => document.removeEventListener('click', onClickOutside, true))
</script>

<template>
  <div ref="pickerRef" class="emoji-picker">
    <button
      type="button"
      class="emoji-picker__trigger"
      aria-label="Emoji hinzufügen"
      @click.stop="open = !open"
    >
      <FontAwesomeIcon icon="face-smile" />
    </button>

    <div v-if="open" class="emoji-picker__panel" role="dialog" aria-label="Emoji auswählen">
      <div class="emoji-picker__quick">
        <button
          v-for="emoji in quickEmojis"
          :key="emoji"
          type="button"
          class="emoji-picker__emoji"
          @click="pick(emoji)"
        >
          {{ emoji }}
        </button>
      </div>
      <label class="emoji-picker__custom">
        <span class="visually-hidden">Beliebiges Emoji eingeben</span>
        <input
          v-model="customEmoji"
          type="text"
          inputmode="text"
          placeholder="Emoji einfügen …"
          maxlength="8"
          @input="onCustomInput"
          @keydown.enter.prevent="onCustomInput"
        >
      </label>
      <p class="emoji-picker__hint">Tipp: Win+. oder Cmd+Strg+Leertaste</p>
    </div>
  </div>
</template>

<style scoped>
.emoji-picker {
  position: relative;
  display: inline-flex;
}
.emoji-picker__trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  border: none;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease;
}
.emoji-picker__trigger:hover {
  color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 10%, transparent);
}
.emoji-picker__panel {
  position: absolute;
  bottom: calc(100% + var(--space-2));
  right: 0;
  z-index: 40;
  width: min(16rem, calc(100vw - 2rem));
  padding: var(--space-3);
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
}
.emoji-picker__quick {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  margin-bottom: var(--space-2);
}
.emoji-picker__emoji {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  font-size: 1.15rem;
  cursor: pointer;
  transition: background 0.15s ease;
}
.emoji-picker__emoji:hover {
  background: var(--color-bg);
}
.emoji-picker__custom input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  font: inherit;
  font-size: 1.1rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
}
.emoji-picker__hint {
  margin: var(--space-2) 0 0;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}
</style>
