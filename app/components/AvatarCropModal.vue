<script setup lang="ts">
import {
  clampOffset,
  containScale,
  coverScale,
  cropAvatarToBlob,
  type AvatarCropTransform,
} from '~/utils/avatarCrop'

const props = defineProps<{
  open: boolean
  src: string
  mimeType: string
}>()

const emit = defineEmits<{
  close: []
  confirm: [blob: Blob]
}>()

const VIEWPORT_SIZE = 280

const imageRef = ref<HTMLImageElement | null>(null)
const scale = ref(1)
const offsetX = ref(0)
const offsetY = ref(0)
const minScale = ref(1)
const coverScaleValue = ref(1)
const pending = ref(false)
const backdropPressed = ref(false)

const dragActive = ref(false)
const dragOrigin = ref({ x: 0, y: 0, offsetX: 0, offsetY: 0 })

const maxScale = computed(() =>
  Math.max(minScale.value * 3, coverScaleValue.value * 3),
)

watch(
  () => props.open,
  (open) => {
    if (!open) return
    pending.value = false
    nextTick(() => resetTransform())
  },
)

function resetTransform() {
  const img = imageRef.value
  if (!img?.complete || img.naturalWidth <= 0) return

  const nextMin = containScale(img.naturalWidth, img.naturalHeight, VIEWPORT_SIZE)
  coverScaleValue.value = coverScale(
    img.naturalWidth,
    img.naturalHeight,
    VIEWPORT_SIZE,
  )
  minScale.value = nextMin
  scale.value = nextMin
  offsetX.value = 0
  offsetY.value = 0
}

function onImageLoad() {
  resetTransform()
}

function applyOffset(nextX: number, nextY: number) {
  const img = imageRef.value
  if (!img) return
  const clamped = clampOffset(
    nextX,
    nextY,
    img.naturalWidth,
    img.naturalHeight,
    scale.value,
    VIEWPORT_SIZE,
  )
  offsetX.value = clamped.offsetX
  offsetY.value = clamped.offsetY
}

function onPointerDown(event: PointerEvent) {
  if (pending.value) return
  dragActive.value = true
  dragOrigin.value = {
    x: event.clientX,
    y: event.clientY,
    offsetX: offsetX.value,
    offsetY: offsetY.value,
  }
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent) {
  if (!dragActive.value) return
  applyOffset(
    dragOrigin.value.offsetX + (event.clientX - dragOrigin.value.x),
    dragOrigin.value.offsetY + (event.clientY - dragOrigin.value.y),
  )
}

function onPointerUp(event: PointerEvent) {
  if (!dragActive.value) return
  dragActive.value = false
  ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)
}

watch(scale, () => {
  applyOffset(offsetX.value, offsetY.value)
})

function onBackdropMouseDown(event: MouseEvent) {
  backdropPressed.value = event.target === event.currentTarget
}

function onBackdropClick(event: MouseEvent) {
  if (backdropPressed.value && event.target === event.currentTarget) {
    emit('close')
  }
  backdropPressed.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.open) {
    emit('close')
  }
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))

const imageStyle = computed(() => {
  const img = imageRef.value
  if (!img) return {}
  const width = img.naturalWidth * scale.value
  const height = img.naturalHeight * scale.value
  return {
    width: `${width}px`,
    height: `${height}px`,
    transform: `translate(calc(-50% + ${offsetX.value}px), calc(-50% + ${offsetY.value}px))`,
  }
})

async function onConfirm() {
  const img = imageRef.value
  if (!img) return
  pending.value = true
  try {
    const transform: AvatarCropTransform = {
      scale: scale.value,
      offsetX: offsetX.value,
      offsetY: offsetY.value,
    }
    const blob = await cropAvatarToBlob(
      img,
      VIEWPORT_SIZE,
      transform,
      props.mimeType,
    )
    emit('confirm', blob)
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="avatar-crop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="avatar-crop-title"
      @mousedown="onBackdropMouseDown"
      @click="onBackdropClick"
    >
      <FwCard class="avatar-crop__card" glass pad>
        <h2 id="avatar-crop-title" class="avatar-crop__title">Profilbild zuschneiden</h2>
        <p class="avatar-crop__sub">
          Verschiebe und zoome das Bild, bis der Ausschnitt passt.
        </p>

        <div
          class="avatar-crop__viewport"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
        >
          <img
            ref="imageRef"
            :src="src"
            alt=""
            class="avatar-crop__image"
            :style="imageStyle"
            draggable="false"
            @load="onImageLoad"
          >
        </div>

        <label class="avatar-crop__zoom field">
          <span>Zoom</span>
          <input
            v-model.number="scale"
            type="range"
            :min="minScale"
            :max="maxScale"
            :step="0.01"
            :disabled="pending"
          >
        </label>

        <div class="avatar-crop__actions">
          <FwButton type="button" variant="ghost" :disabled="pending" @click="emit('close')">
            Abbrechen
          </FwButton>
          <FwButton type="button" :disabled="pending" @click="onConfirm">
            {{ pending ? 'Wird verarbeitet…' : 'Übernehmen' }}
          </FwButton>
        </div>
      </FwCard>
    </div>
  </Teleport>
</template>

<style scoped>
.avatar-crop {
  position: fixed;
  inset: 0;
  z-index: 110;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background: rgba(3, 45, 103, 0.45);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}

.dark .avatar-crop {
  background: rgba(0, 0, 0, 0.65);
}

.avatar-crop__card {
  width: 100%;
  max-width: 420px;
}

.avatar-crop__title {
  margin: 0 0 var(--space-1);
  font-size: 1.35rem;
}

.avatar-crop__sub {
  margin: 0 0 var(--space-4);
  color: var(--color-text-muted);
}

.avatar-crop__viewport {
  position: relative;
  width: 280px;
  height: 280px;
  margin: 0 auto var(--space-4);
  border-radius: var(--radius-pill);
  overflow: hidden;
  border: 2px solid var(--color-border);
  background: var(--color-bg);
  cursor: grab;
  touch-action: none;
  user-select: none;
}

.avatar-crop__viewport:active {
  cursor: grabbing;
}

.avatar-crop__image {
  position: absolute;
  top: 50%;
  left: 50%;
  max-width: none;
  pointer-events: none;
}

.avatar-crop__zoom {
  margin-bottom: var(--space-4);
}

.avatar-crop__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
}
</style>
