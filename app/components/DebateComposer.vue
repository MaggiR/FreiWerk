<script setup lang="ts">
import { REFERENCE_ICONS, type ReferenceDraft } from '~/utils/references'

const props = withDefaults(
  defineProps<{
    motionId: string
    motionVersion?: number | null
    parentId?: string
    replyToName?: string | null
    disabled?: boolean
    loggedIn?: boolean
    placeholder?: string
  }>(),
  {
    motionVersion: null,
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

const references = ref<ReferenceDraft[]>([])
const pickerOpen = ref(false)

const selectedKeys = computed(
  () => new Set(references.value.map((r) => `${r.targetType}:${r.targetId}`)),
)

function addReference(ref: ReferenceDraft) {
  // Excerpts may repeat; element references are unique by target.
  if (
    ref.targetType !== 'motion_excerpt' &&
    selectedKeys.value.has(`${ref.targetType}:${ref.targetId}`)
  ) {
    return
  }
  references.value.push(ref)
}

function removeReference(index: number) {
  references.value.splice(index, 1)
}

function openPicker() {
  if (!props.loggedIn) {
    emit('login')
    return
  }
  pickerOpen.value = true
}

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
      body: {
        bodyHtml: bodyHtml.value,
        parentId: props.parentId,
        references: references.value.map((r) => ({
          targetType: r.targetType,
          targetId: r.targetId,
          excerptText: r.excerptText,
          excerptVersion: r.excerptVersion,
        })),
      },
    })
    bodyHtml.value = ''
    references.value = []
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

    <ul v-if="references.length > 0" class="composer__refs">
      <li v-for="(ref, index) in references" :key="index" class="composer__ref">
        <FontAwesomeIcon class="composer__ref-icon" :icon="REFERENCE_ICONS[ref.targetType]" />
        <span class="composer__ref-label">{{ ref.label }}</span>
        <button
          type="button"
          class="composer__ref-remove"
          aria-label="Bezug entfernen"
          @click="removeReference(index)"
        >
          <FontAwesomeIcon icon="xmark" />
        </button>
      </li>
    </ul>

    <form class="composer__field" @submit.prevent="onSubmit">
      <button
        type="button"
        class="composer__ref-add"
        aria-label="Bezug hinzufügen"
        title="Bezug hinzufügen"
        @click="openPicker"
      >
        <FontAwesomeIcon icon="link" />
      </button>
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

    <ReferencePicker
      v-model:open="pickerOpen"
      :motion-id="motionId"
      :motion-version="motionVersion"
      :selected-keys="selectedKeys"
      @add="addReference"
    />
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
.composer__refs {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  margin: 0 var(--space-3) var(--space-2);
  padding: 0;
  list-style: none;
}
.composer__ref {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  max-width: 16rem;
  padding: 0.15rem var(--space-2);
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--color-accent) 12%, var(--color-surface));
  border: 1px solid color-mix(in srgb, var(--color-accent) 30%, var(--color-border));
  font-size: 0.76rem;
  color: var(--color-text);
}
.composer__ref-icon {
  flex-shrink: 0;
  font-size: 0.7rem;
  color: var(--color-accent);
}
.composer__ref-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.composer__ref-remove {
  flex-shrink: 0;
  display: inline-flex;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
  font-size: 0.7rem;
  cursor: pointer;
}
.composer__ref-remove:hover {
  color: var(--color-danger);
}
.composer__ref-add {
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
  background: transparent;
  color: var(--color-text-muted);
  font-size: 0.85rem;
  cursor: pointer;
  transition: color 0.15s ease, background 0.15s ease;
}
.composer__ref-add:hover {
  color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 12%, transparent);
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
