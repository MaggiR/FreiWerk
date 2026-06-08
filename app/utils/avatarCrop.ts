export interface AvatarCropTransform {
  scale: number
  offsetX: number
  offsetY: number
}

/** Scale so the image fully covers a square viewport. */
export function coverScale(
  imageWidth: number,
  imageHeight: number,
  viewportSize: number,
): number {
  if (imageWidth <= 0 || imageHeight <= 0) return 1
  return Math.max(viewportSize / imageWidth, viewportSize / imageHeight)
}

/** Scale so the entire image fits inside the viewport (maximum zoom-out). */
export function containScale(
  imageWidth: number,
  imageHeight: number,
  viewportSize: number,
): number {
  if (imageWidth <= 0 || imageHeight <= 0) return 1
  return Math.min(viewportSize / imageWidth, viewportSize / imageHeight)
}

export function clampOffset(
  offsetX: number,
  offsetY: number,
  imageWidth: number,
  imageHeight: number,
  scale: number,
  viewportSize: number,
): { offsetX: number; offsetY: number } {
  const drawWidth = imageWidth * scale
  const drawHeight = imageHeight * scale
  const maxX = Math.max(0, (drawWidth - viewportSize) / 2)
  const maxY = Math.max(0, (drawHeight - viewportSize) / 2)
  return {
    offsetX: Math.min(maxX, Math.max(-maxX, offsetX)),
    offsetY: Math.min(maxY, Math.max(-maxY, offsetY)),
  }
}

/** Exported avatar edge length in pixels (2× typical display size for sharp rendering). */
export const AVATAR_OUTPUT_SIZE = 1024

export async function cropAvatarToBlob(
  image: HTMLImageElement,
  viewportSize: number,
  transform: AvatarCropTransform,
  mimeType: string,
  outputSize = AVATAR_OUTPUT_SIZE,
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = outputSize
  canvas.height = outputSize
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas nicht verfügbar.')
  }

  const ratio = outputSize / viewportSize
  const drawWidth = image.naturalWidth * transform.scale
  const drawHeight = image.naturalHeight * transform.scale
  const x = (viewportSize - drawWidth) / 2 + transform.offsetX
  const y = (viewportSize - drawHeight) / 2 + transform.offsetY

  if (mimeType !== 'image/png') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, outputSize, outputSize)
  }

  ctx.drawImage(image, x * ratio, y * ratio, drawWidth * ratio, drawHeight * ratio)

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, mimeType, 0.92)
  })
  if (!blob) {
    throw new Error('Zuschnitt fehlgeschlagen.')
  }
  return blob
}
