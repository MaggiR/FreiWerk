<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    motionId: string
    defaultOpen?: boolean
    // When set, the post is created as a reply to this post.
    parentId?: string
    // Reply mode: no standalone trigger button, cancel closes the form entirely.
    reply?: boolean
  }>(),
  { defaultOpen: false, reply: false },
)
const emit = defineEmits<{ created: []; cancel: [] }>()

const { SESSION_EXPIRED_MESSAGE } = useAuthUser()

const open = ref(props.defaultOpen || props.reply)
const bodyHtml = ref('')
const pending = ref(false)
const error = ref('')

const isEmpty = computed(
  () => bodyHtml.value.replace(/<[^>]*>/g, '').trim().length === 0,
)

function cancel() {
  bodyHtml.value = ''
  error.value = ''
  open.value = false
  emit('cancel')
}

async function onSubmit() {
  error.value = ''
  if (isEmpty.value) return
  pending.value = true
  try {
    await $fetch(`/api/motions/${props.motionId}/posts`, {
      method: 'POST',
      body: { bodyHtml: bodyHtml.value, parentId: props.parentId },
    })
    bodyHtml.value = ''
    open.value = false
    emit('created')
  } catch (err: unknown) {
    if (isUnauthorized(err)) {
      error.value = SESSION_EXPIRED_MESSAGE
      return
    }
    error.value = extractError(err, 'Beitrag konnte nicht gesendet werden.')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <button
    v-if="!open && !reply"
    type="button"
    class="post-form__trigger"
    @click="open = true"
  >
    <span class="post-form__trigger-icon">
      <FontAwesomeIcon icon="pen-to-square" />
    </span>
    <span>Beitrag verfassen</span>
  </button>

  <FwCard v-else-if="open" class="post-form" :class="{ 'post-form--reply': reply }">
    <form @submit.prevent="onSubmit">
      <div class="field">
        <span>{{ reply ? 'Deine Antwort' : 'Dein Diskussionsbeitrag' }}</span>
        <ClientOnly>
          <MotionEditor
            v-model="bodyHtml"
            placeholder="Bleib sachlich und respektvoll. Bring deine Argumente ein."
          />
          <template #fallback>
            <div class="editor-loading">Editor wird geladen ...</div>
          </template>
        </ClientOnly>
      </div>
      <p v-if="error" class="form-error">{{ error }}</p>
      <div class="post-form__actions">
        <FwButton type="button" variant="ghost" :disabled="pending" @click="cancel">
          Abbrechen
        </FwButton>
        <FwButton type="submit" :disabled="pending || isEmpty">
          <FontAwesomeIcon icon="paper-plane" />
          {{ pending ? 'Senden ...' : reply ? 'Antwort senden' : 'Beitrag senden' }}
        </FwButton>
      </div>
    </form>
  </FwCard>
</template>

<style scoped>
.post-form {
  margin-top: var(--space-4);
}
.post-form--reply {
  margin-top: var(--space-3);
}
.post-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  margin-top: var(--space-3);
}
.editor-loading {
  padding: var(--space-5);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
}
.post-form__trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  width: 100%;
  margin-top: var(--space-4);
  padding: var(--space-4) var(--space-5);
  font: inherit;
  font-weight: 600;
  color: var(--color-text-muted);
  background: transparent;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: color 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}
.post-form__trigger:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 7%, transparent);
}
.post-form__trigger-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--color-accent) 14%, transparent);
  color: var(--color-accent);
  font-size: 0.95rem;
}
</style>
