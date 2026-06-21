import type * as schema from './schema'
import { validateWorkingDoc } from '../utils/suggestions'
import { daysAgo, SEED_DISPLAY_NAME_BY_EMAIL } from './seed-data'

type PmMark = { type: string; attrs?: Record<string, unknown> }
type PmNode = {
  type: string
  text?: string
  marks?: PmMark[]
  content?: PmNode[]
  attrs?: Record<string, unknown>
}

type UpvoteTargetType = 'argument' | 'question' | 'answer' | 'resource' | 'post'

export type DeliberationMotionContext = {
  motionId: string
  motionTitle: string
  bodyDemand: string
  bodyTheme: string
  authorId: string
  status: string
  publishedAt: Date | null
  userIdByEmail: Record<string, string>
  memberIds: string[]
  postIds: string[]
  now: Date
}

export type DeliberationSeedBundle = {
  arguments: (typeof schema.motionArguments.$inferInsert)[]
  questions: (typeof schema.questions.$inferInsert)[]
  answers: (typeof schema.answers.$inferInsert)[]
  resources: (typeof schema.resources.$inferInsert)[]
  upvotes: (typeof schema.elementUpvotes.$inferInsert)[]
  references: (typeof schema.elementReferences.$inferInsert)[]
  activityEvents: (typeof schema.activityEvents.$inferInsert)[]
  workingDocs: (typeof schema.motionWorkingDocs.$inferInsert)[]
}

type ArgumentSeed = Omit<
  typeof schema.motionArguments.$inferInsert,
  'motionId' | 'authorId' | 'reviewedById' | 'reviewedAt' | 'createdAt'
> & { authorEmail: string; daysAgo?: number }

type QuestionSeed = {
  authorEmail: string
  title: string
  bodyHtml: string
  status: 'open' | 'partially_answered' | 'answered'
  daysAgo: number
  answers: {
    authorEmail: string
    bodyHtml: string
    daysAgo: number
    accepted?: boolean
  }[]
}

type ResourceSeed = Omit<
  typeof schema.resources.$inferInsert,
  'motionId' | 'authorId' | 'reviewedById' | 'reviewedAt' | 'createdAt'
> & { authorEmail: string; daysAgo?: number }

type SuggestionSeed = {
  id: number
  authorEmail: string
  type: 'insertion' | 'deletion'
  text: string
  daysAgo: number
}

type MotionDeliberationPack = {
  arguments: ArgumentSeed[]
  questions: QuestionSeed[]
  resources: ResourceSeed[]
  suggestions?: SuggestionSeed[]
}

function t(text: string, marks?: PmMark[]): PmNode {
  const node: PmNode = { type: 'text', text }
  if (marks?.length) node.marks = marks
  return node
}

function p(...content: PmNode[]): PmNode {
  return { type: 'paragraph', content }
}

function h2(text: string): PmNode {
  return { type: 'heading', attrs: { level: 2 }, content: [t(text)] }
}

function markAttrs(
  id: number,
  userId: string,
  userName: string,
  createdAt: Date,
): Record<string, unknown> {
  return { id, userId, userName, createdAt: createdAt.toISOString() }
}

function buildWorkingDoc(
  demand: string,
  theme: string,
  suggestions: SuggestionSeed[],
  userIdByEmail: Record<string, string>,
  displayNameByEmail: Record<string, string>,
  now: Date,
): PmNode {
  const suggestionNodes: PmNode[] = []

  for (const item of suggestions) {
    const userId = userIdByEmail[item.authorEmail]
    const userName = displayNameByEmail[item.authorEmail] ?? 'Mitglied'
    if (!userId) continue
    const createdAt = daysAgo(now, item.daysAgo)
    const mark: PmMark = {
      type: item.type,
      attrs: markAttrs(item.id, userId, userName, createdAt),
    }
    suggestionNodes.push(t(item.text, [mark]))
  }

  const doc: PmNode = {
    type: 'doc',
    content: [
      h2('Motivation'),
      p(
        t('Digitale Verfahren sollen Bürgerinnen und Bürgern spürbar entlasten. '),
        t('Im Kontext von '),
        t(`${theme} `),
        ...suggestionNodes.slice(0, 1),
        t(' brauchen wir klare, überprüfbare Maßnahmen.'),
      ),
      h2('Forderungen'),
      p(t(demand), ...(suggestionNodes.length > 1 ? suggestionNodes.slice(1) : [])),
      h2('Begründung'),
      p(
        t(
          'Transparente Prozesse und offene Standards stärken Vertrauen und ermöglichen breite Beteiligung an der Ausgestaltung.',
        ),
      ),
    ],
  }

  const validation = validateWorkingDoc(doc)
  if (!validation.ok) {
    throw new Error(`Invalid seed working doc: ${validation.reason}`)
  }
  return doc
}

const EU_DIGITAL_IDENTITY: MotionDeliberationPack = {
  suggestions: [
    {
      id: 1,
      authorEmail: 'anna.schneider@freiwerk.local',
      type: 'insertion',
      text: 'ausschließlich freiwillig und ',
      daysAgo: 3,
    },
    {
      id: 2,
      authorEmail: 'demo@freiwerk.local',
      type: 'deletion',
      text: 'verbindliche ',
      daysAgo: 2,
    },
    {
      id: 3,
      authorEmail: 'lisa.koch@freiwerk.local',
      type: 'insertion',
      text: 'quelloffener ',
      daysAgo: 1,
    },
  ],
  arguments: [
    {
      authorEmail: 'felix.weber@freiwerk.local',
      stance: 'pro',
      title: 'Europäische Interoperabilität stärken',
      bodyHtml:
        '<p>Eine einheitliche digitale Identität erleichtert grenzüberschreitende Behördengänge und stärkt den Binnenmarkt.</p>',
      status: 'accepted',
      deliberationStatus: 'confirmed',
      daysAgo: 4,
    },
    {
      authorEmail: 'julia.hartmann@freiwerk.local',
      stance: 'con',
      title: 'Datenschutzrisiko bei zentralen Identitätsstores',
      bodyHtml:
        '<p>Zentrale Speicherung birgt Missbrauchsrisiken; Alternativen sollten dezentral und selbstbestimmt sein.</p>',
      status: 'accepted',
      deliberationStatus: 'open',
      daysAgo: 3,
    },
    {
      authorEmail: 'demo@freiwerk.local',
      stance: 'pro',
      title: 'Open-Source-Pflicht für Wallet-Software',
      bodyHtml:
        '<p>Quelloffene Implementierungen ermöglichen unabhängige Sicherheitsprüfungen und Vertrauen.</p>',
      status: 'accepted',
      deliberationStatus: 'confirmed',
      daysAgo: 2,
    },
    {
      authorEmail: 'thomas.berger@freiwerk.local',
      stance: 'con',
      title: 'Implementierungskosten für Mittelstand',
      bodyHtml:
        '<p>Kleine Anbieter können die Anbindung an neue Identitätsstandards kaum stemmen.</p>',
      status: 'proposed',
      daysAgo: 1,
    },
    {
      authorEmail: 'mark.rothermel@freiwerk.local',
      stance: 'pro',
      title: 'Bürgerfreundliche Wallet-Oberflächen',
      bodyHtml: '<p>Die Nutzung muss ohne technisches Vorwissen möglich sein.</p>',
      status: 'accepted',
      deliberationStatus: 'refuted',
      daysAgo: 2,
    },
  ],
  questions: [
    {
      authorEmail: 'admin@freiwerk.local',
      title: 'Wie wird Freiwilligkeit sichergestellt?',
      bodyHtml: '<p>Gibt es Sanktionen, wenn Behörden die Nutzung faktisch erzwingen?</p>',
      status: 'answered',
      daysAgo: 4,
      answers: [
        {
          authorEmail: 'felix.weber@freiwerk.local',
          bodyHtml:
            '<p>Der Antrag sieht ausdrücklich freiwillige Nutzung vor; Behörden müssen analoge Wege gleichwertig anbieten.</p>',
          daysAgo: 3,
          accepted: true,
        },
        {
          authorEmail: 'mod@freiwerk.local',
          bodyHtml:
            '<p>Ergänzend schlagen wir ein Beschwerderecht bei faktischem Zwang vor.</p>',
          daysAgo: 2,
        },
      ],
    },
    {
      authorEmail: 'lisa.koch@freiwerk.local',
      title: 'Welche Standards werden unterstützt?',
      bodyHtml: '<p>Bezieht sich der Antrag auf eIDAS 2.0 und welche Profile?</p>',
      status: 'partially_answered',
      daysAgo: 2,
      answers: [
        {
          authorEmail: 'felix.weber@freiwerk.local',
          bodyHtml:
            '<p>Ja, eIDAS 2.0 ist Referenzrahmen; konkrete Profile werden im Umsetzungspaket spezifiziert.</p>',
          daysAgo: 1,
        },
      ],
    },
    {
      authorEmail: 'sarah.mueller@freiwerk.local',
      title: 'Timeline für Pilotprojekte?',
      bodyHtml: '<p>Wann sollen erste Kommunen anbinden können?</p>',
      status: 'open',
      daysAgo: 0,
      answers: [],
    },
  ],
  resources: [
    {
      authorEmail: 'mark.rothermel@freiwerk.local',
      title: 'Ein PDF',
      description: 'Eindeutig eine Datei',
      kind: 'file',
      url: '/uploads/seed-eu-id-background.pdf',
      status: 'proposed',
      daysAgo: 1,
    },
    {
      authorEmail: 'mark.rothermel@freiwerk.local',
      title: 'Beschluss des Bundesverfassungsgerichts',
      kind: 'link',
      url: 'https://www.bundesverfassungsgericht.de/',
      status: 'proposed',
      daysAgo: 1,
    },
    {
      authorEmail: 'felix.weber@freiwerk.local',
      title: 'eIDAS 2.0 – EU-Verordnungstext',
      description: 'Offizieller Referenzlink zur Verordnung.',
      kind: 'link',
      url: 'https://digital-strategy.ec.europa.eu/',
      status: 'accepted',
      daysAgo: 3,
    },
    {
      authorEmail: 'anna.schneider@freiwerk.local',
      title: 'Positionspapier LFA Digitales',
      description: 'Internes Hintergrundpapier (PDF).',
      kind: 'file',
      url: '/uploads/seed-lfa-digital-position.pdf',
      status: 'accepted',
      daysAgo: 4,
    },
  ],
}

function defaultPack(theme: string): MotionDeliberationPack {
  return {
    suggestions: [
      {
        id: 1,
        authorEmail: 'demo@freiwerk.local',
        type: 'insertion',
        text: 'schrittweise und evaluiert ',
        daysAgo: 2,
      },
      {
        id: 2,
        authorEmail: 'anna.schneider@freiwerk.local',
        type: 'deletion',
        text: 'sofort ',
        daysAgo: 1,
      },
    ],
    arguments: [
      {
        authorEmail: 'demo@freiwerk.local',
        stance: 'pro',
        title: 'Stärkt Teilhabe und Transparenz',
        bodyHtml:
          '<p>Der Antrag macht Entscheidungen nachvollziehbar und senkt Hürden zur Mitwirkung.</p>',
        status: 'accepted',
        deliberationStatus: 'confirmed',
        daysAgo: 3,
      },
      {
        authorEmail: 'anna.schneider@freiwerk.local',
        stance: 'con',
        title: 'Aufwand für kleine Gliederungen',
        bodyHtml:
          '<p>Ohne zusätzliche Ressourcen droht eine Überlastung ehrenamtlicher Strukturen.</p>',
        status: 'accepted',
        daysAgo: 2,
      },
      {
        authorEmail: 'thomas.berger@freiwerk.local',
        stance: 'pro',
        title: 'Vorbild aus anderen Verbänden',
        bodyHtml: '<p>Vergleichbare Modelle haben sich andernorts bereits bewährt.</p>',
        status: 'proposed',
        daysAgo: 1,
      },
    ],
    questions: [
      {
        authorEmail: 'anna.schneider@freiwerk.local',
        title: 'Wie wird die Umsetzung finanziert?',
        bodyHtml: '<p>Gibt es belastbare Zahlen für die ersten Jahre?</p>',
        status: 'answered',
        daysAgo: 2,
        answers: [
          {
            authorEmail: 'demo@freiwerk.local',
            bodyHtml:
              '<p>Die Finanzierung erfolgt aus bestehenden Mitteln; eine Aufstellung liegt dem Antrag bei.</p>',
            daysAgo: 1,
            accepted: true,
          },
        ],
      },
      {
        authorEmail: 'lisa.koch@freiwerk.local',
        title: `Welche Rolle spielt ${theme}?`,
        bodyHtml: '<p>Bitte die Zuständigkeiten zwischen Bund und Ländern erläutern.</p>',
        status: 'open',
        daysAgo: 0,
        answers: [],
      },
    ],
    resources: [
      {
        authorEmail: 'lisa.koch@freiwerk.local',
        title: 'Hintergrundpapier (FDP)',
        description: 'Weiterführende Quelle zur Einordnung des Antrags.',
        kind: 'link',
        url: 'https://www.fdp.de/',
        status: 'accepted',
        daysAgo: 2,
      },
      {
        authorEmail: 'mark.rothermel@freiwerk.local',
        title: 'Studie zur Umsetzbarkeit',
        kind: 'file',
        url: '/uploads/seed-feasibility-study.pdf',
        status: 'proposed',
        daysAgo: 1,
      },
    ],
  }
}

const PACK_BY_TITLE: Record<string, MotionDeliberationPack> = {
  'Europäische Digitale Identität für Deutschland': EU_DIGITAL_IDENTITY,
}

function resolvePack(title: string, theme: string): MotionDeliberationPack {
  return PACK_BY_TITLE[title] ?? defaultPack(theme)
}

function pushUpvotes(
  rows: (typeof schema.elementUpvotes.$inferInsert)[],
  targetType: UpvoteTargetType,
  targetId: string,
  voterIds: string[],
  count: number,
) {
  for (let i = 0; i < Math.min(count, voterIds.length); i++) {
    rows.push({
      targetType,
      targetId,
      userId: voterIds[i]!,
    })
  }
}

/** Build deliberation rows for one motion (IDs for questions/answers filled later). */
export function buildDeliberationBundle(
  ctx: DeliberationMotionContext,
): DeliberationSeedBundle {
  const pack = resolvePack(ctx.motionTitle, ctx.bodyTheme)
  const bundle: DeliberationSeedBundle = {
    arguments: [],
    questions: [],
    answers: [],
    resources: [],
    upvotes: [],
    references: [],
    activityEvents: [],
    workingDocs: [],
  }

  const voters = ctx.memberIds.filter((id) => id !== ctx.authorId)

  if (ctx.publishedAt) {
    bundle.activityEvents.push({
      motionId: ctx.motionId,
      actorId: ctx.authorId,
      type: 'debate_started',
      targetType: 'motion',
      targetId: ctx.motionId,
      createdAt: ctx.publishedAt,
    })
  }

  const argIds: string[] = []
  for (const arg of pack.arguments) {
    const authorId = ctx.userIdByEmail[arg.authorEmail] ?? ctx.memberIds[0]!
    const createdAt = daysAgo(ctx.now, arg.daysAgo ?? 2)
    const id = crypto.randomUUID()
    argIds.push(id)
    const accepted = arg.status === 'accepted'
    bundle.arguments.push({
      id,
      motionId: ctx.motionId,
      authorId,
      stance: arg.stance,
      title: arg.title,
      bodyHtml: arg.bodyHtml,
      status: arg.status,
      deliberationStatus: arg.deliberationStatus ?? 'open',
      reviewedById: accepted ? ctx.authorId : null,
      reviewedAt: accepted ? createdAt : null,
      createdAt,
    })
    if (accepted) {
      bundle.activityEvents.push({
        motionId: ctx.motionId,
        actorId: ctx.authorId,
        type: 'argument_accepted',
        targetType: 'argument',
        targetId: id,
        metadata: { title: arg.title },
        createdAt,
      })
    } else if (arg.status === 'proposed') {
      bundle.activityEvents.push({
        motionId: ctx.motionId,
        actorId: authorId,
        type: 'argument_proposed',
        targetType: 'argument',
        targetId: id,
        metadata: { title: arg.title },
        createdAt,
      })
    }
    pushUpvotes(bundle.upvotes, 'argument', id, voters, arg.stance === 'pro' ? 3 : 1)
  }

  for (const q of pack.questions) {
    const authorId = ctx.userIdByEmail[q.authorEmail] ?? ctx.memberIds[0]!
    const questionId = crypto.randomUUID()
    const createdAt = daysAgo(ctx.now, q.daysAgo)
    bundle.questions.push({
      id: questionId,
      motionId: ctx.motionId,
      authorId,
      title: q.title,
      bodyHtml: q.bodyHtml,
      status: q.status,
      createdAt,
    })
    bundle.activityEvents.push({
      motionId: ctx.motionId,
      actorId: authorId,
      type: 'question_asked',
      targetType: 'question',
      targetId: questionId,
      metadata: { title: q.title },
      createdAt,
    })
    pushUpvotes(bundle.upvotes, 'question', questionId, voters, 2)

    let acceptedAnswerId: string | null = null
    for (const ans of q.answers) {
      const answerAuthorId = ctx.userIdByEmail[ans.authorEmail] ?? ctx.authorId
      const answerId = crypto.randomUUID()
      const answerAt = daysAgo(ctx.now, ans.daysAgo)
      bundle.answers.push({
        id: answerId,
        questionId,
        motionId: ctx.motionId,
        authorId: answerAuthorId,
        bodyHtml: ans.bodyHtml,
        createdAt: answerAt,
      })
      bundle.activityEvents.push({
        motionId: ctx.motionId,
        actorId: answerAuthorId,
        type: 'question_answered',
        targetType: 'answer',
        targetId: answerId,
        createdAt: answerAt,
      })
      pushUpvotes(bundle.upvotes, 'answer', answerId, voters, ans.accepted ? 4 : 1)
      if (ans.accepted) {
        acceptedAnswerId = answerId
        bundle.activityEvents.push({
          motionId: ctx.motionId,
          actorId: answerAuthorId,
          type: 'answer_accepted',
          targetType: 'answer',
          targetId: answerId,
          createdAt: answerAt,
        })
      }
    }
    if (acceptedAnswerId) {
      const qRow = bundle.questions.find((row) => row.id === questionId)
      if (qRow) qRow.acceptedAnswerId = acceptedAnswerId
    }
  }

  for (const res of pack.resources) {
    const authorId = ctx.userIdByEmail[res.authorEmail] ?? ctx.memberIds[0]!
    const createdAt = daysAgo(ctx.now, res.daysAgo ?? 2)
    const id = crypto.randomUUID()
    const accepted = res.status === 'accepted'
    bundle.resources.push({
      id,
      motionId: ctx.motionId,
      authorId,
      title: res.title,
      description: res.description ?? null,
      kind: res.kind,
      url: res.url,
      status: res.status,
      reviewedById: accepted ? ctx.authorId : null,
      reviewedAt: accepted ? createdAt : null,
      createdAt,
    })
    if (accepted) {
      bundle.activityEvents.push({
        motionId: ctx.motionId,
        actorId: ctx.authorId,
        type: 'resource_accepted',
        targetType: 'resource',
        targetId: id,
        metadata: { title: res.title, kind: res.kind },
        createdAt,
      })
    } else {
      bundle.activityEvents.push({
        motionId: ctx.motionId,
        actorId: authorId,
        type: 'resource_proposed',
        targetType: 'resource',
        targetId: id,
        metadata: { title: res.title, kind: res.kind },
        createdAt,
      })
    }
    pushUpvotes(bundle.upvotes, 'resource', id, voters, accepted ? 2 : 0)
  }

  // Post upvotes (spread across first posts).
  ctx.postIds.forEach((postId, index) => {
    pushUpvotes(bundle.upvotes, 'post', postId, voters, index === 0 ? 1 : index % 3 === 0 ? 2 : 0)
  })

  // Reference: first post cites first argument when both exist.
  if (ctx.postIds[0] && argIds[0]) {
    bundle.references.push({
      motionId: ctx.motionId,
      sourceType: 'post',
      sourceId: ctx.postIds[0]!,
      targetType: 'argument',
      targetId: argIds[0]!,
      excerptText: pack.arguments[0]?.title ?? null,
    })
  }

  // Suggestion working document (debate motions only).
  if (ctx.status === 'debate' && pack.suggestions?.length) {
    const docJson = buildWorkingDoc(
      ctx.bodyDemand,
      ctx.bodyTheme,
      pack.suggestions,
      ctx.userIdByEmail,
      SEED_DISPLAY_NAME_BY_EMAIL,
      ctx.now,
    )
    bundle.workingDocs.push({
      motionId: ctx.motionId,
      baseVersion: 1,
      docJson,
      revision: pack.suggestions.length,
      updatedAt: daysAgo(ctx.now, 0),
    })
  }

  return bundle
}

export const SEED_POST_BODIES = [
  '<p>Aus meiner Sicht brauchen wir mehr Bürgerbeteiligung, bevor wir verbindliche Regeln beschließen.</p>',
  '<p>Grundsätzlich überzeugt mich der Ansatz, aber die Datenschutzfragen müssen vorab geklärt werden.</p>',
  '<p>Starke Idee. Wie verhindern wir Missbrauch und sichern gleichzeitig schnelle Verfahren?</p>',
  '<p>Durch nachgelagerte Prüfungen, klare Haftung und transparente Dokumentation aller Schritte.</p>',
  '<p>Ich sehe noch Lücken bei der Finanzierung. Gibt es belastbare Zahlen für die ersten fünf Jahre?</p>',
  '<p>Die Umsetzung sollte modular erfolgen, damit Kommunen schrittweise starten können.</p>',
  '<p>Wichtig wäre mir eine klare Evaluierung nach zwei Jahren mit öffentlichem Bericht.</p>',
  '<p>Bitte den Bezug zu bestehenden EU-Vorgaben deutlicher herausarbeiten.</p>',
] as const
