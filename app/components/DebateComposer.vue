<script setup lang="ts">
import { REFERENCE_ICONS, referenceExcerptText, type ReferenceDraft } from '~/utils/references'
import type { DebateQuoteDraft } from '~/utils/debate'
import type { UploadedFileResult } from '~/utils/uploadResult'
import { REFERENCE_TARGET_LABELS } from '#shared/constants'
import { extractFirstLinkUrl } from '#shared/linkPreview'
import type { LinkPreview } from '#shared/linkPreview'

const props = withDefaults(
  defineProps<{
    motionId: string
    motionVersion?: number | null
    parentId?: string
    replyToName?: string | null
    quoteDraft?: DebateQuoteDraft | null
    editPost?: { id: string; bodyHtml: string } | null
    disabled?: boolean
    loggedIn?: boolean
    placeholder?: string
  }>(),
  {
    motionVersion: null,
    parentId: undefined,
    replyToName: null,
    quoteDraft: null,
    editPost: null,
    disabled: false,
    loggedIn: true,
    placeholder: 'Nachricht schreiben …',
  },
)

const emit = defineEmits<{
  sent: []
  edited: []
  cancelReply: []
  cancelQuote: []
  cancelEdit: []
  jumpQuote: [draft: DebateQuoteDraft]
  editLatest: []
  login: []
}>()

const { SESSION_EXPIRED_MESSAGE } = useAuthUser()

const bodyHtml = ref('')
const pending = ref(false)
const error = ref('')

const references = ref<ReferenceDraft[]>([])
const pickerOpen = ref(false)
const fileDialogOpen = ref(false)
const editorRef = ref<{ insertUploadedFile: (file: UploadedFileResult) => void } | null>(null)

const linkPreview = ref<LinkPreview | null>(null)
const linkPreviewLoading = ref(false)
const dismissedPreviewUrl = ref<string | null>(null)
let linkPreviewTimer: ReturnType<typeof setTimeout> | null = null
let linkPreviewRequestId = 0

function composerHasContent(html: string): boolean {
  if (!html || html === '<p></p>') return false
  if (html.replace(/<[^>]*>/g, '').trim().length > 0) return true
  return /<(img|video)\b|attachment-chip|data-attachment|link-preview|data-link-preview/i.test(html)
}

function isExcerptReference(ref: ReferenceDraft): boolean {
  return ref.targetType === 'motion_excerpt' && Boolean(ref.excerptText?.trim())
}

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

const { pendingReference, consumePendingReference } = useComposerReferenceQueue()

watch(
  () => pendingReference.value,
  (ref) => {
    if (!ref) return
    const copy = { ...ref }
    consumePendingReference()
    addReference(copy)
  },
)

function removeReference(index: number) {
  references.value.splice(index, 1)
}

function openPicker() {
  if (props.editPost) return
  if (!props.loggedIn) {
    emit('login')
    return
  }
  pickerOpen.value = true
}

function openFileDialog() {
  if (props.editPost) return
  if (!props.loggedIn) {
    emit('login')
    return
  }
  fileDialogOpen.value = true
}

function onFilesUploaded(files: UploadedFileResult[]) {
  for (const file of files) {
    editorRef.value?.insertUploadedFile(file)
  }
}

const isEmpty = computed(() => !composerHasContent(bodyHtml.value))

function resetLinkPreviewState() {
  linkPreview.value = null
  linkPreviewLoading.value = false
  dismissedPreviewUrl.value = null
  linkPreviewRequestId += 1
  if (linkPreviewTimer) {
    clearTimeout(linkPreviewTimer)
    linkPreviewTimer = null
  }
}

function dismissLinkPreview() {
  dismissedPreviewUrl.value = linkPreview.value?.url ?? extractFirstLinkUrl(bodyHtml.value)
  linkPreview.value = null
  linkPreviewLoading.value = false
}

async function fetchLinkPreviewForUrl(url: string, requestId: number) {
  linkPreviewLoading.value = true
  try {
    const data = await $fetch<{ preview: LinkPreview }>('/api/link-preview', {
      query: { url },
    })
    if (requestId !== linkPreviewRequestId) return
    if (extractFirstLinkUrl(bodyHtml.value) !== url) return
    if (dismissedPreviewUrl.value === url) return
    linkPreview.value = data.preview
  } catch {
    if (requestId !== linkPreviewRequestId) return
    linkPreview.value = null
  } finally {
    if (requestId === linkPreviewRequestId) linkPreviewLoading.value = false
  }
}

function scheduleLinkPreviewFetch() {
  if (props.editPost) return
  if (linkPreviewTimer) clearTimeout(linkPreviewTimer)
  linkPreviewTimer = setTimeout(() => {
    linkPreviewTimer = null
    const url = extractFirstLinkUrl(bodyHtml.value)
    if (!url) {
      linkPreview.value = null
      linkPreviewLoading.value = false
      dismissedPreviewUrl.value = null
      return
    }
    if (dismissedPreviewUrl.value === url) {
      linkPreview.value = null
      linkPreviewLoading.value = false
      return
    }
    if (linkPreview.value?.url === url) return
    linkPreviewRequestId += 1
    const requestId = linkPreviewRequestId
    linkPreview.value = null
    fetchLinkPreviewForUrl(url, requestId)
  }, 600)
}

watch(bodyHtml, scheduleLinkPreviewFetch)

watch(
  () => props.editPost?.id ?? null,
  (postId, prevPostId) => {
    if (postId && props.editPost) {
      if (postId !== prevPostId) {
        bodyHtml.value = props.editPost.bodyHtml
        references.value = []
        resetLinkPreviewState()
        error.value = ''
      }
      return
    }
    if (prevPostId) {
      bodyHtml.value = ''
      references.value = []
      resetLinkPreviewState()
      error.value = ''
    }
  },
  { immediate: true },
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
    if (props.editPost) {
      await $fetch(`/api/posts/${props.editPost.id}`, {
        method: 'PATCH',
        body: { bodyHtml: bodyHtml.value },
      })
      bodyHtml.value = ''
      emit('edited')
    } else {
      const postReferences = references.value.map((r) => ({
        targetType: r.targetType,
        targetId: r.targetId,
        excerptText: r.excerptText,
        excerptVersion: r.excerptVersion,
      }))
      if (props.quoteDraft) {
        postReferences.push({
          targetType: 'post' as const,
          targetId: props.quoteDraft.postId,
          excerptText: props.quoteDraft.excerpt,
          excerptVersion: undefined,
        })
      }
      await $fetch(`/api/motions/${props.motionId}/posts`, {
        method: 'POST',
        body: {
          bodyHtml: bodyHtml.value,
          parentId: props.parentId,
          references: postReferences,
          linkPreviewUrl:
            linkPreview.value && dismissedPreviewUrl.value !== linkPreview.value.url
              ? linkPreview.value.url
              : undefined,
        },
      })
      bodyHtml.value = ''
      references.value = []
      resetLinkPreviewState()
      emit('sent')
    }
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

function cancelEditMode() {
  emit('cancelEdit')
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && !event.isComposing && props.editPost) {
    event.preventDefault()
    event.stopPropagation()
    cancelEditMode()
    return
  }
  if (
    event.key === 'ArrowUp' &&
    !event.shiftKey &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.isComposing &&
    isEmpty.value &&
    !props.editPost &&
    !props.disabled
  ) {
    event.preventDefault()
    emit('editLatest')
    return
  }
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    onSubmit()
  }
}

onBeforeUnmount(() => {
  if (linkPreviewTimer) clearTimeout(linkPreviewTimer)
})
</script>

<template>
  <div class="composer" :class="{ 'composer--disabled': disabled }" @keydown="onKeydown">
    <div v-if="editPost" class="composer__reply composer__reply--edit">
      <span class="composer__reply-label">
        <FontAwesomeIcon icon="pen" />
        Nachricht bearbeiten
      </span>
      <button
        type="button"
        class="composer__reply-cancel"
        aria-label="Bearbeiten abbrechen"
        @click.stop="cancelEditMode"
      >
        <FontAwesomeIcon icon="xmark" />
      </button>
    </div>
    <div v-else-if="replyToName" class="composer__reply">
      <span class="composer__reply-label">
        <FontAwesomeIcon icon="reply" />
        Antwort an {{ replyToName }}
      </span>
      <button type="button" class="composer__reply-cancel" aria-label="Antwort abbrechen" @click="emit('cancelReply')">
        <FontAwesomeIcon icon="xmark" />
      </button>
    </div>

    <div v-if="quoteDraft && !editPost" class="composer__quote">
      <div class="composer__quote-main">
        <button
          type="button"
          class="composer__quote-jump"
          :aria-label="`Zur Nachricht von ${quoteDraft.authorName ?? 'Unbekannt'} springen`"
          @click="emit('jumpQuote', quoteDraft)"
        >
          <FontAwesomeIcon class="composer__quote-icon" icon="quote-left" />
          <span class="composer__quote-label">Zitat</span>
        </button>
        <div class="composer__quote-content">
          <span class="composer__quote-author">{{ quoteDraft.authorName ?? 'Unbekannt' }}:</span>
          <ExpandableExcerpt block :text="quoteDraft.excerpt" />
        </div>
      </div>
      <button
        type="button"
        class="composer__reply-cancel"
        aria-label="Zitat entfernen"
        @click="emit('cancelQuote')"
      >
        <FontAwesomeIcon icon="xmark" />
      </button>
    </div>

    <ul v-if="references.length > 0" class="composer__refs">
      <li
        v-for="(ref, index) in references"
        :key="index"
        class="composer__ref"
        :class="{ 'composer__ref--excerpt': isExcerptReference(ref) }"
      >
        <FontAwesomeIcon class="composer__ref-icon" :icon="REFERENCE_ICONS[ref.targetType]" />
        <template v-if="isExcerptReference(ref)">
          <div class="composer__ref-excerpt">
            <span class="composer__ref-type">{{ REFERENCE_TARGET_LABELS.motion_excerpt }}:</span>
            <ExpandableExcerpt block :text="referenceExcerptText(ref)" />
          </div>
        </template>
        <span v-else class="composer__ref-label">{{ ref.label }}</span>
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

    <LinkPreviewCard
      v-if="!editPost && (linkPreviewLoading || linkPreview)"
      :preview="linkPreview"
      :loading="linkPreviewLoading"
      @dismiss="dismissLinkPreview"
    />

    <form class="composer__field" @submit.prevent="onSubmit">
      <ComposerAttachMenu
        :disabled="Boolean(editPost)"
        @reference="openPicker"
        @file="openFileDialog"
      />
      <div class="composer__input">
        <ClientOnly>
          <MotionEditor
            ref="editorRef"
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
        :aria-label="editPost ? 'Speichern' : 'Senden'"
      >
        <FontAwesomeIcon :icon="pending ? 'hourglass-end' : editPost ? 'check' : 'paper-plane'" />
      </button>
    </form>
    <p v-if="error" class="form-error composer__error">{{ error }}</p>

    <ReferencePicker
      v-model:open="pickerOpen"
      :motion-id="motionId"
      :selected-keys="selectedKeys"
      @add="addReference"
    />

    <ComposerFileDialog
      v-model:open="fileDialogOpen"
      @uploaded="onFilesUploaded"
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
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--glass-border);
  border-left: 3px solid var(--color-accent);
  border-radius: var(--radius-md);
  background: var(--glass-bg);
  -webkit-backdrop-filter: blur(var(--glass-blur));
  backdrop-filter: blur(var(--glass-blur));
  box-shadow: var(--shadow-sm);
  font-size: 0.82rem;
  color: var(--color-text);
}
.composer__reply-label {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
  color: var(--color-text);
}
.composer__reply-label :deep(svg) {
  flex-shrink: 0;
  color: var(--color-accent);
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
  background: color-mix(in srgb, var(--glass-bg) 70%, var(--color-bg-elevated));
}
.composer__reply--edit {
  border-left-color: var(--color-tertiary);
}
.composer__reply--edit .composer__reply-label :deep(svg) {
  color: var(--color-tertiary);
}
.composer__quote {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-2);
  margin: 0 var(--space-3) var(--space-2);
  padding: var(--space-1) var(--space-2);
  border-left: 3px solid var(--color-tertiary);
  background: color-mix(in srgb, var(--color-tertiary) 8%, transparent);
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
  color: var(--color-text-muted);
}
.composer__quote-main {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
  flex: 1;
}
.composer__quote-jump {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  width: fit-content;
  padding: 0;
  border: none;
  background: transparent;
  font: inherit;
  color: inherit;
  cursor: pointer;
}
.composer__quote-jump:hover {
  color: var(--color-text);
}
.composer__quote-jump:hover .composer__quote-label {
  text-decoration: underline;
}
.composer__quote-icon {
  flex-shrink: 0;
  font-size: 0.72rem;
  color: var(--color-tertiary);
}
.composer__quote-label {
  flex-shrink: 0;
  font-weight: 600;
  color: var(--color-tertiary);
}
.composer__quote-content {
  min-width: 0;
  padding-left: calc(0.72rem + 0.35rem);
  color: var(--color-text);
}
.composer__quote-author {
  font-weight: 600;
  color: var(--color-tertiary);
  margin-right: 0.2rem;
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
.composer__ref--excerpt {
  display: flex;
  align-items: flex-start;
  max-width: 100%;
  width: 100%;
  border-radius: var(--radius-sm);
  padding: var(--space-1) var(--space-2);
}
.composer__ref-excerpt {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
  flex: 1;
}
.composer__ref-type {
  font-weight: 600;
  color: var(--color-accent);
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
