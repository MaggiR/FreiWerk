<script setup lang="ts">
import type { MotionListItem } from '../../shared/types'

const props = defineProps<{ motions: MotionListItem[] }>()

const emit = defineEmits<{
  'watch-changed': [payload: { motionId: string; watched: boolean }]
}>()

const GAP_PX = 16

const track = ref<HTMLElement | null>(null)
const visibleCount = ref(3)
const currentPage = ref(0)

const pageCount = computed(() =>
  Math.max(1, Math.ceil(props.motions.length / visibleCount.value)),
)

function pageWidth(): number {
  const el = track.value
  if (!el) return 0
  return el.clientWidth + GAP_PX
}

function updateVisibleCount() {
  const el = track.value
  if (!el) return
  const w = el.clientWidth
  const next = w >= 860 ? 3 : w >= 560 ? 2 : 1
  if (next !== visibleCount.value) visibleCount.value = next
}

function updateCurrentPage() {
  const el = track.value
  if (!el) return
  const pw = pageWidth()
  if (pw <= 0) return
  currentPage.value = Math.min(
    pageCount.value - 1,
    Math.max(0, Math.round(el.scrollLeft / pw)),
  )
}

function goToPage(index: number) {
  const el = track.value
  if (!el) return
  const clamped = Math.min(pageCount.value - 1, Math.max(0, index))
  el.scrollTo({ left: clamped * pageWidth(), behavior: 'smooth' })
}

function onScroll() {
  updateCurrentPage()
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  nextTick(() => {
    updateVisibleCount()
    updateCurrentPage()
  })
  if (track.value && 'ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(() => {
      updateVisibleCount()
      updateCurrentPage()
    })
    resizeObserver.observe(track.value)
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})

const isDragging = ref(false)
let dragStartX = 0
let dragStartScroll = 0
let hasDragged = false

function onPointerDown(event: PointerEvent) {
  if (event.pointerType !== 'mouse') return
  const el = track.value
  if (!el) return
  isDragging.value = true
  hasDragged = false
  dragStartX = event.clientX
  dragStartScroll = el.scrollLeft
  el.setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent) {
  if (!isDragging.value) return
  const el = track.value
  if (!el) return
  const delta = event.clientX - dragStartX
  if (Math.abs(delta) > 4) hasDragged = true
  el.scrollLeft = dragStartScroll - delta
}

function onPointerUp(event: PointerEvent) {
  if (!isDragging.value) return
  const el = track.value
  isDragging.value = false
  el?.releasePointerCapture(event.pointerId)
  const pw = pageWidth()
  if (el && pw > 0) {
    goToPage(Math.round(el.scrollLeft / pw))
  }
}

function onClickCapture(event: MouseEvent) {
  if (hasDragged) {
    event.preventDefault()
    event.stopPropagation()
    hasDragged = false
  }
}

const canScrollPrev = computed(() => currentPage.value > 0)
const canScrollNext = computed(() => currentPage.value < pageCount.value - 1)
</script>

<template>
  <div class="motion-carousel">
    <button
      v-if="pageCount > 1"
      type="button"
      class="motion-carousel__arrow motion-carousel__arrow--prev"
      :class="{ 'is-disabled': !canScrollPrev }"
      :disabled="!canScrollPrev"
      aria-label="Vorherige Anträge"
      @click="goToPage(currentPage - 1)"
    >
      <FontAwesomeIcon icon="chevron-left" />
    </button>

    <ul
      ref="track"
      class="motion-carousel__track"
      :class="{ 'is-dragging': isDragging }"
      :style="{ '--cols': visibleCount }"
      @scroll="onScroll"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @dragstart.prevent
      @click.capture="onClickCapture"
    >
      <li
        v-for="(m, index) in motions"
        :key="m.id"
        class="motion-carousel__item"
        :class="{ 'is-snap': index % visibleCount === 0 }"
      >
        <MotionCard :motion="m" @watch-changed="emit('watch-changed', $event)" />
      </li>
    </ul>

    <button
      v-if="pageCount > 1"
      type="button"
      class="motion-carousel__arrow motion-carousel__arrow--next"
      :class="{ 'is-disabled': !canScrollNext }"
      :disabled="!canScrollNext"
      aria-label="Weitere Anträge"
      @click="goToPage(currentPage + 1)"
    >
      <FontAwesomeIcon icon="chevron-right" />
    </button>

    <div v-if="pageCount > 1" class="motion-carousel__dots" role="tablist">
      <button
        v-for="page in pageCount"
        :key="page"
        type="button"
        class="motion-carousel__dot"
        :class="{ 'is-active': currentPage === page - 1 }"
        :aria-label="`Seite ${page} anzeigen`"
        :aria-selected="currentPage === page - 1"
        @click="goToPage(page - 1)"
      />
    </div>
  </div>
</template>

<style scoped>
.motion-carousel {
  position: relative;
}
.motion-carousel__track {
  display: flex;
  gap: 1rem;
  margin: 0;
  padding: var(--space-1) var(--space-1) var(--space-3);
  list-style: none;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
  cursor: grab;
}
.motion-carousel__track::-webkit-scrollbar {
  display: none;
}
.motion-carousel__track.is-dragging {
  cursor: grabbing;
  scroll-snap-type: none;
  scroll-behavior: auto;
  user-select: none;
}
.motion-carousel__item {
  flex: 0 0 calc((100% - (var(--cols) - 1) * 1rem) / var(--cols));
  min-width: 0;
}
.motion-carousel__item.is-snap {
  scroll-snap-align: start;
}

.motion-carousel__arrow {
  display: none;
}

@media (hover: hover) and (min-width: 860px) {
  .motion-carousel__arrow {
    position: absolute;
    top: calc(50% - var(--space-3));
    transform: translateY(-50%);
    z-index: 2;
    display: grid;
    place-items: center;
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 50%;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text);
    box-shadow: var(--shadow-md);
    cursor: pointer;
    transition: opacity 0.2s ease, background 0.15s ease, color 0.15s ease;
  }
  .motion-carousel__arrow:hover {
    background: var(--color-accent);
    color: #fff;
  }
  .motion-carousel__arrow--prev {
    left: 0;
    transform: translate(-50%, -50%);
  }
  .motion-carousel__arrow--next {
    right: 0;
    transform: translate(50%, -50%);
  }
  .motion-carousel__arrow.is-disabled {
    opacity: 0;
    pointer-events: none;
  }
}

.motion-carousel__dots {
  display: flex;
  justify-content: center;
  gap: var(--space-3);
  margin-top: var(--space-2);
}
.motion-carousel__dot {
  width: 0.6rem;
  height: 0.6rem;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: var(--color-border);
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease;
}
.motion-carousel__dot:hover {
  background: var(--color-text-muted);
}
.motion-carousel__dot.is-active {
  background: var(--color-accent);
  transform: scale(1.3);
}
</style>
