import type * as schema from './schema'
import { validateWorkingDoc } from '../utils/suggestions'
import { applySuggestionsToDoc, htmlToProseMirrorDoc } from '../utils/htmlToPm'
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
  bodyHtml: string
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
  /** For insertions: insert marked text immediately after this substring. */
  anchor?: string
  daysAgo: number
}

type MotionDeliberationPack = {
  arguments: ArgumentSeed[]
  questions: QuestionSeed[]
  resources: ResourceSeed[]
  suggestions?: SuggestionSeed[]
}

function buildWorkingDoc(
  bodyHtml: string,
  suggestions: SuggestionSeed[],
  userIdByEmail: Record<string, string>,
  displayNameByEmail: Record<string, string>,
  now: Date,
): PmNode {
  const baseDoc = htmlToProseMirrorDoc(bodyHtml)
  const suggestionInputs = suggestions.flatMap((item) => {
    const userId = userIdByEmail[item.authorEmail]
    if (!userId) return []
    return [
      {
        id: item.id,
        type: item.type,
        text: item.text,
        anchor: item.anchor,
        userId,
        userName: displayNameByEmail[item.authorEmail] ?? 'Mitglied',
        createdAt: daysAgo(now, item.daysAgo),
      },
    ]
  })

  const doc = applySuggestionsToDoc(baseDoc, suggestionInputs)
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
      anchor: 'auf Basis ',
      text: 'strikt datenschutzfreundlicher ',
      daysAgo: 3,
    },
    {
      id: 2,
      authorEmail: 'demo@freiwerk.local',
      type: 'deletion',
      text: 'freiwilliger ',
      daysAgo: 2,
    },
    {
      id: 3,
      authorEmail: 'lisa.koch@freiwerk.local',
      type: 'insertion',
      anchor: 'interoperable ',
      text: 'EU-weit ',
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

function defaultPack(demand: string, theme: string): MotionDeliberationPack {
  const anchor = demand.includes('Wir fordern ')
    ? 'Wir fordern '
    : demand.slice(0, Math.min(12, demand.length))
  const deletionTarget =
    demand.match(/\b(messbare|konkrete|verbindliche|einheitliche|nachhaltige)\b/i)?.[0] ??
    'eine '

  return {
    suggestions: [
      {
        id: 1,
        authorEmail: 'demo@freiwerk.local',
        type: 'insertion',
        anchor,
        text: 'schrittweise und evaluiert ',
        daysAgo: 2,
      },
      {
        id: 2,
        authorEmail: 'anna.schneider@freiwerk.local',
        type: 'deletion',
        text: deletionTarget,
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

function resolvePack(title: string, demand: string, theme: string): MotionDeliberationPack {
  return PACK_BY_TITLE[title] ?? defaultPack(demand, theme)
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
  const pack = resolvePack(ctx.motionTitle, ctx.bodyDemand, ctx.bodyTheme)
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
      ctx.bodyHtml,
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
