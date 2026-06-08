import { createHash } from 'node:crypto'
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const AVATAR_SIZE = 256

/** Stable UUID v4-shaped id per seed user email (reproducible across seed runs). */
export function seedAvatarId(email: string): string {
  const hash = createHash('sha256').update(`freiwerk-seed-avatar:${email}`).digest('hex')
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `4${hash.slice(13, 16)}`,
    `a${hash.slice(17, 20)}`,
    hash.slice(20, 32),
  ].join('-')
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const sat = s / 100
  const light = l / 100
  const c = (1 - Math.abs(2 * light - 1)) * sat
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = light - c / 2
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ]
}

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff
  for (let i = 0; i < buffer.length; i++) {
    crc ^= buffer[i]!
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, 'ascii')
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])))
  return Buffer.concat([length, typeBuf, data, crcBuf])
}

export function encodePng(width: number, height: number, rgba: Uint8Array): Buffer {
  const stride = width * 4
  const raw = Buffer.alloc(height * (1 + stride))
  let offset = 0
  for (let y = 0; y < height; y++) {
    raw[offset++] = 0
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      raw[offset++] = rgba[i]!
      raw[offset++] = rgba[i + 1]!
      raw[offset++] = rgba[i + 2]!
      raw[offset++] = rgba[i + 3]!
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

function setPixel(
  rgba: Uint8Array,
  width: number,
  x: number,
  y: number,
  color: [number, number, number, number],
): void {
  if (x < 0 || y < 0 || x >= width || y >= width) return
  const i = (y * width + x) * 4
  rgba[i] = color[0]
  rgba[i + 1] = color[1]
  rgba[i + 2] = color[2]
  rgba[i + 3] = color[3]
}

function fillCircle(
  rgba: Uint8Array,
  width: number,
  cx: number,
  cy: number,
  radius: number,
  color: [number, number, number, number],
): void {
  const r2 = radius * radius
  const minY = Math.max(0, Math.floor(cy - radius))
  const maxY = Math.min(width - 1, Math.ceil(cy + radius))
  const minX = Math.max(0, Math.floor(cx - radius))
  const maxX = Math.min(width - 1, Math.ceil(cx + radius))
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x - cx
      const dy = y - cy
      if (dx * dx + dy * dy <= r2) setPixel(rgba, width, x, y, color)
    }
  }
}

function fillRect(
  rgba: Uint8Array,
  width: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: [number, number, number, number],
): void {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      setPixel(rgba, width, x, y, color)
    }
  }
}

/** Draw a simple friendly avatar (soft colors, smiling face). */
export function renderSeedAvatarPixels(hue: number): Uint8Array {
  const rgba = new Uint8Array(AVATAR_SIZE * AVATAR_SIZE * 4)
  const bg = [...hslToRgb(hue, 42, 78), 255] as [number, number, number, number]
  const face = [...hslToRgb(hue, 22, 94), 255] as [number, number, number, number]
  const feature: [number, number, number, number] = [3, 45, 103, 255]
  const cheek = [...hslToRgb(hue, 45, 72), 255] as [number, number, number, number]

  fillRect(rgba, AVATAR_SIZE, 0, 0, AVATAR_SIZE - 1, AVATAR_SIZE - 1, bg)
  fillCircle(rgba, AVATAR_SIZE, 128, 132, 88, face)
  fillCircle(rgba, AVATAR_SIZE, 96, 156, 14, cheek)
  fillCircle(rgba, AVATAR_SIZE, 160, 156, 14, cheek)
  fillCircle(rgba, AVATAR_SIZE, 102, 118, 10, feature)
  fillCircle(rgba, AVATAR_SIZE, 154, 118, 10, feature)

  for (let x = 104; x <= 152; x++) {
    const t = (x - 104) / 48
    const y = 150 + Math.sin(t * Math.PI) * 10
    fillCircle(rgba, AVATAR_SIZE, x, y, 4, feature)
  }

  return rgba
}

const SEED_AVATAR_HUES = [48, 198, 168, 12, 280, 205, 95, 330, 140, 22]

export function seedAvatarHue(index: number): number {
  return SEED_AVATAR_HUES[index % SEED_AVATAR_HUES.length]!
}

export function writeSeedAvatarFile(
  email: string,
  hue: number,
  uploadDir = path.join(process.cwd(), 'public', 'uploads'),
): string {
  mkdirSync(uploadDir, { recursive: true })
  const id = seedAvatarId(email)
  const fileName = `${id}.png`
  const png = encodePng(AVATAR_SIZE, AVATAR_SIZE, renderSeedAvatarPixels(hue))
  writeFileSync(path.join(uploadDir, fileName), png)
  return `/uploads/${fileName}`
}
