<script setup lang="ts">
import type { AnswerItem, QuestionItem, QuestionListResponse } from '#shared/types'
import {
  QUESTION_TITLE_MIN,
  QUESTION_TITLE_MAX,
} from '#shared/constants'
import { formatRecentTimestamp } from '~/utils/chatDates'

const props = defineProps<{ motionId: string; debateOpen: boolean }>()
const sortMode = defineModel<'top' | 'recent'>('sortMode', { default: 'top' })
const itemCount = defineModel<number>('itemCount', { default: 0 })

const { loggedIn, SESSION_EXPIRED_MESSAGE } = useAuthUser()
const { open: openAuthModal } = useAuthModal()
const toast = useToast()

const { data, refresh, pending } = useFetch<QuestionListResponse>(
  () => `/api/motions/${props.motionId}/questions`,
  { key: computed(() => `questions-${props.motionId}`) },
)

function splitAnswers(answers: AnswerItem[]) {
  const accepted = answers.find((answer) => answer.isAccepted) ?? null
  const others = accepted
    ? answers.filter((answer) => !answer.isAccepted)
    : answers
  return { accepted, others }
}

const questions = computed<QuestionItem[]>(() => {
  const list = [...(data.value?.questions ?? [])]
  return list.sort((a, b) => {
    if (sortMode.value === 'top' && b.upvoteCount !== a.upvoteCount) {
      return b.upvoteCount - a.upvoteCount
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
})

watchEffect(() => {
  itemCount.value = questions.value.length
})

const answerGroupsByQuestionId = computed(() =>
  Object.fromEntries(
    questions.value.map((question) => [question.id, splitAnswers(question.answers)]),
  ),
)

// ---- ask form ----
const showForm = ref(false)
const formTitle = ref('')
const formBody = ref('')
const submitting = ref(false)
const formError = ref('')

const titleLen = computed(() => formTitle.value.trim().length)
const canSubmit = computed(
  () =>
    titleLen.value >= QUESTION_TITLE_MIN &&
    titleLen.value <= QUESTION_TITLE_MAX &&
    !submitting.value,
)

function isBodyEmpty(html: string): boolean {
  return html.replace(/<[^>]*>/g, '').trim().length === 0
}

const askLabel = computed(() =>
  questions.value.length === 0 ? 'Erste Frage stellen' : 'Frage stellen',
)

function openForm() {
  if (!loggedIn.value) {
    openAuthModal('login')
    return
  }
  formError.value = ''
  showForm.value = true
}

function resetForm() {
  showForm.value = false
  formTitle.value = ''
  formBody.value = ''
  formError.value = ''
}

async function submitQuestion() {
  if (!canSubmit.value) return
  submitting.value = true
  formError.value = ''
  try {
    await $fetch(`/api/motions/${props.motionId}/questions`, {
      method: 'POST',
      body: { title: formTitle.value.trim(), bodyHtml: formBody.value },
    })
    resetForm()
    await refresh()
    toast.success('Frage veröffentlicht.')
  } catch (err: unknown) {
    if (isUnauthorized(err)) {
      formError.value = SESSION_EXPIRED_MESSAGE
      return
    }
    formError.value = extractError(err, 'Frage konnte nicht gespeichert werden.')
  } finally {
    submitting.value = false
  }
}

// ---- answers ----
const answerFor = ref<string | null>(null)
const answerBody = ref('')
const answerSubmitting = ref(false)
const answerError = ref('')

function openAnswer(questionId: string) {
  if (!loggedIn.value) {
    openAuthModal('login')
    return
  }
  answerFor.value = answerFor.value === questionId ? null : questionId
  answerBody.value = ''
  answerError.value = ''
}

const answerEmpty = computed(
  () => answerBody.value.replace(/<[^>]*>/g, '').trim().length === 0,
)

async function submitAnswer(questionId: string) {
  if (answerEmpty.value || answerSubmitting.value) return
  answerSubmitting.value = true
  answerError.value = ''
  try {
    await $fetch(`/api/questions/${questionId}/answers`, {
      method: 'POST',
      body: { bodyHtml: answerBody.value },
    })
    answerFor.value = null
    answerBody.value = ''
    answersExpanded.value = { ...answersExpanded.value, [questionId]: true }
    await refresh()
    toast.success('Antwort veröffentlicht.')
  } catch (err: unknown) {
    if (isUnauthorized(err)) {
      answerError.value = SESSION_EXPIRED_MESSAGE
      return
    }
    answerError.value = extractError(err, 'Antwort konnte nicht gespeichert werden.')
  } finally {
    answerSubmitting.value = false
  }
}

async function acceptAnswer(question: QuestionItem, answerId: string) {
  const next = question.acceptedAnswerId === answerId ? null : answerId
  try {
    await $fetch(`/api/questions/${question.id}`, {
      method: 'PATCH',
      body: { acceptedAnswerId: next },
    })
    await refresh()
    if (next) answerFor.value = null
  } catch (err: unknown) {
    toast.error(extractError(err, 'Aktion fehlgeschlagen.'))
  }
}

/** Per-question expand state for non-primary answers (defaults closed when accepted + others). */
const answersExpanded = ref<Record<string, boolean>>({})

function answersAreExpanded(question: QuestionItem): boolean {
  const stored = answersExpanded.value[question.id]
  if (stored !== undefined) return stored
  const { accepted, others } = splitAnswers(question.answers)
  return !(accepted != null && others.length > 0)
}

function toggleAnswersExpanded(questionId: string) {
  const question = questions.value.find((item) => item.id === questionId)
  if (!question) return
  answersExpanded.value = {
    ...answersExpanded.value,
    [questionId]: !answersAreExpanded(question),
  }
}

function othersSectionHeading(question: QuestionItem): string {
  const { accepted, others } = splitAnswers(question.answers)
  const count = others.length
  if (accepted) {
    return count === 1 ? '1 weitere Antwort' : `${count} weitere Antworten`
  }
  return count === 1 ? '1 Antwort' : `${count} Antworten`
}

const { pending: deliberationNavTarget } = useDeliberationNav()

watch(
  deliberationNavTarget,
  (target) => {
    if (!target || target.targetType !== 'answer') return
    for (const question of questions.value) {
      const answer = question.answers.find((item) => item.id === target.targetId)
      if (!answer) continue
      const { others } = splitAnswers(question.answers)
      if (others.some((item) => item.id === target.targetId) && !answersAreExpanded(question)) {
        answersExpanded.value = { ...answersExpanded.value, [question.id]: true }
      }
      break
    }
  },
  { flush: 'sync' },
)

defineExpose({
  openAskForm: openForm,
  askLabel,
})
</script>

<template>
  <div class="qa">
    <p v-if="pending" class="qa__loading">Fragen werden geladen …</p>

    <div v-else class="qa__list">
      <article
        v-for="q in questions"
        :key="q.id"
        class="q"
        data-deliberation-type="question"
        :data-deliberation-id="q.id"
      >
        <div class="q__main">
          <div class="q__votes">
            <UpvoteButton
              target-type="question"
              :target-id="q.id"
              :count="q.upvoteCount"
              :upvoted="q.upvotedByMe"
              layout="stacked"
              context-label="Frage"
            />
          </div>
          <div class="q__content">
            <div class="q__head">
              <h3 class="q__title">{{ q.title }}</h3>
            </div>
            <div v-if="!isBodyEmpty(q.bodyHtml)" class="q__body">
              <RichText :html="q.bodyHtml" />
            </div>
            <div class="q__meta">
              <NuxtLink
                v-if="q.authorId"
                :to="`/users/${q.authorId}`"
                class="qa__author-link q__meta-item"
              >
                <UserAvatar
                  :avatar-url="q.authorAvatarUrl"
                  :name="q.authorName"
                  size="sm"
                />
                <span>{{ q.authorName ?? 'Unbekannt' }}</span>
              </NuxtLink>
              <span v-else class="qa__author-link q__meta-item">
                <UserAvatar
                  :avatar-url="q.authorAvatarUrl"
                  :name="q.authorName"
                  size="sm"
                />
                <span>{{ q.authorName ?? 'Unbekannt' }}</span>
              </span>
              <span class="q__meta-sep" aria-hidden="true">·</span>
              <time
                class="q__meta-item q__time"
                :datetime="q.createdAt"
                :title="formatDateTime(q.createdAt)"
              >
                {{ formatRecentTimestamp(q.createdAt) }}
              </time>
              <template v-if="q.answers.length === 0">
                <span class="q__meta-sep" aria-hidden="true">·</span>
                <span class="q__meta-item q__answers-count">
                  <FontAwesomeIcon icon="comment-dots" />
                  Keine Antworten
                </span>
              </template>
            </div>
          </div>
        </div>

        <section v-if="q.answers.length > 0" class="q__answers">
          <article
            v-if="answerGroupsByQuestionId[q.id]?.accepted"
            class="answer answer--accepted"
            data-deliberation-type="answer"
            :data-deliberation-id="answerGroupsByQuestionId[q.id]!.accepted!.id"
          >
            <div class="answer__votes">
              <UpvoteButton
                target-type="answer"
                :target-id="answerGroupsByQuestionId[q.id]!.accepted!.id"
                :count="answerGroupsByQuestionId[q.id]!.accepted!.upvoteCount"
                :upvoted="answerGroupsByQuestionId[q.id]!.accepted!.upvotedByMe"
                layout="stacked"
                context-label="Antwort"
              />
            </div>
            <div class="answer__content">
              <div class="answer__body">
                <RichText :html="answerGroupsByQuestionId[q.id]!.accepted!.bodyHtml" />
              </div>
              <div class="answer__meta">
                <NuxtLink
                  v-if="answerGroupsByQuestionId[q.id]!.accepted!.authorId"
                  :to="`/users/${answerGroupsByQuestionId[q.id]!.accepted!.authorId}`"
                  class="qa__author-link"
                >
                  <UserAvatar
                    :avatar-url="answerGroupsByQuestionId[q.id]!.accepted!.authorAvatarUrl"
                    :name="answerGroupsByQuestionId[q.id]!.accepted!.authorName"
                    size="sm"
                  />
                  <span>{{ answerGroupsByQuestionId[q.id]!.accepted!.authorName ?? 'Unbekannt' }}</span>
                </NuxtLink>
                <span v-else class="qa__author-link">
                  <UserAvatar
                    :avatar-url="answerGroupsByQuestionId[q.id]!.accepted!.authorAvatarUrl"
                    :name="answerGroupsByQuestionId[q.id]!.accepted!.authorName"
                    size="sm"
                  />
                  <span>{{ answerGroupsByQuestionId[q.id]!.accepted!.authorName ?? 'Unbekannt' }}</span>
                </span>
                <span class="q__meta-sep" aria-hidden="true">·</span>
                <time
                  class="answer__time"
                  :datetime="answerGroupsByQuestionId[q.id]!.accepted!.createdAt"
                  :title="formatDateTime(answerGroupsByQuestionId[q.id]!.accepted!.createdAt)"
                >
                  {{ formatRecentTimestamp(answerGroupsByQuestionId[q.id]!.accepted!.createdAt) }}
                </time>
              </div>
            </div>
            <button
              v-if="q.canAccept || answerGroupsByQuestionId[q.id]!.accepted!.isAccepted"
              type="button"
              class="answer__accept is-accepted"
              :disabled="!q.canAccept"
              aria-label="Akzeptierte Antwort"
              title="Akzeptierte Antwort"
              @click="q.canAccept && acceptAnswer(q, answerGroupsByQuestionId[q.id]!.accepted!.id)"
            >
              <FontAwesomeIcon icon="circle-check" />
            </button>
          </article>

          <div
            v-if="(answerGroupsByQuestionId[q.id]?.others.length ?? 0) > 0"
            class="q__answers-more"
          >
            <button
              type="button"
              class="q__answers-heading"
              :aria-expanded="answersAreExpanded(q)"
              @click="toggleAnswersExpanded(q.id)"
            >
              <FontAwesomeIcon icon="comment-dots" />
              <span>{{ othersSectionHeading(q) }}</span>
              <FontAwesomeIcon
                :icon="answersAreExpanded(q) ? 'chevron-up' : 'chevron-down'"
                class="q__answers-heading-chevron"
              />
            </button>
            <Transition name="answers-expand">
              <div
                v-show="answersAreExpanded(q)"
                class="q__answers-collapsible-wrap"
              >
                <div class="q__answers-collapsible">
              <article
                v-for="answer in answerGroupsByQuestionId[q.id]!.others"
                :key="answer.id"
                class="answer"
                :class="{ 'answer--accepted': answer.isAccepted }"
                data-deliberation-type="answer"
                :data-deliberation-id="answer.id"
              >
                <div class="answer__votes">
                  <UpvoteButton
                    target-type="answer"
                    :target-id="answer.id"
                    :count="answer.upvoteCount"
                    :upvoted="answer.upvotedByMe"
                    layout="stacked"
                    context-label="Antwort"
                  />
                </div>
                <div class="answer__content">
                  <div class="answer__body">
                    <RichText :html="answer.bodyHtml" />
                  </div>
                  <div class="answer__meta">
                    <NuxtLink
                      v-if="answer.authorId"
                      :to="`/users/${answer.authorId}`"
                      class="qa__author-link"
                    >
                      <UserAvatar
                        :avatar-url="answer.authorAvatarUrl"
                        :name="answer.authorName"
                        size="sm"
                      />
                      <span>{{ answer.authorName ?? 'Unbekannt' }}</span>
                    </NuxtLink>
                    <span v-else class="qa__author-link">
                      <UserAvatar
                        :avatar-url="answer.authorAvatarUrl"
                        :name="answer.authorName"
                        size="sm"
                      />
                      <span>{{ answer.authorName ?? 'Unbekannt' }}</span>
                    </span>
                    <span class="q__meta-sep" aria-hidden="true">·</span>
                    <time
                      class="answer__time"
                      :datetime="answer.createdAt"
                      :title="formatDateTime(answer.createdAt)"
                    >
                      {{ formatRecentTimestamp(answer.createdAt) }}
                    </time>
                  </div>
                </div>
                <button
                  v-if="q.canAccept || answer.isAccepted"
                  type="button"
                  class="answer__accept"
                  :class="{ 'is-accepted': answer.isAccepted }"
                  :disabled="!q.canAccept"
                  :aria-label="answer.isAccepted ? 'Akzeptierte Antwort' : 'Als Antwort akzeptieren'"
                  :title="answer.isAccepted ? 'Akzeptierte Antwort' : 'Als Antwort akzeptieren'"
                  @click="q.canAccept && acceptAnswer(q, answer.id)"
                >
                  <FontAwesomeIcon icon="circle-check" />
                </button>
              </article>
                </div>
              </div>
            </Transition>
          </div>
        </section>

        <footer v-if="debateOpen && !q.acceptedAnswerId" class="q__footer">
          <button
            type="button"
            class="q__answer-btn"
            @click="openAnswer(q.id)"
          >
            <FontAwesomeIcon icon="reply" />
            {{ answerFor === q.id ? 'Antwort schließen' : 'Antworten' }}
          </button>
        </footer>

        <form
          v-if="answerFor === q.id && !q.acceptedAnswerId"
          class="q__answer-form"
          @submit.prevent="submitAnswer(q.id)"
        >
          <ClientOnly>
            <MotionEditor v-model="answerBody" variant="chat" placeholder="Deine Antwort …" />
          </ClientOnly>
          <p v-if="answerError" class="form-error">{{ answerError }}</p>
          <div class="q__answer-form-actions">
            <FwButton type="button" variant="ghost" @click="answerFor = null">
              Abbrechen
            </FwButton>
            <FwButton
              type="submit"
              variant="primary"
              :disabled="answerEmpty || answerSubmitting"
            >
              {{ answerSubmitting ? 'Speichern …' : 'Antwort senden' }}
            </FwButton>
          </div>
        </form>
      </article>
    </div>

    <div v-if="showForm" class="qa__form-overlay" @click.self="resetForm">
      <form class="qa__form" @submit.prevent="submitQuestion">
        <h3 class="qa__form-title-head">Frage stellen</h3>
        <input
          v-model="formTitle"
          type="text"
          class="qa__form-title"
          placeholder="Worum geht es? Formuliere eine klare Frage …"
          :maxlength="QUESTION_TITLE_MAX"
        >
        <div class="qa__form-body">
          <label class="qa__form-body-label">
            Zusätzlicher Kontext
            <span class="qa__form-optional">(optional)</span>
          </label>
          <ClientOnly>
            <MotionEditor
              v-model="formBody"
              :allow-headings="false"
              placeholder="Hintergrund oder Details zu deiner Frage …"
            />
          </ClientOnly>
        </div>
        <p v-if="formError" class="form-error">{{ formError }}</p>
        <div class="qa__form-actions">
          <FwButton type="button" variant="ghost" @click="resetForm">Abbrechen</FwButton>
          <FwButton type="submit" variant="primary" :disabled="!canSubmit">
            {{ submitting ? 'Speichern …' : 'Frage stellen' }}
          </FwButton>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.qa {
  container-type: inline-size;
  container-name: qa;
  min-width: 0;
}
.qa__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.qa__loading {
  padding: var(--space-4);
  text-align: center;
  color: var(--color-text-muted);
  font-size: 0.9rem;
}
.q {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}
.q__main {
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
}
.q__votes {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  width: 2.75rem;
}
.answer__votes {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  width: 2.75rem;
}
.q__content,
.answer__content {
  flex: 1;
  min-width: 0;
}
.q__head {
  margin-bottom: var(--space-2);
}
.q__title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.35;
  overflow-wrap: anywhere;
}
.q__body {
  margin: 0 0 var(--space-2);
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--color-text-muted);
}
.q__meta,
.answer__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.78rem;
  color: var(--color-text-muted);
}
.q__meta-item,
.answer__time {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}
.qa__author-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: inherit;
  text-decoration: none;
  transition: color 0.15s ease;
}
.qa__author-link:hover {
  color: var(--color-accent);
}
.qa__author-link :deep(.user-avatar--sm) {
  width: 1.5rem;
  height: 1.5rem;
  font-size: 0.72rem;
}
.q__meta-sep {
  color: color-mix(in srgb, var(--color-text-muted) 55%, transparent);
  user-select: none;
}
.q__time,
.answer__time {
  font-variant-numeric: tabular-nums;
}
.q__answers {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-left: calc(2.75rem + var(--space-3));
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
}
.q__answers-heading {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  font: inherit;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  cursor: pointer;
  text-align: left;
  transition: color 0.15s ease;
}
.q__answers-heading:hover {
  color: var(--color-text);
}
.q__answers-heading-chevron {
  margin-left: auto;
  flex-shrink: 0;
  font-size: 0.72rem;
}
.q__answers-more {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.q__answers-collapsible-wrap {
  display: grid;
  grid-template-rows: 1fr;
}
.q__answers-collapsible {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-height: 0;
  overflow: hidden;
}
.answers-expand-enter-active,
.answers-expand-leave-active {
  transition:
    grid-template-rows 0.28s ease,
    opacity 0.22s ease;
  overflow: hidden;
}
.answers-expand-enter-from,
.answers-expand-leave-to {
  grid-template-rows: 0fr;
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .answers-expand-enter-active,
  .answers-expand-leave-active {
    transition: opacity 0.12s ease;
  }
}
.answer {
  position: relative;
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
}
.answer--accepted {
  border-color: color-mix(in srgb, var(--color-success) 45%, var(--color-border));
  background: color-mix(in srgb, var(--color-success) 8%, var(--color-bg));
}
.answer--accepted .answer__content {
  padding-right: 0.25rem;
}
.answer__accept {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.8rem;
  height: 1.8rem;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: var(--color-bg);
  color: var(--color-text-muted);
  cursor: pointer;
  opacity: 0;
  pointer-events: none;
  transition:
    color 0.15s ease,
    border-color 0.15s ease,
    background 0.15s ease,
    opacity 0.15s ease;
}
.answer:hover .answer__accept,
.answer:focus-within .answer__accept {
  opacity: 1;
  pointer-events: auto;
}
@media (hover: none) {
  .answer__accept {
    opacity: 1;
    pointer-events: auto;
  }
}
.answer__accept:hover:not(:disabled) {
  color: var(--color-success);
  border-color: var(--color-success);
  background: color-mix(in srgb, var(--color-success) 10%, transparent);
}
.answer__accept.is-accepted {
  opacity: 1;
  pointer-events: auto;
  color: var(--color-success);
  border-color: var(--color-success);
  background: color-mix(in srgb, var(--color-success) 12%, transparent);
}
.answer__accept.is-accepted:disabled {
  opacity: 1;
}
.answer__accept:disabled {
  cursor: default;
}
.answer__body {
  font-size: 0.9rem;
  line-height: 1.5;
}
.answer__body :deep(.rich-text > :first-child) {
  margin-top: 0;
}
.answer__meta {
  margin-top: var(--space-2);
}
.q__footer {
  margin-left: calc(2.75rem + var(--space-3));
}
.q__answer-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0.35rem var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--color-text-muted);
  font: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease;
}
.q__answer-btn:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 8%, transparent);
}
.q__answer-form {
  margin-left: calc(2.75rem + var(--space-3));
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
}
.q__answer-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  margin-top: var(--space-2);
}
.qa__form-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background: rgba(0, 0, 0, 0.45);
}
.qa__form {
  width: min(40rem, 100%);
  max-height: 90vh;
  overflow-y: auto;
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  background: var(--color-bg-elevated);
  box-shadow: var(--shadow-md);
}
.qa__form-title-head {
  margin: 0 0 var(--space-3);
}
.qa__form-title {
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
.qa__form-body {
  margin-bottom: var(--space-3);
}
.qa__form-body-label {
  display: block;
  margin-bottom: var(--space-2);
  font-size: 0.88rem;
  font-weight: 600;
}
.qa__form-optional {
  font-weight: 400;
  color: var(--color-text-muted);
}
.qa__form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}
@container qa (max-width: 559px) {
  .q__answers,
  .q__footer,
  .q__answer-form {
    margin-left: 0;
  }
  .q__main,
  .answer {
    flex-wrap: wrap;
  }
  .q__votes,
  .answer__votes {
    width: auto;
  }
  .q__content,
  .answer__content {
    flex: 1 1 calc(100% - 3.5rem);
    min-width: min(100%, 12rem);
  }
  .answer__accept {
    top: var(--space-2);
    right: var(--space-2);
  }
}
</style>
