import { z } from 'zod'
import { eq, sql } from 'drizzle-orm'
import { db } from '../../../database/client'
import { ballots } from '../../../database/schema'
import { emptyBallotCounts } from '../../../utils/ballot'
import { htmlToMarkdown } from '../../../utils/markdown'
import { motionExportQuerySchema } from '../../../utils/validation'
import type { BallotChoice } from '../../../database/schema'
import {
  BALLOT_CHOICES,
  BALLOT_LABELS,
  MOTION_OUTCOME_LABELS,
  MOTION_STATUS_LABELS,
  TOPIC_LABELS,
  type MotionOutcomeValue,
  type Topic,
} from '../../../../shared/constants'

const paramsSchema = z.object({ id: z.string().uuid() })

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return ''
  const date = typeof value === 'string' ? new Date(value) : value
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  await getValidatedQuery(event, motionExportQuerySchema.parse)

  const motion = await db.query.motions.findFirst({
    where: (m, { eq: eqOp }) => eqOp(m.id, id),
    with: {
      author: { columns: { id: true, displayName: true } },
      division: { columns: { name: true } },
    },
  })

  if (!motion) {
    throw createError({ statusCode: 404, statusMessage: 'Antrag nicht gefunden.' })
  }

  // Decision documents only exist for decided or archived motions.
  const isDecided = motion.status === 'decided'
  if (!isDecided && !motion.archivedAt) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Ein Export ist erst nach der Entscheidung möglich.',
    })
  }

  const counts = emptyBallotCounts()
  let totalVotes = 0
  if (isDecided) {
    const aggregateRows = await db
      .select({ choice: ballots.choice, count: sql<number>`count(*)::int` })
      .from(ballots)
      .where(eq(ballots.motionId, id))
      .groupBy(ballots.choice)
    for (const row of aggregateRows) {
      counts[row.choice as BallotChoice] = row.count
    }
    totalVotes = BALLOT_CHOICES.reduce((sum, c) => sum + counts[c], 0)
  }

  const authorName = motion.isAnonymous
    ? 'Anonym'
    : (motion.author?.displayName ?? 'Unbekannt')

  const lines: string[] = []
  lines.push(`# ${motion.title}`, '')
  lines.push(`> ${motion.summary}`, '')

  lines.push('## Eckdaten', '')
  lines.push(`- **Status:** ${MOTION_STATUS_LABELS[motion.status] ?? motion.status}`)
  lines.push(`- **Thema:** ${TOPIC_LABELS[motion.topic as Topic] ?? motion.topic}`)
  if (motion.division?.name) {
    lines.push(`- **Geltungsbereich:** ${motion.division.name}`)
  }
  lines.push(`- **Eingereicht von:** ${authorName}`)
  if (motion.publishedAt) {
    lines.push(`- **Veröffentlicht am:** ${formatDate(motion.publishedAt)}`)
  }
  lines.push(`- **Version:** ${motion.currentVersion}`)

  if (isDecided && motion.outcome) {
    lines.push('', '## Beschluss', '')
    lines.push(
      `**Ergebnis:** ${MOTION_OUTCOME_LABELS[motion.outcome as MotionOutcomeValue] ?? motion.outcome}`,
      '',
    )
    if (motion.ballotStartedAt && motion.ballotEndsAt) {
      lines.push(
        `Geheime Schlussabstimmung vom ${formatDate(motion.ballotStartedAt)} bis ${formatDate(motion.ballotEndsAt)}.`,
        '',
      )
    }
    lines.push(`- ${BALLOT_LABELS.approve}: ${counts.approve}`)
    lines.push(`- ${BALLOT_LABELS.reject}: ${counts.reject}`)
    lines.push(`- ${BALLOT_LABELS.abstain}: ${counts.abstain}`)
    lines.push(`- Gesamt: ${totalVotes}`)
  }

  lines.push('', '## Antragstext', '')
  lines.push(htmlToMarkdown(motion.bodyHtml))
  lines.push('', '---', '')
  lines.push(`_Exportiert am ${formatDate(new Date())} über FreiWerk._`)

  const markdown = lines.join('\n')
  const filename = `antrag-${slugify(motion.title) || motion.id}.md`

  setResponseHeader(event, 'Content-Type', 'text/markdown; charset=utf-8')
  setResponseHeader(
    event,
    'Content-Disposition',
    `attachment; filename="${filename}"`,
  )
  return markdown
})
