<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    text: string
    /** Lines shown when collapsed. */
    collapsedLines?: number
    /** Use block layout (full width, toggle below text). */
    block?: boolean
  }>(),
  {
    collapsedLines: 2,
    block: false,
  },
)

const expanded = ref(false)
const textRef = ref<HTMLElement | null>(null)
const showToggle = ref(false)

function measureOverflow() {
  const el = textRef.value
  if (!el || expanded.value) return
  showToggle.value = el.scrollHeight > el.clientHeight + 1
}

function toggle(event: Event) {
  event.stopPropagation()
  event.preventDefault()
  expanded.value = !expanded.value
  if (!expanded.value) {
    nextTick(measureOverflow)
  }
}

watch(
  () => props.text,
  () => {
    expanded.value = false
    showToggle.value = false
    nextTick(measureOverflow)
  },
)

watchEffect((onCleanup) => {
  const el = textRef.value
  if (!el) return
  nextTick(measureOverflow)
  const observer = new ResizeObserver(() => measureOverflow())
  observer.observe(el)
  onCleanup(() => observer.disconnect())
})
</script>

<template>
  <span class="expandable-excerpt" lang="de" :class="{ 'expandable-excerpt--block': block }">
    <span
      ref="textRef"
      class="expandable-excerpt__text"
      :class="{ 'expandable-excerpt__text--collapsed': !expanded }"
      :style="!expanded ? { WebkitLineClamp: collapsedLines } : undefined"
    >{{ text }}</span>
    <button
      v-if="showToggle || expanded"
      type="button"
      class="expandable-excerpt__toggle"
      :aria-expanded="expanded"
      :aria-label="expanded ? 'Weniger anzeigen' : 'Mehr anzeigen'"
      @click="toggle"
    >
      <FontAwesomeIcon :icon="expanded ? 'chevron-up' : 'chevron-down'" />
    </button>
  </span>
</template>

<style scoped>
.expandable-excerpt {
  display: inline;
  min-width: 0;
}
.expandable-excerpt--block {
  display: block;
  width: 100%;
}
.expandable-excerpt__text {
  white-space: pre-wrap;
  overflow-wrap: break-word;
  word-break: break-word;
  hyphens: auto;
  -webkit-hyphens: auto;
}
.expandable-excerpt__text--collapsed {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.expandable-excerpt--block .expandable-excerpt__text--collapsed {
  display: -webkit-box;
}
.expandable-excerpt__toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 1.35rem;
  height: 1.35rem;
  margin-left: 0.15rem;
  padding: 0;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-muted);
  font-size: 0.72rem;
  vertical-align: baseline;
  cursor: pointer;
}
.expandable-excerpt--block .expandable-excerpt__toggle {
  margin-left: 0;
  margin-top: 0.1rem;
}
.expandable-excerpt__toggle:hover {
  color: var(--color-text);
  background: color-mix(in srgb, var(--color-bg) 70%, transparent);
}
.expandable-excerpt__toggle:focus-visible {
  outline: 2px solid var(--color-tertiary);
  outline-offset: 1px;
}
</style>
