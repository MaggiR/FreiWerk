export const ANONYMOUS_AUTHOR_LABEL = 'Anonym'

type MotionAuthorFields = {
  authorId: string
  authorName: string | null
  isAnonymous: boolean
}

/** Hide author identity on public responses; owners keep authorId for authorization UI. */
export function redactMotionAuthor<T extends MotionAuthorFields>(
  row: T,
  viewerId?: string,
): T {
  if (!row.isAnonymous) return row
  const isOwner = viewerId === row.authorId
  return {
    ...row,
    authorId: isOwner ? row.authorId : (null as unknown as string),
    authorName: ANONYMOUS_AUTHOR_LABEL,
  }
}
