<script setup lang="ts">
const props = defineProps<{ motionId: string }>()
const emit = defineEmits<{ created: [] }>()

const text = ref('')
const pending = ref(false)
const error = ref('')

function toHtml(raw: string): string {
  return raw
    .trim()
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

async function onSubmit() {
  error.value = ''
  if (text.value.trim().length === 0) return
  pending.value = true
  try {
    await $fetch(`/api/motions/${props.motionId}/posts`, {
      method: 'POST',
      body: { bodyHtml: toHtml(text.value) },
    })
    text.value = ''
    emit('created')
  } catch (err: unknown) {
    error.value = extractError(err, 'Beitrag konnte nicht gesendet werden.')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <FwCard class="post-form">
    <form @submit.prevent="onSubmit">
      <label class="field">
        <span>Dein Diskussionsbeitrag</span>
        <textarea
          v-model="text"
          rows="4"
          maxlength="10000"
          placeholder="Bleib sachlich und respektvoll."
        />
      </label>
      <p v-if="error" class="form-error">{{ error }}</p>
      <div class="post-form__actions">
        <FwButton type="submit" :disabled="pending || text.trim().length === 0">
          <FontAwesomeIcon icon="paper-plane" />
          {{ pending ? 'Senden ...' : 'Beitrag senden' }}
        </FwButton>
      </div>
    </form>
  </FwCard>
</template>

<style scoped>
.post-form {
  margin-top: var(--space-4);
}
.post-form__actions {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--space-3);
}
</style>
