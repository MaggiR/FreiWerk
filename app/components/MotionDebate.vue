<script setup lang="ts">
const props = defineProps<{ motionId: string; debateOpen: boolean }>()
const { loggedIn } = useAuthUser()

const { data, refresh, pending } = await useFetch(
  () => `/api/motions/${props.motionId}/posts`,
  { key: `posts-${props.motionId}` },
)

const posts = computed(() => data.value?.posts ?? [])
</script>

<template>
  <div class="debate">
    <p class="debate__count">
      {{ posts.length }} Beitrag{{ posts.length === 1 ? '' : 'e' }}
    </p>

    <PostList :posts="posts" />

    <template v-if="debateOpen">
      <PostForm v-if="loggedIn" :motion-id="motionId" @created="refresh" />
      <FwCard v-else class="debate__login">
        <p>
          <NuxtLink to="/auth/login">Melde dich an</NuxtLink>, um an der Debatte
          teilzunehmen.
        </p>
      </FwCard>
    </template>
    <FwCard v-else class="debate__closed">
      <p>Die Debattenphase ist abgeschlossen. Neue Beiträge sind nicht möglich.</p>
    </FwCard>

    <p v-if="pending" class="debate__loading">Beiträge werden geladen ...</p>
  </div>
</template>

<style scoped>
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
  margin-top: var(--space-3);
}
</style>
