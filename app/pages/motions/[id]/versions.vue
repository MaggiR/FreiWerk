<script setup lang="ts">
const route = useRoute()
const id = route.params.id as string

const { data, error } = await useFetch(`/api/motions/${id}`)

if (error.value) {
  throw createError({ statusCode: 404, statusMessage: 'Antrag nicht gefunden.' })
}

const motion = computed(() => data.value?.motion)

watchEffect(() => {
  if (motion.value?.status === 'draft') {
    navigateTo(`/motions/${id}`)
  }
})

useHead({
  title: () => `Versionen: ${motion.value?.title ?? 'Antrag'} — FreiWerk`,
})
</script>

<template>
  <article v-if="motion" class="motion-subpage">
    <NuxtLink :to="`/motions/${id}`" class="back-link">← Zurück zum Antrag</NuxtLink>

    <header class="motion-subpage__header">
      <h1><FontAwesomeIcon icon="clock-rotate-left" /> Versionen</h1>
      <p class="motion-subpage__context">{{ motion.title }}</p>
    </header>

    <MotionVersions :motion-id="motion.id" />
  </article>
</template>

<style scoped>
.motion-subpage {
  max-width: 820px;
  margin: 0 auto;
}
.back-link {
  display: inline-block;
  margin-bottom: var(--space-4);
  color: var(--color-text-muted);
}
.motion-subpage__header {
  margin-bottom: var(--space-5);
}
.motion-subpage__header h1 {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin: 0 0 var(--space-2);
  font-size: 1.75rem;
}
.motion-subpage__context {
  margin: 0;
  color: var(--color-text-muted);
}
</style>
