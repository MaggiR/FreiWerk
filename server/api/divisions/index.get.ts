import { asc } from 'drizzle-orm'
import { db } from '../../database/client'
import { divisions } from '../../database/schema'

export default defineEventHandler(async () => {
  const rows = await db
    .select({
      id: divisions.id,
      name: divisions.name,
      slug: divisions.slug,
      parentId: divisions.parentId,
    })
    .from(divisions)
    .orderBy(asc(divisions.name))

  return { divisions: rows }
})
