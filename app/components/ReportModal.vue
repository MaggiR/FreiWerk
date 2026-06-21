<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  targetType: 'motion' | 'post'
  targetId: string | null
}>()

const emit = defineEmits<{ reported: [] }>()

const { SESSION_EXPIRED_MESSAGE } = useAuthUser()

const reason = ref('')
const pending = ref(false)
const error = ref('')
const done = ref(false)

watch(open, (isOpen) => {
  if (isOpen) {
    reason.value = ''
    error.value = ''
    done.value = false
  }
})

const isEmpty = computed(() => reason.value.trim().length < 10)

function close() {
  if (!pending.value) open.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value && !pending.value) {
    open.value = false
  }
}

async function onSubmit() {
  if (isEmpty.value || !props.targetId) return
  error.value = ''
  pending.value = true
  try {
    await $fetch('/api/reports', {
      method: 'POST',
      body: {
        targetType: props.targetType,
        targetId: props.targetId,
        reason: reason.value,
      },
    })
    done.value = true
    emit('reported')
  } catch (err: unknown) {
    if (isUnauthorized(err)) {
      error.value = SESSION_EXPIRED_MESSAGE
      return
    }
    error.value = extractError(err, 'Meldung konnte nicht gesendet werden.')
  } finally {
    pending.value = false
  }
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="report-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      @click.self="close"
    >
      <FwCard class="report-modal__card" glass pad>
        <button
          class="report-modal__close"
          type="button"
          aria-label="Schließen"
          :disabled="pending"
          @click="close"
        >
          <FontAwesomeIcon icon="xmark" />
        </button>

        <h2 id="report-modal-title" class="report-modal__title">
          {{ targetType === 'motion' ? 'Antrag melden' : 'Beitrag melden' }}
        </h2>

        <template v-if="done">
          <p class="report-modal__done">
            <FontAwesomeIcon icon="circle-check" />
            Danke. Deine Meldung wurde an die Moderation übermittelt.
          </p>
          <div class="report-modal__actions">
            <FwButton variant="primary" type="button" @click="close">
              Schließen
            </FwButton>
          </div>
        </template>

        <template v-else>
          <p class="report-modal__lead">
            Beschreibe kurz, warum dieser Inhalt gegen die Debattenkultur verstößt.
            Die Moderation prüft jede Meldung.
          </p>
          <form @submit.prevent="onSubmit">
            <label class="field">
              <span>Begründung</span>
              <textarea
                v-model="reason"
                rows="4"
                maxlength="1000"
                :disabled="pending"
                placeholder="Was ist das Problem mit diesem Inhalt?"
              />
            </label>
            <p v-if="error" class="form-error">{{ error }}</p>
            <div class="report-modal__actions">
              <FwButton variant="ghost" type="button" :disabled="pending" @click="close">
                Abbrechen
              </FwButton>
              <FwButton variant="primary" type="submit" :disabled="pending || isEmpty">
                <FontAwesomeIcon icon="flag" />
                {{ pending ? 'Senden …' : 'Meldung senden' }}
              </FwButton>
            </div>
          </form>
        </template>
      </FwCard>
    </div>
  </Teleport>
</template>

<style scoped>
.report-modal {
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
.dark .report-modal {
  background: rgba(0, 0, 0, 0.55);
}
.report-modal__card {
  position: relative;
  width: 100%;
  max-width: 440px;
  max-height: calc(100vh - var(--space-8));
  overflow-y: auto;
}
.report-modal__close {
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
.report-modal__close:hover:not(:disabled) {
  color: var(--color-text);
  background: var(--color-bg);
}
.report-modal__title {
  margin: 0 0 var(--space-2);
  padding-right: var(--space-6);
}
.report-modal__lead {
  margin: 0 0 var(--space-4);
  color: var(--color-text-muted);
  font-size: 0.95rem;
  line-height: 1.5;
}
.report-modal__done {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0 0 var(--space-4);
  color: var(--color-text);
}
.report-modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  margin-top: var(--space-4);
  flex-wrap: wrap;
}
</style>
