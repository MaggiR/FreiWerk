import type * as schema from './schema'
import { validateWorkingDoc } from '../utils/suggestions'
import { applySuggestionsToDoc, htmlToProseMirrorDoc } from '../utils/htmlToPm'
import { daysAgo, SEED_DISPLAY_NAME_BY_EMAIL, type DeliberationLevel } from './seed-data'

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
  deliberationLevel?: DeliberationLevel
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

const SUGGESTIONS_BY_TITLE: Record<string, SuggestionSeed[]> = {
  'Gründung in 24 Stunden': [
    {
      id: 1,
      authorEmail: 'anna.schneider@freiwerk.local',
      type: 'insertion',
      anchor: 'digitales ',
      text: 'bundesweit einheitliches ',
      daysAgo: 3,
    },
    {
      id: 2,
      authorEmail: 'demo@freiwerk.local',
      type: 'deletion',
      text: '24 Stunden',
      daysAgo: 2,
    },
  ],
  'Digitalpakt Schule verstetigen: dauerhafte Mittel für Netze, Geräte und Lehrkräfte-Fortbildung': [
    {
      id: 1,
      authorEmail: 'lisa.koch@freiwerk.local',
      type: 'insertion',
      anchor: 'verbindliche ',
      text: 'mindestens halbjährliche ',
      daysAgo: 2,
    },
    {
      id: 2,
      authorEmail: 'admin@freiwerk.local',
      type: 'deletion',
      text: 'verbindliche ',
      daysAgo: 1,
    },
  ],
  'Klimaneutrale Verwaltung 2030': [
    {
      id: 1,
      authorEmail: 'julia.hartmann@freiwerk.local',
      type: 'insertion',
      anchor: '2030 ',
      text: '(Scope 1–3) ',
      daysAgo: 2,
    },
    {
      id: 2,
      authorEmail: 'felix.weber@freiwerk.local',
      type: 'insertion',
      anchor: 'Green Procurement ',
      text: 'als verbindliche Vergabekriterien ',
      daysAgo: 1,
    },
  ],
  'Bürgergeld-Zuverdienst': [
    {
      id: 1,
      authorEmail: 'sarah.mueller@freiwerk.local',
      type: 'insertion',
      anchor: 'höhere ',
      text: 'deutlich ',
      daysAgo: 2,
    },
    {
      id: 2,
      authorEmail: 'demo@freiwerk.local',
      type: 'deletion',
      text: 'ohne Medienbrüche',
      daysAgo: 1,
    },
  ],
  'Europäische Digitale Identität': [
    {
      id: 1,
      authorEmail: 'anna.schneider@freiwerk.local',
      type: 'insertion',
      anchor: 'offener ',
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
  'Forschungszulage für KMU': [
    {
      id: 1,
      authorEmail: 'thomas.berger@freiwerk.local',
      type: 'insertion',
      anchor: 'automatisierte ',
      text: 'pauschale ',
      daysAgo: 2,
    },
    {
      id: 2,
      authorEmail: 'felix.weber@freiwerk.local',
      type: 'deletion',
      text: 'vereinfachte ',
      daysAgo: 1,
    },
  ],
  'Kommunale Bürgerforen': [
    {
      id: 1,
      authorEmail: 'anna.schneider@freiwerk.local',
      type: 'insertion',
      anchor: 'digitale ',
      text: 'verbindliche ',
      daysAgo: 2,
    },
    {
      id: 2,
      authorEmail: 'niklas.brandt@freiwerk.local',
      type: 'insertion',
      anchor: 'klare ',
      text: 'schriftlich fixierte ',
      daysAgo: 1,
    },
  ],
  'Freihandel mit Nachhaltigkeit': [
    {
      id: 1,
      authorEmail: 'lisa.koch@freiwerk.local',
      type: 'insertion',
      anchor: 'verbindlichen ',
      text: 'justiziablen ',
      daysAgo: 2,
    },
    {
      id: 2,
      authorEmail: 'demo@freiwerk.local',
      type: 'deletion',
      text: 'Freihandelsabkommen ',
      daysAgo: 1,
    },
  ],
  'Prävention ausbauen': [
    {
      id: 1,
      authorEmail: 'niklas.brandt@freiwerk.local',
      type: 'insertion',
      anchor: 'bundesweites ',
      text: 'zusätzliches ',
      daysAgo: 2,
    },
    {
      id: 2,
      authorEmail: 'sarah.mueller@freiwerk.local',
      type: 'insertion',
      anchor: 'patientenkontrollierte ',
      text: 'streng ',
      daysAgo: 1,
    },
  ],
}

const EU_DIGITAL_IDENTITY: MotionDeliberationPack = {
  suggestions: SUGGESTIONS_BY_TITLE['Europäische Digitale Identität'],
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
      authorEmail: 'niklas.brandt@freiwerk.local',
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
      authorEmail: 'niklas.brandt@freiwerk.local',
      title: 'Ein PDF',
      description: 'Eindeutig eine Datei',
      kind: 'file',
      url: '/uploads/seed-eu-id-background.pdf',
      status: 'proposed',
      daysAgo: 1,
    },
    {
      authorEmail: 'niklas.brandt@freiwerk.local',
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

function emptyPack(): MotionDeliberationPack {
  return { arguments: [], questions: [], resources: [], suggestions: [] }
}

function minimalPack(theme: string): MotionDeliberationPack {
  return {
    suggestions: [],
    arguments: [
      {
        authorEmail: 'demo@freiwerk.local',
        stance: 'pro',
        title: 'Grundsätzlich richtiger Ansatz',
        bodyHtml: `<p>Der Antrag adressiert ein echtes Problem im Bereich ${theme}.</p>`,
        status: 'proposed',
        daysAgo: 1,
      },
    ],
    questions: [],
    resources: [],
  }
}

function defaultPack(title: string, demand: string, theme: string): MotionDeliberationPack {
  const suggestions = SUGGESTIONS_BY_TITLE[title] ?? [
    {
      id: 1,
      authorEmail: 'demo@freiwerk.local',
      type: 'insertion' as const,
      anchor: 'Wir fordern ',
      text: 'schrittweise ',
      daysAgo: 2,
    },
    {
      id: 2,
      authorEmail: 'anna.schneider@freiwerk.local',
      type: 'deletion' as const,
      text: demand.includes('verbindliche') ? 'verbindliche ' : 'ein ',
      daysAgo: 1,
    },
  ]

  return {
    suggestions,
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
        authorEmail: 'niklas.brandt@freiwerk.local',
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
  'Europäische Digitale Identität': EU_DIGITAL_IDENTITY,
  'Windabstände reformieren': {
    suggestions: [
      {
        id: 1,
        authorEmail: 'julia.hartmann@freiwerk.local',
        type: 'insertion',
        anchor: 'kommunaler ',
        text: 'verbindlicher ',
        daysAgo: 3,
      },
      {
        id: 2,
        authorEmail: 'demo@freiwerk.local',
        type: 'deletion',
        text: 'schnelleren ',
        daysAgo: 2,
      },
    ],
    arguments: [
      {
        authorEmail: 'julia.hartmann@freiwerk.local',
        stance: 'pro',
        title: 'Klimaziele erfordern mehr Tempo',
        bodyHtml: '<p>Ohne Anpassung der Abstände verfehlen wir Ausbauziele deutlich.</p>',
        status: 'accepted',
        deliberationStatus: 'confirmed',
        daysAgo: 5,
      },
      {
        authorEmail: 'thomas.berger@freiwerk.local',
        stance: 'con',
        title: 'Lärmschutz für Anwohner',
        bodyHtml: '<p>Kürzere Abstände dürfen nicht zu Lasten der Betroffenen gehen.</p>',
        status: 'accepted',
        deliberationStatus: 'open',
        daysAgo: 4,
      },
      {
        authorEmail: 'demo@freiwerk.local',
        stance: 'pro',
        title: 'Kommunale Paketlösungen',
        bodyHtml: '<p>Flächenpakete erhöhen Akzeptanz vor Ort.</p>',
        status: 'proposed',
        daysAgo: 2,
      },
    ],
    questions: [
      {
        authorEmail: 'anna.schneider@freiwerk.local',
        title: 'Wie werden Ausgleichszahlungen geregelt?',
        bodyHtml: '<p>Gibt es ein Modell für Gemeinden mit vielen Anlagen?</p>',
        status: 'partially_answered',
        daysAgo: 3,
        answers: [
          {
            authorEmail: 'julia.hartmann@freiwerk.local',
            bodyHtml: '<p>Ein Fonds pro Landkreis wird im Antrag skizziert.</p>',
            daysAgo: 2,
          },
        ],
      },
    ],
    resources: [
      {
        authorEmail: 'felix.weber@freiwerk.local',
        title: 'Lärmgutachten Muster',
        kind: 'file',
        url: '/uploads/seed-feasibility-study.pdf',
        status: 'accepted',
        daysAgo: 4,
      },
    ],
  },
  'KRITIS-Schutz stärken': {
    suggestions: [
      {
        id: 1,
        authorEmail: 'admin@freiwerk.local',
        type: 'insertion',
        anchor: 'unabhängigen ',
        text: ' jährlichen ',
        daysAgo: 2,
      },
    ],
    arguments: [
      {
        authorEmail: 'admin@freiwerk.local',
        stance: 'pro',
        title: 'Kritische Infrastruktur ist Angriffsziel',
        bodyHtml: '<p>Verbindliche Standards schließen bekannte Lücken.</p>',
        status: 'accepted',
        deliberationStatus: 'confirmed',
        daysAgo: 6,
      },
      {
        authorEmail: 'felix.weber@freiwerk.local',
        stance: 'con',
        title: 'Kosten für Mittelstand',
        bodyHtml: '<p>Audits müssen förderfähig und staffelbar sein.</p>',
        status: 'accepted',
        daysAgo: 5,
      },
    ],
    questions: [
      {
        authorEmail: 'demo@freiwerk.local',
        title: 'Welche Betreiber sind betroffen?',
        bodyHtml: '<p>Gilt der Antrag auch für kommunale Versorger?</p>',
        status: 'answered',
        daysAgo: 4,
        answers: [
          {
            authorEmail: 'admin@freiwerk.local',
            bodyHtml: '<p>Ja, kommunale KRITIS-Betreiber sind ausdrücklich einbezogen.</p>',
            daysAgo: 3,
            accepted: true,
          },
        ],
      },
      {
        authorEmail: 'lisa.koch@freiwerk.local',
        title: 'Meldefrist 24 Stunden realistisch?',
        bodyHtml: '<p>Reicht das für komplexe Vorfälle?</p>',
        status: 'open',
        daysAgo: 1,
        answers: [],
      },
    ],
    resources: [
      {
        authorEmail: 'felix.weber@freiwerk.local',
        title: 'BSI-Grundschutz',
        kind: 'link',
        url: 'https://www.bsi.bund.de/',
        status: 'accepted',
        daysAgo: 5,
      },
    ],
  },
  'H2-Kernnetz': {
    suggestions: [],
    arguments: [
      {
        authorEmail: 'anna.schneider@freiwerk.local',
        stance: 'pro',
        title: 'Industriestandort sichern',
        bodyHtml: '<p>H2-Infrastruktur hält Wertschöpfung in der Region.</p>',
        status: 'accepted',
        deliberationStatus: 'confirmed',
        daysAgo: 40,
      },
      {
        authorEmail: 'thomas.berger@freiwerk.local',
        stance: 'con',
        title: 'Technologieoffenheit wahren',
        bodyHtml: '<p>Elektrifizierung darf nicht verdrängt werden.</p>',
        status: 'accepted',
        daysAgo: 35,
      },
    ],
    questions: [
      {
        authorEmail: 'niklas.brandt@freiwerk.local',
        title: 'Finanzierung geklärt?',
        bodyHtml: '<p>Wie hoch sind die erwarteten Netzkosten?</p>',
        status: 'answered',
        daysAgo: 30,
        answers: [
          {
            authorEmail: 'anna.schneider@freiwerk.local',
            bodyHtml: '<p>Erste Schätzungen liegen dem Wirtschaftsministerium vor.</p>',
            daysAgo: 28,
            accepted: true,
          },
        ],
      },
    ],
    resources: [
      {
        authorEmail: 'niklas.brandt@freiwerk.local',
        title: 'Infrastrukturkarte H2',
        kind: 'file',
        url: '/uploads/seed-lfa-digital-position.pdf',
        status: 'accepted',
        daysAgo: 38,
      },
    ],
  },
}

function resolvePack(
  title: string,
  demand: string,
  theme: string,
  level: DeliberationLevel,
): MotionDeliberationPack {
  if (level === 'none') return emptyPack()
  if (level === 'minimal') return minimalPack(theme)
  if (PACK_BY_TITLE[title]) return PACK_BY_TITLE[title]!
  if (level === 'rich') return defaultPack(title, demand, theme)
  return defaultPack(title, demand, theme)
}

export function pushUpvotes(
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
  const level =
    ctx.deliberationLevel ??
    (ctx.status === 'draft' ? 'none' : ctx.status === 'debate' ? 'moderate' : 'moderate')
  const pack = resolvePack(ctx.motionTitle, ctx.bodyDemand, ctx.bodyTheme, level)
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

  // Post upvotes are added when seeding debate chat threads.
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
