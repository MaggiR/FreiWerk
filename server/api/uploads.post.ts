import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { requireAuth } from '../utils/auth'
import {
  UPLOAD_MAX_BYTES,
  extensionForMime,
  isAllowedUploadMime,
  sanitizeOriginalFilename,
} from '../utils/uploads'

export default defineEventHandler(async (event) => {
  await requireAuth(event)

  const parts = await readMultipartFormData(event)
  const file = parts?.find((part) => part.name === 'file' && part.filename)

  if (!file?.data?.length || !file.type) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Keine Datei übermittelt.',
    })
  }

  if (!isAllowedUploadMime(file.type)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Dateityp nicht erlaubt.',
    })
  }

  if (file.data.length > UPLOAD_MAX_BYTES) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Datei ist zu groß (max. 5 MB).',
    })
  }

  const storedName = `${randomUUID()}${extensionForMime(file.type)}`
  const uploadDir = path.join(process.cwd(), 'public', 'uploads')
  await mkdir(uploadDir, { recursive: true })
  await writeFile(path.join(uploadDir, storedName), file.data)

  const displayName = sanitizeOriginalFilename(file.filename ?? storedName)

  return {
    url: `/uploads/${storedName}`,
    name: displayName,
    mimeType: file.type,
  }
})
