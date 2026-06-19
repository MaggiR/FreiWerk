<script setup lang="ts">
import { wrapHeadingSections } from '~/utils/richTextSections'

const props = withDefaults(
  defineProps<{
    html: string
    collapsibleHeadings?: boolean
  }>(),
  { collapsibleHeadings: false },
)

const root = ref<HTMLElement | null>(null)

function renderContent() {
  if (!props.collapsibleHeadings || !root.value) return
  root.value.innerHTML = props.html
  wrapHeadingSections(root.value)
}

onMounted(() => nextTick(renderContent))

watch(
  () => props.html,
  () => nextTick(renderContent),
)
</script>

<template>
  <!-- Collapsible motion body: enhanced client-side after sanitized HTML is injected. -->
  <div
    v-if="collapsibleHeadings"
    ref="root"
    class="rich-text rich-text--collapsible"
    lang="de"
  />
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div v-else class="rich-text" lang="de" v-html="html" />
</template>
