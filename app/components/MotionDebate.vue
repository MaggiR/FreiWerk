<script setup lang="ts">
import { countVisiblePosts, type DebatePost } from '~/utils/debate'

const props = withDefaults(
  defineProps<{
    motionId: string
    motionVersion?: number | null
    debateOpen: boolean
    canModerate?: boolean
    currentUserId?: string | null
  }>(),
  { motionVersion: null, canModerate: false, currentUserId: null },
)

const postCount = defineModel<number>('postCount', { default: 0 })
const postSort = defineModel<'recent' | 'oldest'>('postSort', { default: 'oldest' })

const { loggedIn, SESSION_EXPIRED_MESSAGE } = useAuthUser()
const { open: openAuthModal } = useAuthModal()
const toast = useToast()

const { data, refresh, pending } = await useFetch(
  () => `/api/motions/${props.motionId}/posts`,
  { key: computed(() => `posts-${props.motionId}`) },
)

const posts = computed<DebatePost[]>(() =>
  (data.value?.posts ?? []).map((p) => ({
    ...p,
    upvoteCount: p.upvoteCount ?? 0,
    upvotedByMe: p.upvotedByMe ?? false,
    savedByMe: p.savedByMe ?? false,
    references: p.references ?? [],
    referencedByCount: p.referencedByCount ?? 0,
  })),
)

watch(
  posts,
  (list) => {
    postCount.value = countVisiblePosts(list)
  },
  { immediate: true },
)

const reportOpen = ref(false)
const reportTargetId = ref<string | null>(null)
const deleteModalOpen = ref(false)
const deleteTargetId = ref<string | null>(null)
const deletePending = ref(false)
const deleteError = ref('')

function onReport(postId: string) {
  if (!loggedIn.value) {
    openAuthModal('login')
    return
  }
  reportTargetId.value = postId
  reportOpen.value = true
}

function onReported() {
  toast.success('Meldung an die Moderation übermittelt.')
}

async function onDelete(postId: string) {
  if (!loggedIn.value) {
    openAuthModal('login')
    return
  }
  deleteError.value = ''
  deleteTargetId.value = postId
  deleteModalOpen.value = true
}

async function confirmDeletePost() {
  if (!deleteTargetId.value || deletePending.value) return
  deletePending.value = true
  deleteError.value = ''
  try {
    await $fetch(`/api/posts/${deleteTargetId.value}/own`, { method: 'DELETE' })
    deleteModalOpen.value = false
    deleteTargetId.value = null
    await refresh()
    toast.success('Nachricht gelöscht.')
  } catch (err: unknown) {
    if (isUnauthorized(err)) {
      deleteError.value = SESSION_EXPIRED_MESSAGE
      return
    }
    deleteError.value = extractError(err, 'Nachricht konnte nicht gelöscht werden.')
  } finally {
    deletePending.value = false
  }
}

function patchPostSaved(postId: string, saved: boolean) {
  if (!data.value?.posts) return
  data.value = {
    posts: data.value.posts.map((post) =>
      post.id === postId ? { ...post, savedByMe: saved } : post,
    ),
  }
}

async function onSave(postId: string) {
  if (!loggedIn.value) {
    openAuthModal('login')
    return
  }
  try {
    const res = await $fetch<{ saved: boolean }>(`/api/posts/${postId}/save`, {
      method: 'POST',
    })
    patchPostSaved(postId, res.saved)
    toast.success(res.saved ? 'Nachricht gemerkt.' : 'Merken aufgehoben.')
  } catch (err: unknown) {
    if (isUnauthorized(err)) {
      toast.error(SESSION_EXPIRED_MESSAGE)
      return
    }
    toast.error(extractError(err, 'Merken fehlgeschlagen.'))
  }
}
</script>

<template>
  <DebateChat
    v-model:post-sort="postSort"
    :motion-id="motionId"
    :motion-version="motionVersion"
    :posts="posts"
    :debate-open="debateOpen"
    :can-moderate="canModerate"
    :logged-in="loggedIn"
    :current-user-id="currentUserId"
    :pending="pending"
    @refresh="refresh"
    @report="onReport"
    @delete="onDelete"
    @save="onSave"
    @login="openAuthModal('login')"
  />

  <ReportModal
    v-model:open="reportOpen"
    target-type="post"
    :target-id="reportTargetId"
    @reported="onReported"
  />

  <DebateMessageDeleteModal
    v-model:open="deleteModalOpen"
    :pending="deletePending"
    :error="deleteError"
    @confirm="confirmDeletePost"
  />
</template>
