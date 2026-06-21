<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    motionId: string
    parentId?: string
    replyToName?: string | null
    disabled?: boolean
    loggedIn?: boolean
    placeholder?: string
  }>(),
  {
    parentId: undefined,
    replyToName: null,
    disabled: false,
    loggedIn: true,
    placeholder: 'Nachricht schreiben …',
  },
)

const emit = defineEmits<{ sent: []; cancelReply: []; login: [] }>()

const { SESSION_EXPIRED_MESSAGE } = useAuthUser()

const bodyHtml = ref('')
const pending = ref(false)
const error = ref('')

const isEmpty = computed(
  () => bodyHtml.value.replace(/<[^>]*>/g, '').trim().length === 0,
)

async function onSubmit() {
  if (props.disabled || isEmpty.value || pending.value) return
  if (!props.loggedIn) {
    emit('login')
    return
  }
  error.value = ''
  pending.value = true
  try {
    await $fetch(`/api/motions/${props.motionId}/posts`, {
      method: 'POST',
      body: { bodyHtml: bodyHtml.value, parentId: props.parentId },
    })
    bodyHtml.value = ''
    emit('sent')
  } catch (err: unknown) {
    if (isUnauthorized(err)) {
      error.value = SESSION_EXPIRED_MESSAGE
      return
    }
    error.value = extractError(err, 'Nachricht konnte nicht gesendet werden.')
  } finally {
    pending.value = false
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    onSubmit()
  }
}
</script>

<template>
  <div class="composer" :class="{ 'composer--disabled': disabled }">
    <div v-if="replyToName" class="composer__reply">
      <span class="composer__reply-label">
        <FontAwesomeIcon icon="reply" />
        Antwort an {{ replyToName }}
      </span>
      <button type="button" class="composer__reply-cancel" aria-label="Antwort abbrechen" @click="emit('cancelReply')">
        <FontAwesomeIcon icon="xmark" />
      </button>
    </div>

    <form class="composer__field" @submit.prevent="onSubmit">
      <div class="composer__input" @keydown="onKeydown">
        <ClientOnly>
          <MotionEditor
            v-model="bodyHtml"
            variant="chat"
            :placeholder="placeholder"
          />
          <template #fallback>
            <div class="composer__loading"> … </div>
          </template>
        </ClientOnly>
      </div>
      <button
        type="submit"
        class="composer__send"
        :disabled="disabled || pending || isEmpty"
        aria-label="Senden"
      >
        <FontAwesomeIcon :icon="pending ? 'hourglass-end' : 'paper-plane'" />
      </button>
    </form>
    <p v-if="error" class="form-error composer__error">{{ error }}</p>
  </div>
</template>

<style scoped>
.composer {
  flex-shrink: 0;
  padding: 0;
  background: transparent;
}
.composer--disabled {
  opacity: 0.65;
  pointer-events: none;
}
.composer__reply {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin: 0 var(--space-3) var(--space-2);
  padding: var(--space-1) var(--space-2);
  border-left: 3px solid var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 8%, transparent);
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
  color: var(--color-text-muted);
}
.composer__reply-label {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.composer__reply-cancel {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  padding: 0;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
}
.composer__reply-cancel:hover {
  color: var(--color-text);
  background: var(--color-bg);
}
.composer__field {
  display: flex;
  align-items: flex-end;
  gap: var(--space-1);
  margin: 0 var(--space-3) var(--space-3);
  padding: var(--space-2) var(--space-2) var(--space-2) var(--space-3);
  border-radius: var(--radius-lg);
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  -webkit-backdrop-filter: blur(var(--glass-blur));
  backdrop-filter: blur(var(--glass-blur));
  box-shadow: var(--shadow-md);
}
.composer__input {
  flex: 1;
  min-width: 0;
}
.composer__input :deep(.editor),
.composer__input :deep(.editor__content),
.composer__input :deep(.editor__content--chat) {
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}
.composer__loading {
  padding: var(--space-2);
  color: var(--color-text-muted);
}
.composer__send {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  margin-bottom: 0.1rem;
  padding: 0;
  border: none;
  border-radius: var(--radius-pill);
  background: var(--color-accent);
  color: var(--color-accent-contrast);
  font-size: 0.85rem;
  cursor: pointer;
  transition: opacity 0.15s ease, transform 0.12s ease;
}
.composer__send:hover:not(:disabled) {
  transform: scale(1.05);
}
.composer__send:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.composer__error {
  margin: var(--space-1) var(--space-3) 0;
  font-size: 0.82rem;
}
</style>
