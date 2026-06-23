<script setup lang="ts">
import {
  MOTION_TITLE_MIN,
  MOTION_TITLE_MAX,
  MOTION_SUMMARY_MIN,
  MOTION_SUMMARY_MAX,
  MOTION_TITLE_PLACEHOLDER,
  MOTION_SUMMARY_PLACEHOLDER,
} from '#shared/constants'

const title = defineModel<string>('title', { required: true })
const summary = defineModel<string>('summary', { required: true })

const titleLength = computed(() => title.value.length)
const summaryLength = computed(() => summary.value.length)
const titleEmpty = computed(() => title.value.trim().length === 0)
const summaryEmpty = computed(() => summary.value.trim().length === 0)
</script>

<template>
  <div
    class="motion__header-field motion__title-edit"
    :class="{ 'motion__header-field--empty': titleEmpty }"
  >
    <div class="motion__header-field__layer">
      <div class="motion__header-field__mirror" aria-hidden="true">
        <span v-if="titleEmpty" class="motion__header-field__placeholder">
          {{ MOTION_TITLE_PLACEHOLDER }}
        </span>
        <template v-else>{{ title }}</template>
        <FontAwesomeIcon icon="pen-to-square" class="motion__header-field__icon" />
      </div>
      <textarea
        v-model="title"
        class="motion__title"
        rows="1"
        :maxlength="MOTION_TITLE_MAX"
        autocomplete="off"
        aria-label="Titel"
      />
    </div>
    <span
      class="motion__field-counter"
      :class="{
        'motion__field-counter--low':
          titleLength > 0 && titleLength < MOTION_TITLE_MIN,
        'motion__field-counter--max': titleLength >= MOTION_TITLE_MAX,
      }"
      aria-live="polite"
    >
      {{ titleLength }} / {{ MOTION_TITLE_MAX }}
    </span>
  </div>

  <div
    class="motion__header-field motion__summary-edit"
    :class="{ 'motion__header-field--empty': summaryEmpty }"
  >
    <div class="motion__header-field__layer">
      <div class="motion__header-field__mirror" aria-hidden="true">
        <span v-if="summaryEmpty" class="motion__header-field__placeholder">
          {{ MOTION_SUMMARY_PLACEHOLDER }}
        </span>
        <template v-else>{{ summary }}</template>
        <FontAwesomeIcon icon="pen-to-square" class="motion__header-field__icon" />
      </div>
      <textarea
        v-model="summary"
        class="motion__summary"
        rows="1"
        :maxlength="MOTION_SUMMARY_MAX"
        aria-label="Kurzbeschreibung"
      />
    </div>
    <span
      class="motion__field-counter"
      :class="{
        'motion__field-counter--low':
          summaryLength > 0 && summaryLength < MOTION_SUMMARY_MIN,
        'motion__field-counter--max': summaryLength >= MOTION_SUMMARY_MAX,
      }"
      aria-live="polite"
    >
      {{ summaryLength }} / {{ MOTION_SUMMARY_MAX }}
    </span>
  </div>
</template>
