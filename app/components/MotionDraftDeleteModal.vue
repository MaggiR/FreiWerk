<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })

const props = withDefaults(
  defineProps<{
    /** Draft contains title, text, or other saved content. */
    hasContent?: boolean
    pending?: boolean
    error?: string
  }>(),
  {
    hasContent: false,
    pending: false,
    error: '',
  },
)

const emit = defineEmits<{ confirm: [] }>()

const backdropPressed = ref(false)

function onBackdropMouseDown(event: MouseEvent) {
  backdropPressed.value = event.target === event.currentTarget
}

function onBackdropClick(event: MouseEvent) {
  if (backdropPressed.value && event.target === event.currentTarget && !props.pending) {
    open.value = false
  }
  backdropPressed.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value && !props.pending) {
    open.value = false
  }
}

function close() {
  if (!props.pending) open.value = false
}

function onConfirm() {
  emit('confirm')
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="delete-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      @mousedown="onBackdropMouseDown"
      @click="onBackdropClick"
    >
      <FwCard class="delete-modal__card" glass pad>
        <button
          class="delete-modal__close"
          type="button"
          aria-label="Schließen"
          :disabled="pending"
          @click="close"
        >
          <FontAwesomeIcon icon="xmark" />
        </button>

        <h2 id="delete-modal-title" class="delete-modal__title">
          {{ hasContent ? 'Entwurf mit Inhalt löschen?' : 'Entwurf löschen?' }}
        </h2>
        <p v-if="hasContent" class="delete-modal__lead delete-modal__lead--warn">
          Dieser Entwurf enthält bereits Text oder Angaben. Beim Löschen gehen Titel,
          Kurzbeschreibung und Antragstext unwiderruflich verloren.
        </p>
        <p v-else class="delete-modal__lead">
          Der leere Entwurf wird endgültig entfernt.
        </p>

        <p v-if="error" class="form-error">{{ error }}</p>

        <div class="delete-modal__actions">
          <FwButton variant="ghost" type="button" :disabled="pending" @click="close">
            Abbrechen
          </FwButton>
          <FwButton variant="danger" type="button" :disabled="pending" @click="onConfirm">
            <FontAwesomeIcon icon="trash" />
            {{ pending ? 'Löschen …' : 'Endgültig löschen' }}
          </FwButton>
        </div>
      </FwCard>
    </div>
  </Teleport>
</template>

<style scoped>
.delete-modal {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background: rgba(3, 45, 103, 0.35);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.dark .delete-modal {
  background: rgba(0, 0, 0, 0.55);
}

.delete-modal__card {
  position: relative;
  width: 100%;
  max-width: 440px;
}

.delete-modal__close {
  position: absolute;
  top: var(--space-3);
  right: var(--space-3);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
}

.delete-modal__close:hover:not(:disabled) {
  color: var(--color-text);
  background: color-mix(in srgb, var(--color-border) 50%, transparent);
}

.delete-modal__title {
  margin: 0 0 var(--space-3);
  padding-right: 2rem;
}

.delete-modal__lead {
  margin: 0;
  color: var(--color-text-muted);
  line-height: 1.5;
}

.delete-modal__lead--warn {
  color: var(--color-text);
}

.delete-modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  margin-top: var(--space-5);
  flex-wrap: wrap;
}
</style>
