<script setup lang="ts">
import { countVisiblePosts, type DebatePost } from '~/utils/debate'

const props = withDefaults(
  defineProps<{
    motionId: string
    debateOpen: boolean
    canModerate?: boolean
    currentUserId?: string | null
  }>(),
  { canModerate: false, currentUserId: null },
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
    reactions: p.reactions ?? [],
  })),
)

watch(
  posts,
  (list) => {
    postCount.value = countVisiblePosts(list)
  },
  { immediate: true },
)

// ---- Reporting ----
const reportOpen = ref(false)
const reportTargetId = ref<string | null>(null)

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

async function onRemove(postId: string) {
  const reason = window.prompt(
    'Begründung für das Entfernen dieses Beitrags (für das Moderationsprotokoll):',
  )
  if (reason === null) return
  if (reason.trim().length < 5) {
    toast.error('Bitte gib eine Begründung (min. 5 Zeichen) an.')
    return
  }
  try {
    await $fetch(`/api/posts/${postId}`, {
      method: 'DELETE',
      body: { reason },
    })
    await refresh()
    toast.success('Beitrag entfernt.')
  } catch (err: unknown) {
    if (isUnauthorized(err)) {
      toast.error(SESSION_EXPIRED_MESSAGE)
      return
    }
    toast.error(extractError(err, 'Beitrag konnte nicht entfernt werden.'))
  }
}
</script>

<template>
  <DebateChat
    v-model:post-sort="postSort"
    :motion-id="motionId"
    :posts="posts"
    :debate-open="debateOpen"
    :can-moderate="canModerate"
    :logged-in="loggedIn"
    :current-user-id="currentUserId"
    :pending="pending"
    @refresh="refresh"
    @report="onReport"
    @remove="onRemove"
    @login="openAuthModal('login')"
  />

  <ReportModal
    v-model:open="reportOpen"
    target-type="post"
    :target-id="reportTargetId"
    @reported="onReported"
  />
</template>
