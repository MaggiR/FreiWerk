<script setup lang="ts">
const props = defineProps<{ motionId: string; debateOpen: boolean }>()
const { loggedIn } = useAuthUser()
const { open: openAuthModal } = useAuthModal()

const { data, refresh, pending } = await useFetch(
  () => `/api/motions/${props.motionId}/posts`,
  { key: `posts-${props.motionId}` },
)

const posts = computed(() => data.value?.posts ?? [])
const showPostForm = ref(false)

const isEmpty = computed(() => !pending.value && posts.value.length === 0)

watch(
  posts,
  (list) => {
    if (list.length > 0) {
      showPostForm.value = true
    }
  },
  { immediate: true },
)

function onFirstPostClick() {
  if (!loggedIn.value) {
    openAuthModal('login')
    return
  }
  showPostForm.value = true
}
</script>

<template>
  <div class="debate">
    <p v-if="pending" class="debate__loading">Beiträge werden geladen ...</p>

    <template v-else-if="isEmpty && debateOpen">
      <div v-if="!showPostForm" class="debate__cta-wrap">
        <FwButton variant="primary" class="debate__cta" @click="onFirstPostClick">
          <FontAwesomeIcon icon="paper-plane" class="debate__cta-icon" />
          <span>Ersten Beitrag posten</span>
        </FwButton>
      </div>
      <PostForm
        v-else-if="loggedIn"
        :motion-id="motionId"
        @created="refresh"
      />
    </template>

    <template v-else>
      <p v-if="posts.length > 0" class="debate__count">
        {{ posts.length }} Beitrag{{ posts.length === 1 ? '' : 'e' }}
      </p>

      <PostList v-if="posts.length > 0" :posts="posts" />

      <template v-if="debateOpen">
        <PostForm v-if="loggedIn" :motion-id="motionId" @created="refresh" />
        <FwCard v-else class="debate__login">
          <p>
            <button type="button" class="inline-link" @click="openAuthModal('login')">
              Melde dich an
            </button>, um an der Debatte teilzunehmen.
          </p>
        </FwCard>
      </template>
      <FwCard v-else class="debate__closed">
        <p>Die Debattenphase ist abgeschlossen. Neue Beiträge sind nicht möglich.</p>
      </FwCard>
    </template>
  </div>
</template>

<style scoped>
.debate__cta-wrap {
  display: flex;
  justify-content: center;
  padding: var(--space-2) 0;
}

.debate__cta-wrap :deep(.debate__cta) {
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-6) var(--space-8);
  font-size: 1rem;
  line-height: 1.3;
}

.debate__cta-wrap :deep(.debate__cta-icon) {
  font-size: 1.75rem;
}
.debate__count {
  color: var(--color-text-muted);
  margin-bottom: var(--space-4);
}
.debate__login,
.debate__closed {
  margin-top: var(--space-4);
  color: var(--color-text-muted);
}
.debate__loading {
  color: var(--color-text-muted);
}
</style>
