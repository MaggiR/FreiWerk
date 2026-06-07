<script setup lang="ts">
const props = defineProps<{
  approve: number
  reject: number
  total: number
}>()

const approvePercent = computed(() => approvalRatio(props.approve, props.total))
const rejectPercent = computed(() => approvalRatio(props.reject, props.total))
const abstainPercent = computed(() => {
  if (props.total <= 0) return 0
  const abstain = props.total - props.approve - props.reject
  return approvalRatio(abstain, props.total)
})
</script>

<template>
  <span
    class="mood-bar"
    :title="`Zustimmung ${approvePercent}%, Ablehnung ${rejectPercent}%`"
    :aria-label="`Zustimmung ${approvePercent} Prozent, Ablehnung ${rejectPercent} Prozent`"
  >
    <span class="mood-bar__track" aria-hidden="true">
      <span
        v-if="approvePercent > 0"
        class="mood-bar__segment mood-bar__segment--approve"
        :style="{ width: `${approvePercent}%` }"
      />
      <span
        v-if="rejectPercent > 0"
        class="mood-bar__segment mood-bar__segment--reject"
        :style="{ width: `${rejectPercent}%` }"
      />
      <span
        v-if="abstainPercent > 0"
        class="mood-bar__segment mood-bar__segment--abstain"
        :style="{ width: `${abstainPercent}%` }"
      />
    </span>
    <span class="mood-bar__values" aria-hidden="true">
      <span v-if="approvePercent > 0" class="mood-bar__value mood-bar__value--approve">
        {{ approvePercent }}%
      </span>
      <span v-if="rejectPercent > 0" class="mood-bar__value mood-bar__value--reject">
        {{ rejectPercent }}%
      </span>
    </span>
  </span>
</template>

<style scoped>
.mood-bar {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.mood-bar__track {
  display: flex;
  width: 52px;
  height: 6px;
  background: var(--color-border);
  border-radius: var(--radius-pill);
  overflow: hidden;
}

.mood-bar__segment {
  height: 100%;
  min-width: 0;
  transition: width 0.25s ease;
}

.mood-bar__segment--approve {
  background: var(--mood-approve);
}

.mood-bar__segment--reject {
  background: var(--mood-reject);
}

.mood-bar__segment--abstain {
  background: var(--mood-abstain);
}

.mood-bar__values {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-variant-numeric: tabular-nums;
}

.mood-bar__value {
  font-weight: 700;
}

.mood-bar__value--approve {
  color: var(--mood-approve);
}

.mood-bar__value--reject {
  color: var(--mood-reject);
}
</style>
