<script setup lang="ts">
const props = defineProps<{
  open: boolean
  src: string
  alt: string
}>()

const emit = defineEmits<{ close: [] }>()

const backdropPressed = ref(false)

function onBackdropMouseDown(event: MouseEvent) {
  backdropPressed.value = event.target === event.currentTarget
}

function onBackdropClick(event: MouseEvent) {
  if (backdropPressed.value && event.target === event.currentTarget) {
    emit('close')
  }
  backdropPressed.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.open) {
    emit('close')
  }
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      document.addEventListener('keydown', onKeydown)
      return
    }
    document.removeEventListener('keydown', onKeydown)
  },
)

onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="image-lightbox"
      role="dialog"
      aria-modal="true"
      :aria-label="alt"
      @mousedown="onBackdropMouseDown"
      @click="onBackdropClick"
    >
      <button
        class="image-lightbox__close"
        type="button"
        aria-label="Schließen"
        @click="emit('close')"
      >
        <FontAwesomeIcon icon="xmark" />
      </button>
      <img :src="src" :alt="alt" class="image-lightbox__image" @click.stop>
    </div>
  </Teleport>
</template>

<style scoped>
.image-lightbox {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-6);
  background: rgba(3, 45, 103, 0.55);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.dark .image-lightbox {
  background: rgba(0, 0, 0, 0.75);
}

.image-lightbox__close {
  position: absolute;
  top: var(--space-4);
  right: var(--space-4);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: var(--color-bg-elevated);
  color: var(--color-text);
  cursor: pointer;
}

.image-lightbox__image {
  max-width: min(90vw, 560px);
  max-height: min(80vh, 560px);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  object-fit: contain;
}
</style>
