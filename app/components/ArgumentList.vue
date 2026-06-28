<script setup lang="ts">
import type { ArgumentItem, ArgumentListResponse } from '#shared/types'
import {
  ARGUMENT_STANCE_LABELS,
  ARGUMENT_TITLE_MIN,
  ARGUMENT_TITLE_MAX,
} from '#shared/constants'

const props = defineProps<{ motionId: string; debateOpen: boolean }>()
const sortMode = defineModel<'top' | 'recent'>('sortMode', { default: 'top' })
const itemCount = defineModel<number>('itemCount', { default: 0 })

const { loggedIn, SESSION_EXPIRED_MESSAGE } = useAuthUser()
const { open: openAuthModal } = useAuthModal()
const toast = useToast()

const { data, refresh, pending } = await useFetch<ArgumentListResponse>(
  () => `/api/motions/${props.motionId}/arguments`,
  { key: computed(() => `arguments-${props.motionId}`) },
)

const canModerate = computed(() => data.value?.canModerate ?? false)
const allArguments = computed<ArgumentItem[]>(() => data.value?.arguments ?? [])

watchEffect(() => {
  itemCount.value = allArguments.value.length
})

function sortArgs(list: ArgumentItem[]): ArgumentItem[] {
  return [...list].sort((a, b) => {
    if (sortMode.value === 'top' && b.upvoteCount !== a.upvoteCount) {
      return b.upvoteCount - a.upvoteCount
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

const proArgs = computed(() =>
  sortArgs(allArguments.value.filter((a) => a.stance === 'pro')),
)
const conArgs = computed(() =>
  sortArgs(allArguments.value.filter((a) => a.stance === 'con')),
)

// ---- proposal form ----
const showForm = ref(false)
const formStance = ref<'pro' | 'con'>('pro')
const formTitle = ref('')
const formBody = ref('')
const submitting = ref(false)
const formError = ref('')

const titleLen = computed(() => formTitle.value.trim().length)
const bodyEmpty = computed(
  () => formBody.value.replace(/<[^>]*>/g, '').trim().length === 0,
)
const canSubmit = computed(
  () =>
    titleLen.value >= ARGUMENT_TITLE_MIN &&
    titleLen.value <= ARGUMENT_TITLE_MAX &&
    !bodyEmpty.value &&
    !submitting.value,
)

function openForm(stance: 'pro' | 'con') {
  if (!loggedIn.value) {
    openAuthModal('login')
    return
  }
  formStance.value = stance
  formError.value = ''
  showForm.value = true
}

function resetForm() {
  showForm.value = false
  formTitle.value = ''
  formBody.value = ''
  formError.value = ''
}

async function submitArgument() {
  if (!canSubmit.value) return
  submitting.value = true
  formError.value = ''
  try {
    await $fetch(`/api/motions/${props.motionId}/arguments`, {
      method: 'POST',
      body: {
        stance: formStance.value,
        title: formTitle.value.trim(),
        bodyHtml: formBody.value,
      },
    })
    resetForm()
    await refresh()
    toast.success(
      canModerate.value
        ? 'Argument veröffentlicht.'
        : 'Argument zur Prüfung eingereicht.',
    )
  } catch (err: unknown) {
    if (isUnauthorized(err)) {
      formError.value = SESSION_EXPIRED_MESSAGE
      return
    }
    formError.value = extractError(err, 'Argument konnte nicht gespeichert werden.')
  } finally {
    submitting.value = false
  }
}

// ---- moderation ----
async function moderate(
  arg: ArgumentItem,
  payload: {
    status?: 'accepted' | 'rejected'
    deliberationStatus?: 'open' | 'confirmed' | 'refuted'
  },
) {
  try {
    await $fetch(`/api/arguments/${arg.id}`, { method: 'PATCH', body: payload })
    await refresh()
  } catch (err: unknown) {
    toast.error(extractError(err, 'Aktion fehlgeschlagen.'))
  }
}

</script>

<template>
  <div class="args" lang="de">
    <p v-if="pending" class="args__loading">Argumente werden geladen …</p>

    <div v-else class="args__columns">
      <section
        v-for="col in [
          { key: 'pro', label: ARGUMENT_STANCE_LABELS.pro, items: proArgs, icon: 'circle-plus' },
          { key: 'con', label: ARGUMENT_STANCE_LABELS.con, items: conArgs, icon: 'circle-minus' },
        ]"
        :key="col.key"
        class="args__col"
        :class="`args__col--${col.key}`"
      >
        <header class="args__col-head">
          <h3 class="args__col-title">
            <FontAwesomeIcon :icon="col.icon" /> {{ col.label }}
            <span class="args__col-count">{{ col.items.length }}</span>
          </h3>
          <button
            v-if="debateOpen"
            type="button"
            class="args__add"
            @click="openForm(col.key as 'pro' | 'con')"
          >
            <FontAwesomeIcon icon="plus" /> Argument
          </button>
        </header>

        <p v-if="col.items.length === 0" class="args__empty">
          Noch keine {{ col.label }}-Argumente.
        </p>

        <ArgumentListItem
          v-for="arg in col.items"
          :key="arg.id"
          :argument="arg"
          :can-moderate="canModerate"
          @moderate="(payload) => moderate(arg, payload)"
        />
      </section>
    </div>

    <!-- Proposal form -->
    <div v-if="showForm" class="args__form-overlay" @click.self="resetForm">
      <form class="args__form" @submit.prevent="submitArgument">
        <div class="args__form-head">
          <h3>
            {{ canModerate ? 'Argument verfassen' : 'Argument vorschlagen' }}
          </h3>
          <div class="args__stance-toggle">
            <button
              type="button"
              :class="{ 'is-active': formStance === 'pro' }"
              @click="formStance = 'pro'"
            >
              <FontAwesomeIcon icon="thumbs-up" /> {{ ARGUMENT_STANCE_LABELS.pro }}
            </button>
            <button
              type="button"
              :class="{ 'is-active': formStance === 'con' }"
              @click="formStance = 'con'"
            >
              <FontAwesomeIcon icon="thumbs-down" /> {{ ARGUMENT_STANCE_LABELS.con }}
            </button>
          </div>
        </div>

        <input
          v-model="formTitle"
          type="text"
          class="args__form-title"
          placeholder="Kernaussage des Arguments …"
          :maxlength="ARGUMENT_TITLE_MAX"
        >

        <div class="args__form-body">
          <ClientOnly>
            <MotionEditor v-model="formBody" placeholder="Begründung …" />
          </ClientOnly>
        </div>

        <p v-if="formError" class="form-error">{{ formError }}</p>
        <p v-if="!canModerate" class="args__form-hint app-hint">
          Vorgeschlagene Argumente werden vom Antragsteller geprüft, bevor sie
          öffentlich erscheinen.
        </p>

        <div class="args__form-actions">
          <FwButton type="button" variant="ghost" @click="resetForm">
            Abbrechen
          </FwButton>
          <FwButton type="submit" variant="primary" :disabled="!canSubmit">
            {{ submitting ? 'Speichern …' : canModerate ? 'Veröffentlichen' : 'Einreichen' }}
          </FwButton>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.args {
  container-type: inline-size;
  container-name: args;
  min-width: 0;
  max-width: 100%;
}
.args__loading,
.args__empty {
  padding: var(--space-3);
  color: var(--color-text-muted);
  font-size: 0.88rem;
}
.args__columns {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-4);
  min-width: 0;
}
@container args (min-width: 560px) {
  .args__columns {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
}
.args__col {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
  max-width: 100%;
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-top: 3px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
}
.args__col--pro {
  border-top-color: var(--color-success);
  background: color-mix(in srgb, var(--color-success) 4%, var(--color-bg));
}
.args__col--con {
  border-top-color: var(--color-danger);
  background: color-mix(in srgb, var(--color-danger) 4%, var(--color-bg));
}
.args__col-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  min-width: 0;
}
.args__col-title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: 0;
  min-width: 0;
  font-size: 1.05rem;
  overflow-wrap: anywhere;
}
.args__col--pro .args__col-title {
  color: var(--color-success);
}
.args__col--con .args__col-title {
  color: var(--color-danger);
}
.args__col-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.4rem;
  padding: 0.05rem var(--space-2);
  border-radius: var(--radius-pill);
  font-size: 0.78rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.args__col--pro .args__col-count {
  background: color-mix(in srgb, var(--color-success) 14%, var(--color-bg));
  border: 1px solid color-mix(in srgb, var(--color-success) 35%, var(--color-border));
  color: var(--color-success);
}
.args__col--con .args__col-count {
  background: color-mix(in srgb, var(--color-danger) 14%, var(--color-bg));
  border: 1px solid color-mix(in srgb, var(--color-danger) 35%, var(--color-border));
  color: var(--color-danger);
}
.args__add {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  flex-shrink: 0;
  max-width: 100%;
  padding: 0.25rem var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: transparent;
  font: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.args__col--pro .args__add {
  border-color: color-mix(in srgb, var(--color-success) 45%, var(--color-border));
  color: var(--color-success);
}
.args__col--pro .args__add:hover {
  border-color: var(--color-success);
  background: color-mix(in srgb, var(--color-success) 10%, transparent);
}
.args__col--con .args__add {
  border-color: color-mix(in srgb, var(--color-danger) 45%, var(--color-border));
  color: var(--color-danger);
}
.args__col--con .args__add:hover {
  border-color: var(--color-danger);
  background: color-mix(in srgb, var(--color-danger) 10%, transparent);
}
.args__form-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background: rgba(0, 0, 0, 0.45);
}
.args__form {
  width: min(40rem, 100%);
  max-height: 90vh;
  overflow-y: auto;
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  background: var(--color-bg-elevated);
  box-shadow: var(--shadow-md);
}
.args__form-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}
.args__form-head h3 {
  margin: 0;
}
.args__stance-toggle {
  display: inline-flex;
  gap: var(--space-1);
  padding: 0.2rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
}
.args__stance-toggle button {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 0.25rem var(--space-3);
  border: none;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--color-text-muted);
  font: inherit;
  font-size: 0.82rem;
  cursor: pointer;
}
.args__stance-toggle button.is-active {
  background: var(--color-accent);
  color: var(--color-accent-contrast);
}
.args__form-title {
  width: 100%;
  margin-bottom: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  font: inherit;
  font-size: 1rem;
}
.args__form-body {
  margin-bottom: var(--space-3);
}
.args__form-hint {
  margin-bottom: var(--space-3);
}
.args__form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}
</style>
