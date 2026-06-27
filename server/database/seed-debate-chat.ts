import type * as schema from './schema'
import type { DeliberationLevel } from './seed-data'
import { SEED_USERS, daysAgo } from './seed-data'
import type { DeliberationSeedBundle } from './seed-deliberation'

const CHAT_AUTHOR_EMAILS = SEED_USERS.filter((u) => u.role === 'member').map((u) => u.email)

export type DeliberationIds = {
  arguments: { id: string; title: string; stance: 'pro' | 'con' }[]
  questions: { id: string; title: string }[]
  answers: { id: string; title: string }[]
  resources: { id: string; title: string }[]
}

export type DebateChatContext = {
  motionId: string
  motionTitle: string
  bodyTheme: string
  bodyDemand: string
  status: 'debate' | 'ballot' | 'decided'
  deliberationLevel: DeliberationLevel
  authorId: string
  userIdByEmail: Record<string, string>
  memberIds: string[]
  deliberation: DeliberationIds
  publishedAt: Date | null
  now: Date
  /** Optional cap from motion metadata. */
  postCount?: number
}

type RefPlan =
  | { kind: 'argument'; index: number }
  | { kind: 'question'; index: number }
  | { kind: 'answer'; index: number }
  | { kind: 'resource'; index: number }
  | { kind: 'post'; postIndex: number }
  | { kind: 'post_quote'; postIndex: number; excerptText: string }
  | { kind: 'motion_excerpt'; text: string }

type MessagePlan = {
  authorEmail: string
  bodyHtml: string
  daysAgo: number
  minutesOffset?: number
  replyToIndex?: number
  refs?: RefPlan[]
}

export type DebateChatBundle = {
  posts: (typeof schema.posts.$inferInsert)[]
  postIds: string[]
  references: (typeof schema.elementReferences.$inferInsert)[]
}

export function extractDeliberationIds(bundle: DeliberationSeedBundle): DeliberationIds {
  return {
    arguments: bundle.arguments.map((a) => ({
      id: a.id!,
      title: a.title,
      stance: a.stance,
    })),
    questions: bundle.questions.map((q) => ({ id: q.id!, title: q.title })),
    answers: bundle.answers.map((a) => ({
      id: a.id!,
      title: snippetFromHtml(a.bodyHtml, 60),
    })),
    resources: bundle.resources.map((r) => ({ id: r.id!, title: r.title })),
  }
}

export function resolveDebateChatPostCount(ctx: DebateChatContext): number {
  if (ctx.postCount != null) return Math.min(20, Math.max(0, ctx.postCount))
  if (ctx.deliberationLevel === 'none') return 0

  const baseByLevel: Record<Exclude<DeliberationLevel, 'none'>, number> = {
    minimal: 5,
    moderate: 11,
    rich: 16,
  }
  let count = baseByLevel[ctx.deliberationLevel as Exclude<DeliberationLevel, 'none'>] ?? 8

  if (ctx.status === 'ballot') count += 4
  if (ctx.status === 'decided') count += 6

  if (ctx.status === 'debate' && ctx.publishedAt) {
    const daysSince = Math.max(
      0,
      Math.floor((ctx.now.getTime() - ctx.publishedAt.getTime()) / 86_400_000),
    )
    count = Math.max(4, Math.min(count, 4 + daysSince * 2))
  }

  return Math.min(20, count)
}

function snippetFromHtml(html: string, max = 120): string {
  const text = html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (text.length <= max) return text
  return `${text.slice(0, max - 1).trimEnd()}…`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function pickAuthor(ctx: DebateChatContext, index: number): string {
  const pool = CHAT_AUTHOR_EMAILS.length > 0 ? CHAT_AUTHOR_EMAILS : ['demo@freiwerk.local']
  return pool[index % pool.length]!
}

function buildMessagePlans(ctx: DebateChatContext, count: number): MessagePlan[] {
  const { bodyTheme, bodyDemand, status, deliberation } = ctx
  const theme = escapeHtml(bodyTheme)
  const demand = escapeHtml(bodyDemand.slice(0, 120))
  const plans: MessagePlan[] = []

  const push = (plan: MessagePlan) => {
    plans.push(plan)
  }

  // —— Opening: broad reactions (formatted) ——
  push({
    authorEmail: pickAuthor(ctx, 0),
    bodyHtml: `<p>Grundsätzlich finde ich den Ansatz zu <strong>${theme}</strong> überzeugend — endlich jemand, der <em>konkret</em> wird.</p>`,
    daysAgo: count + 1,
    minutesOffset: 20,
  })

  push({
    authorEmail: pickAuthor(ctx, 1),
    bodyHtml:
      '<p><em>Kurze Frage vorab:</em> Haben wir belastbare Zahlen zur Umsetzung in den ersten zwei Jahren?</p>',
    daysAgo: count + 1,
    minutesOffset: 45,
    replyToIndex: 0,
  })

  push({
    authorEmail: pickAuthor(ctx, 2),
    bodyHtml: [
      '<p>Ein paar Punkte, die mir wichtig sind:</p>',
      '<ul>',
      '<li>Transparenz bei allen Schritten</li>',
      '<li>Realistische Fristen für Kommunen</li>',
      '<li>Begleitende Evaluierung</li>',
      '</ul>',
    ].join(''),
    daysAgo: count,
    minutesOffset: 10,
  })

  // —— Reference deliberation elements ——
  const proArg = deliberation.arguments.find((a) => a.stance === 'pro')
  const conArg = deliberation.arguments.find((a) => a.stance === 'con')
  if (proArg) {
    push({
      authorEmail: pickAuthor(ctx, 3),
      bodyHtml: `<p>Das Pro-Argument <strong>„${escapeHtml(proArg.title)}"</strong> trifft es — besonders der Punkt zur Praktikabilität.</p>`,
      daysAgo: count - 1,
      minutesOffset: 30,
      refs: [{ kind: 'argument', index: deliberation.arguments.indexOf(proArg) }],
    })
  }
  if (conArg) {
    push({
      authorEmail: pickAuthor(ctx, 4),
      bodyHtml: `<p>Beim Contra sehe ich noch Klärungsbedarf, verweise auf <strong>„${escapeHtml(conArg.title)}"</strong>.</p>`,
      daysAgo: count - 2,
      minutesOffset: 15,
      refs: [{ kind: 'argument', index: deliberation.arguments.indexOf(conArg) }],
    })
  }

  if (deliberation.questions[0]) {
    push({
      authorEmail: pickAuthor(ctx, 5),
      bodyHtml: `<p>Zur offenen Frage <strong>„${escapeHtml(deliberation.questions[0].title)}"</strong>: Gibt es schon eine Antwort der Antragsteller:innen?</p>`,
      daysAgo: count - 3,
      refs: [{ kind: 'question', index: 0 }],
    })
  }

  if (deliberation.answers[0]) {
    push({
      authorEmail: pickAuthor(ctx, 6),
      bodyHtml:
        '<p>Die akzeptierte Antwort hilft — danke dafür. Trotzdem bleibt die Umsetzungsfrage.</p>',
      daysAgo: count - 4,
      refs: [{ kind: 'answer', index: 0 }],
    })
  }

  if (deliberation.resources[0]) {
    push({
      authorEmail: pickAuthor(ctx, 7),
      bodyHtml: `<p>Hat jemand das Material <strong>„${escapeHtml(deliberation.resources[0].title)}"</strong> gelesen? Steht da was zur Finanzierung?</p>`,
      daysAgo: count - 5,
      refs: [{ kind: 'resource', index: 0 }],
    })
  }

  // —— Threaded sub-discussion ——
  const threadRoot = plans.length
  push({
    authorEmail: pickAuthor(ctx, 1),
    bodyHtml: `<blockquote><p>${demand}</p></blockquote><p>Genau das würde ich gern vertiefen.</p>`,
    daysAgo: count - 6,
    refs: [{ kind: 'motion_excerpt', text: bodyDemand.slice(0, 160) }],
  })

  push({
    authorEmail: pickAuthor(ctx, 2),
    bodyHtml:
      '<p>Stimme zu, aber nur wenn <strong>Datenschutz</strong> und <strong>Technikoffenheit</strong> parallel geklärt werden.</p>',
    daysAgo: count - 6,
    minutesOffset: 25,
    replyToIndex: threadRoot,
  })

  push({
    authorEmail: pickAuthor(ctx, 3),
    bodyHtml:
      '<p>@Thread: Lässt sich das modular ausrollen? Sonst überfordern wir kleine Gliederungen.</p>',
    daysAgo: count - 6,
    minutesOffset: 40,
    replyToIndex: threadRoot + 1,
  })

  // —— Telegram-style quote of an earlier message ——
  if (plans.length > 2) {
    const quoteSourceIndex = 1
    const excerpt = snippetFromHtml(plans[quoteSourceIndex]!.bodyHtml, 90)
    push({
      authorEmail: pickAuthor(ctx, 4),
      bodyHtml:
        '<p>Nur ergänzend zum markierten Satz:</p><ol><li>Erst Pilotregionen</li><li>Dann bundesweite Skalierung</li></ol>',
      daysAgo: count - 7,
      refs: [{ kind: 'post_quote', postIndex: quoteSourceIndex, excerptText: excerpt }],
    })
  }

  if (plans.length > 4) {
    push({
      authorEmail: pickAuthor(ctx, 5),
      bodyHtml: '<p>+1 — würde gern die Stellungnahme aus Beitrag oben noch einmal aufgreifen.</p>',
      daysAgo: count - 8,
      refs: [{ kind: 'post', postIndex: 2 }],
    })
  }

  // —— Mid-debate back-and-forth ——
  push({
    authorEmail: pickAuthor(ctx, 6),
    bodyHtml:
      '<p>Ich bin <em>noch unentschlossen</em>. Was spricht aus eurer Sicht <strong>dagegen</strong>, es jetzt zu beschließen?</p>',
    daysAgo: count - 9,
  })

  push({
    authorEmail: pickAuthor(ctx, 0),
    bodyHtml:
      '<p>Timing: Erst Evaluierung abwarten, sonst verbauen wir uns Anpassungen.</p>',
    daysAgo: count - 9,
    minutesOffset: 35,
    replyToIndex: plans.length - 1,
  })

  // —— Status-specific tail ——
  if (status === 'debate') {
    push({
      authorEmail: pickAuthor(ctx, 7),
      bodyHtml:
        '<p>Bitte bis zur Debattenfrist noch offene Punkte sammeln — ich würde gern <strong>zwei Änderungsvorschläge</strong> einbringen.</p>',
      daysAgo: 2,
    })
    push({
      authorEmail: 'mod@freiwerk.local',
      bodyHtml:
        '<p><em>Hinweis:</em> Bleibt sachlich und zitiert bei Kritik konkrete Passagen — danke!</p>',
      daysAgo: 1,
      minutesOffset: 10,
    })
  }

  if (status === 'ballot') {
    push({
      authorEmail: pickAuthor(ctx, 0),
      bodyHtml:
        '<p>Die Debattenfrist ist vorbei — <strong>Abstimmung läuft</strong>. Bitte alle vor dem Stichtag voten.</p>',
      daysAgo: 2,
    })
    push({
      authorEmail: pickAuthor(ctx, 3),
      bodyHtml:
        '<p>Ich habe zugestimmt, aber nur weil die Evaluierungsklausel drin ist. Wer noch unsicher ist: Antragstext nochmal lesen.</p>',
      daysAgo: 1,
      minutesOffset: 20,
    })
    push({
      authorEmail: pickAuthor(ctx, 5),
      bodyHtml: '<p>Frage zur Formalia: Gilt Enthaltung wie in der Stimmungslage oder anders gezählt?</p>',
      daysAgo: 1,
      minutesOffset: 50,
    })
  }

  if (status === 'decided') {
    push({
      authorEmail: pickAuthor(ctx, 1),
      bodyHtml:
        '<p>Schade, dass es so knapp war — aber gut, dass wir die Bedenken zur Finanzierung dokumentiert haben.</p>',
      daysAgo: 4,
    })
    push({
      authorEmail: pickAuthor(ctx, 4),
      bodyHtml:
        '<p><strong>Beschluss steht.</strong> Jetzt kommt es auf die Umsetzung in den Landesverbänden an.</p>',
      daysAgo: 2,
    })
    push({
      authorEmail: 'mod@freiwerk.local',
      bodyHtml:
        '<p>Debatte abgeschlossen — danke für die konstruktive Diskussion und die vielen Verweise auf Argumente und Materialien.</p>',
      daysAgo: 1,
    })
    push({
      authorEmail: pickAuthor(ctx, 6),
      bodyHtml:
        '<p>Für das Protokoll: Die Evaluierungsforderung war der Wendepunkt in der Diskussion. <em>Gut mitgeschrieben!</em></p>',
      daysAgo: 0,
      minutesOffset: 15,
    })
  }

  // Pad with neutral exchanges if the motion is very active
  let filler = 0
  while (plans.length < count && filler < 6) {
    push({
      authorEmail: pickAuthor(ctx, filler + 2),
      bodyHtml: `<p>Noch ein Gedanke zu ${theme}: Wir sollten die Landesverbände früh einbinden (${filler + 1}).</p>`,
      daysAgo: Math.max(0, count - 10 - filler),
      minutesOffset: filler * 12,
    })
    filler++
  }

  return plans.slice(0, count)
}

function resolveRef(
  ref: RefPlan,
  ctx: DebateChatContext,
  postIdsByIndex: string[],
): (typeof schema.elementReferences.$inferInsert) | null {
  const { deliberation, motionId } = ctx
  switch (ref.kind) {
    case 'argument': {
      const target = deliberation.arguments[ref.index]
      if (!target) return null
      return {
        motionId,
        sourceType: 'post',
        sourceId: '',
        targetType: 'argument',
        targetId: target.id,
      }
    }
    case 'question': {
      const target = deliberation.questions[ref.index]
      if (!target) return null
      return {
        motionId,
        sourceType: 'post',
        sourceId: '',
        targetType: 'question',
        targetId: target.id,
      }
    }
    case 'answer': {
      const target = deliberation.answers[ref.index]
      if (!target) return null
      return {
        motionId,
        sourceType: 'post',
        sourceId: '',
        targetType: 'answer',
        targetId: target.id,
      }
    }
    case 'resource': {
      const target = deliberation.resources[ref.index]
      if (!target) return null
      return {
        motionId,
        sourceType: 'post',
        sourceId: '',
        targetType: 'resource',
        targetId: target.id,
      }
    }
    case 'post': {
      const targetId = postIdsByIndex[ref.postIndex]
      if (!targetId) return null
      return {
        motionId,
        sourceType: 'post',
        sourceId: '',
        targetType: 'post',
        targetId,
      }
    }
    case 'post_quote': {
      const targetId = postIdsByIndex[ref.postIndex]
      if (!targetId) return null
      return {
        motionId,
        sourceType: 'post',
        sourceId: '',
        targetType: 'post',
        targetId,
        excerptText: ref.excerptText,
      }
    }
    case 'motion_excerpt':
      return {
        motionId,
        sourceType: 'post',
        sourceId: '',
        targetType: 'motion_excerpt',
        targetId: motionId,
        excerptText: ref.text,
        excerptVersion: 1,
      }
  }
}

/** Build realistic debate chat posts and inline references for one motion. */
export function buildDebateChatBundle(ctx: DebateChatContext): DebateChatBundle {
  const count = resolveDebateChatPostCount(ctx)
  if (count === 0) {
    return { posts: [], postIds: [], references: [] }
  }

  const plans = buildMessagePlans(ctx, count)
  const postIds = plans.map(() => crypto.randomUUID())
  const posts: (typeof schema.posts.$inferInsert)[] = []
  const references: (typeof schema.elementReferences.$inferInsert)[] = []

  plans.forEach((plan, index) => {
    const authorId =
      ctx.userIdByEmail[plan.authorEmail] ??
      ctx.memberIds[index % ctx.memberIds.length]!
    const parentId =
      plan.replyToIndex != null && plan.replyToIndex < index
        ? postIds[plan.replyToIndex]!
        : null

    const createdAt = daysAgo(ctx.now, plan.daysAgo)
    if (plan.minutesOffset) {
      createdAt.setMinutes(createdAt.getMinutes() + plan.minutesOffset)
    }

    const postId = postIds[index]!
    posts.push({
      id: postId,
      motionId: ctx.motionId,
      authorId,
      parentId,
      bodyHtml: plan.bodyHtml,
      createdAt,
    })

    for (const refPlan of plan.refs ?? []) {
      const resolved = resolveRef(refPlan, ctx, postIds)
      if (!resolved) continue
      resolved.sourceId = postId
      references.push(resolved)
    }
  })

  posts.sort((a, b) => a.createdAt!.getTime() - b.createdAt!.getTime())

  return { posts, postIds: posts.map((p) => p.id!), references }
}
