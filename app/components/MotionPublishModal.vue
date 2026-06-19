<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })
const debateDays = defineModel<number>('debateDays', { default: 14 })
const isAnonymous = defineModel<boolean>('isAnonymous', { default: false })

const props = withDefaults(
  defineProps<{
    pending?: boolean
    error?: string
  }>(),
  {
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
      class="publish-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="publish-modal-title"
      @mousedown="onBackdropMouseDown"
      @click="onBackdropClick"
    >
      <FwCard class="publish-modal__card" glass pad>
        <button
          class="publish-modal__close"
          type="button"
          aria-label="Schließen"
          :disabled="pending"
          @click="close"
        >
          <FontAwesomeIcon icon="xmark" />
        </button>

        <h2 id="publish-modal-title" class="publish-modal__title">Antrag veröffentlichen</h2>
        <p class="publish-modal__lead">
          Mit der Veröffentlichung startet die Debattenphase. Der Antrag ist danach
          schreibgeschützt und kann nur noch über Änderungsvorschläge bearbeitet werden.
        </p>

        <div class="publish-modal__fields">
          <label class="field publish-modal__field">
            <span>Dauer der Debatte (Tage)</span>
            <input
              v-model.number="debateDays"
              type="number"
              min="1"
              max="90"
              :disabled="pending"
            >
          </label>

          <label class="publish-modal__check">
            <input v-model="isAnonymous" type="checkbox" :disabled="pending">
            <span>Anonym einreichen</span>
          </label>
          <p class="form-hint publish-modal__anon-hint">
            Dein Name wird öffentlich nicht angezeigt. Die Zuordnung bleibt intern für
            die Verwaltung des Antrags erhalten.
          </p>
        </div>

        <p v-if="error" class="form-error">{{ error }}</p>

        <div class="publish-modal__actions">
          <FwButton variant="ghost" type="button" :disabled="pending" @click="close">
            Abbrechen
          </FwButton>
          <FwButton variant="primary" type="button" :disabled="pending" @click="onConfirm">
            <FontAwesomeIcon icon="paper-plane" />
            {{ pending ? 'Veröffentlichen …' : 'Jetzt veröffentlichen' }}
          </FwButton>
        </div>
      </FwCard>
    </div>
  </Teleport>
</template>

<style scoped>
.publish-modal {
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

.dark .publish-modal {
  background: rgba(0, 0, 0, 0.55);
}

.publish-modal__card {
  position: relative;
  width: 100%;
  max-width: 440px;
  max-height: calc(100vh - var(--space-8));
  overflow-y: auto;
}

.publish-modal__close {
  position: absolute;
  top: var(--space-3);
  right: var(--space-3);
  display: flex;
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

.publish-modal__close:hover:not(:disabled) {
  color: var(--color-text);
  background: var(--color-bg);
}

.publish-modal__close:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.publish-modal__title {
  margin: 0 0 var(--space-2);
  padding-right: var(--space-6);
}

.publish-modal__lead {
  margin: 0 0 var(--space-5);
  color: var(--color-text-muted);
  font-size: 0.95rem;
  line-height: 1.5;
}

.publish-modal__fields {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.publish-modal__field {
  max-width: 220px;
  margin: 0;
}

.publish-modal__check {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-weight: 600;
  cursor: pointer;
}

.publish-modal__check input {
  width: auto;
  margin: 0;
}

.publish-modal__anon-hint {
  margin: calc(-1 * var(--space-2)) 0 0;
}

.publish-modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  margin-top: var(--space-5);
  flex-wrap: wrap;
}
</style>
