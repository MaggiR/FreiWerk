<script setup lang="ts">
const props = defineProps<{ motionId: string; debateOpen: boolean }>()
const { loggedIn } = useAuthUser()
const { open: openAuthModal } = useAuthModal()

const postSort = ref<'recent' | 'oldest'>('recent')

const { data, refresh, pending } = await useFetch(
  () => `/api/motions/${props.motionId}/posts`,
  {
    key: computed(() => `posts-${props.motionId}-${postSort.value}`),
    query: computed(() => ({ sort: postSort.value })),
  },
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
      <button
        v-if="!showPostForm"
        type="button"
        class="debate__cta"
        @click="onFirstPostClick"
      >
        <span class="debate__cta-icon">
          <FontAwesomeIcon icon="paper-plane" />
        </span>
        <span class="debate__cta-text">Ersten Beitrag posten</span>
      </button>
      <PostForm
        v-else-if="loggedIn"
        :motion-id="motionId"
        default-open
        @created="refresh"
      />
    </template>

    <template v-else>
      <div v-if="posts.length > 0" class="debate__toolbar">
        <p class="debate__count">
          {{ posts.length }} Beitrag{{ posts.length === 1 ? '' : 'e' }}
        </p>
        <label class="debate__sort">
          <span class="visually-hidden">Sortierung</span>
          <select v-model="postSort">
            <option value="recent">Neueste zuerst</option>
            <option value="oldest">Älteste zuerst</option>
          </select>
        </label>
      </div>

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
.debate__cta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  width: 100%;
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

.debate__cta:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 7%, transparent);
}

.debate__cta-icon {
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
.debate__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.debate__count {
  color: var(--color-text-muted);
  margin: 0;
}

.debate__sort select {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  font-family: inherit;
  font-size: 0.875rem;
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
