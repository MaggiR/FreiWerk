<script setup lang="ts">
import MarkdownIt from 'markdown-it'
// Raw Markdown source — edit app/content/ueber.md to change this page's content.
import aboutMarkdown from '~/content/ueber.md?raw'

const md = new MarkdownIt({ html: false, linkify: true, typographer: true })
const renderedHtml = md.render(aboutMarkdown)

useHead({ title: 'Über — FreiWerk' })
</script>

<template>
  <div class="about">
    <article class="about__prose rich-text" lang="de">
      <!-- Content comes from a trusted in-repo Markdown file. -->
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-html="renderedHtml" />
    </article>
  </div>
</template>

<style scoped>
.about {
  max-width: 52rem;
  margin: 0 auto;
}
.about__prose {
  padding: var(--space-2) 0;
}
.about__prose :deep(h1) {
  font-size: clamp(2rem, 5vw, 2.8rem);
  margin: 0 0 var(--space-4);
}
.about__prose :deep(h2) {
  margin-top: var(--space-7);
  margin-bottom: var(--space-3);
  font-size: clamp(1.4rem, 3vw, 1.8rem);
}
.about__prose :deep(p),
.about__prose :deep(li) {
  line-height: 1.7;
}
.about__prose :deep(ul),
.about__prose :deep(ol) {
  padding-left: var(--space-5);
}
.about__prose :deep(li) {
  margin-bottom: var(--space-2);
}
.about__prose :deep(blockquote) {
  margin: var(--space-5) 0 0;
  padding: var(--space-3) var(--space-4);
  border-left: 3px solid var(--color-accent);
  background: var(--color-bg-elevated);
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
}
</style>
