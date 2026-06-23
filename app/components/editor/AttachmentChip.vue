<script setup lang="ts">
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3'
import { ATTACHMENT_LABEL_MAX, normalizeAttachmentLabel } from '~/editor/attachmentExtension'

const props = defineProps(nodeViewProps)

const label = computed(() => normalizeAttachmentLabel(props.node.attrs.label ?? 'Anhang'))
const canRename = computed(() => props.editor.isEditable)

function rename() {
  const next = window.prompt('Anhang umbenennen:', label.value)
  if (next === null) return
  props.updateAttributes({ label: normalizeAttachmentLabel(next) })
}
</script>

<template>
  <NodeViewWrapper class="attachment-chip-wrapper" as="div">
    <div class="attachment-chip" data-attachment contenteditable="false">
      <a
        class="attachment-chip__link"
        :href="node.attrs.href"
        target="_blank"
        rel="noopener noreferrer nofollow"
        :data-label="label"
        :data-mime="node.attrs.mimeType"
      >
        <span class="attachment-chip__icon" aria-hidden="true">
          <FontAwesomeIcon icon="paperclip" />
        </span>
        <span class="attachment-chip__label">{{ label }}</span>
      </a>
      <button
        v-if="canRename"
        type="button"
        class="attachment-chip__rename"
        title="Anhang umbenennen"
        :aria-label="`Anhang umbenennen: ${label}`"
        @click="rename"
      >
        <FontAwesomeIcon icon="pen-to-square" />
      </button>
    </div>
    <span class="visually-hidden">Maximal {{ ATTACHMENT_LABEL_MAX }} Zeichen</span>
  </NodeViewWrapper>
</template>
