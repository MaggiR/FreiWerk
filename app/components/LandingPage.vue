<script setup lang="ts">
import type { JSONContent } from '@tiptap/core'
import { APP_LOGO_MARK_SRC } from '#shared/branding'
import type { ArgumentItem, ResourceItem, SuggestionItem } from '#shared/types'
import { ARGUMENT_STANCE_LABELS } from '#shared/constants'
import type { DebatePost } from '~/utils/debate'
import { scrollToDeliberationTarget } from '~/utils/deliberationNavigation'
import { scrollToChatQuote } from '~/utils/chatNavigation'
import type { ReferenceTargetType } from '~/utils/references'

const { open: openAuthModal } = useAuthModal()
const { heroVisible } = useLandingHeader()

function startDemo() {
  openAuthModal('login', '/')
}

// Tell the app header when the hero is on screen so it can hide/slide in.
const heroEl = ref<HTMLElement | null>(null)
let heroObserver: IntersectionObserver | null = null

onMounted(() => {
  if (!heroEl.value) return
  heroObserver = new IntersectionObserver(
    (entries) => {
      heroVisible.value = entries[0]?.isIntersecting ?? false
    },
    { threshold: 0 },
  )
  heroObserver.observe(heroEl.value)
})

onUnmounted(() => {
  heroObserver?.disconnect()
  heroObserver = null
  // Restore default so other pages get a normal header again.
  heroVisible.value = true
})

// Short example motion shown in the real detail-view layout (motion__* classes,
// MotionViewHeading, RichText body) so the showcase mirrors the actual product.
const exampleMotionBodyHtml = [
  '<h2>Forderung</h2>',
  '<p>Die Gründung eines Unternehmens muss <strong>vollständig digital</strong> und innerhalb von <strong>24 Stunden</strong> abgeschlossen sein. Wir fordern konkret:</p>',
  '<ul>',
  '<li>ein zentrales <strong>One-Stop-Portal</strong> für alle Gründungsschritte,</li>',
  '<li>die <em>automatische</em> Weiterleitung an Finanzamt, Handelsregister und Sozialversicherung,</li>',
  '<li>verbindliche Bearbeitungsfristen mit Eingangsbestätigung in Echtzeit.</li>',
  '</ul>',
  '<h2>Begründung</h2>',
  '<p>Lange Verfahren bremsen Innovation und Wettbewerb. Im EU-Vergleich dauert eine Gründung in Deutschland ein Vielfaches der Zeit führender Länder — wie die folgende Studie belegt:</p>'
    + '<a href="/uploads/studie-gruendungsdauer.pdf" class="attachment-chip attachment-chip__link" data-attachment data-label="Studie: Gründungsdauer im EU-Vergleich" data-mime="application/pdf" target="_blank" rel="noopener noreferrer nofollow"><span class="attachment-chip__icon" aria-hidden="true"></span><span class="attachment-chip__label">Studie: Gründungsdauer im EU-Vergleich</span></a>',
  '<blockquote>Jeder verlorene Tag bis zur Gründung ist ein verlorener Tag für Wertschöpfung und Beschäftigung.</blockquote>',
].join('')

// Sample pro/con arguments rendered with the real ArgumentListItem template.
const sampleArguments: ArgumentItem[] = [
  {
    id: 'demo-arg-pro',
    stance: 'pro',
    title: 'Schnelle Gründung stärkt den Standortwettbewerb',
    bodyHtml:
      '<p>Ein digitales One-Stop-Verfahren senkt Hürden für Gründerinnen und Gründer und hält Talente im Land.</p>',
    status: 'accepted',
    deliberationStatus: 'open',
    authorId: null,
    authorName: 'Dr. Lena Vogt',
    createdAt: '2026-06-15T10:00:00.000Z',
    upvoteCount: 14,
    upvotedByMe: false,
    isMine: false,
  },
  {
    id: 'demo-arg-con',
    stance: 'con',
    title: '24 Stunden setzen Behörden unter unrealistischen Druck',
    bodyHtml:
      '<p>Qualitätssicherung und Prüfungen brauchen Zeit — zu kurze Fristen führen zu Fehlentscheidungen und Nachbearbeitung.</p>',
    status: 'accepted',
    deliberationStatus: 'open',
    authorId: null,
    authorName: 'Jonas Krause',
    createdAt: '2026-06-16T14:30:00.000Z',
    upvoteCount: 6,
    upvotedByMe: false,
    isMine: false,
  },
]

const proArgument = sampleArguments.find((a) => a.stance === 'pro')!
const conArgument = sampleArguments.find((a) => a.stance === 'con')!

const argumentColumns = computed(() => [
  {
    key: 'pro' as const,
    label: ARGUMENT_STANCE_LABELS.pro,
    icon: 'circle-plus',
    item: proArgument,
  },
  {
    key: 'con' as const,
    label: ARGUMENT_STANCE_LABELS.con,
    icon: 'circle-minus',
    item: conArgument,
  },
])

// Two-week mood trend for the landing showcase (daily snapshots).
const moodTrend = [
  { t: '2026-06-15T12:00:00.000Z', approve: 18, reject: 15, abstain: 7 },
  { t: '2026-06-16T12:00:00.000Z', approve: 26, reject: 20, abstain: 9 },
  { t: '2026-06-17T12:00:00.000Z', approve: 34, reject: 24, abstain: 14 },
  { t: '2026-06-18T12:00:00.000Z', approve: 42, reject: 28, abstain: 18 },
  { t: '2026-06-19T12:00:00.000Z', approve: 48, reject: 30, abstain: 22 },
  { t: '2026-06-20T12:00:00.000Z', approve: 52, reject: 32, abstain: 25 },
  { t: '2026-06-21T12:00:00.000Z', approve: 56, reject: 33, abstain: 28 },
  { t: '2026-06-22T12:00:00.000Z', approve: 62, reject: 34, abstain: 30 },
  { t: '2026-06-23T12:00:00.000Z', approve: 68, reject: 36, abstain: 32 },
  { t: '2026-06-24T12:00:00.000Z', approve: 78, reject: 38, abstain: 35 },
  { t: '2026-06-25T12:00:00.000Z', approve: 88, reject: 42, abstain: 38 },
  { t: '2026-06-26T12:00:00.000Z', approve: 102, reject: 48, abstain: 39 },
  { t: '2026-06-27T12:00:00.000Z', approve: 118, reject: 54, abstain: 26 },
  { t: '2026-06-28T12:00:00.000Z', approve: 142, reject: 58, abstain: 23 },
]

// Sample debate thread, rendered with the real DebateMessage template. Fixed
// timestamps keep server/client output identical (the bubbles are client-only).
// One message carries a deliberation reference (argument), another a reply
// reference (parent preview) — both straight from the real chat UI.
type DemoChatItem = {
  post: DebatePost
  parentPreview: { postId: string; authorName: string | null; excerpt: string } | null
  isOwn: boolean
}

function demoPost(overrides: Partial<DebatePost> & Pick<DebatePost, 'id' | 'bodyHtml'>): DebatePost {
  return {
    parentId: null,
    createdAt: '2026-06-28T12:14:00.000Z',
    updatedAt: null,
    deleted: false,
    authorId: null,
    authorName: null,
    authorFn: null,
    authorRole: 'member',
    authorAvatarUrl: null,
    upvoteCount: 0,
    upvotedByMe: false,
    savedByMe: false,
    references: [],
    referencedByCount: 0,
    ...overrides,
  }
}

const debateItems: DemoChatItem[] = [
  {
    isOwn: false,
    parentPreview: null,
    post: demoPost({
      id: 'demo-post-1',
      createdAt: '2026-06-28T12:14:00.000Z',
      bodyHtml:
        '<p>Der Vorschlag überzeugt mich — besonders das zentrale One-Stop-Portal. Wie stellen wir sicher, dass alle Behörden innerhalb von 24 Stunden antworten?</p>',
      authorName: 'Dr. Lena Vogt',
      authorFn: 'Mitglied LFA Finanzen',
      upvoteCount: 12,
    }),
  },
  {
    isOwn: true,
    parentPreview: null,
    post: demoPost({
      id: 'demo-post-2',
      createdAt: '2026-06-28T12:31:00.000Z',
      bodyHtml:
        '<p>Dem Pro-Argument schließe ich mich an: Ein digitales One-Stop-Verfahren senkt die Hürden spürbar und hält Gründerinnen und Gründer im Land.</p>',
      authorName: 'Du',
      upvoteCount: 4,
      upvotedByMe: true,
      references: [
        {
          id: 'demo-ref-arg',
          targetType: 'argument',
          targetId: proArgument.id,
          label: proArgument.title,
          available: true,
        },
      ],
    }),
  },
  {
    isOwn: false,
    parentPreview: {
      postId: 'demo-post-1',
      authorName: 'Dr. Lena Vogt',
      excerpt: 'Wie stellen wir sicher, dass alle Behörden innerhalb von 24 Stunden antworten?',
    },
    post: demoPost({
      id: 'demo-post-3',
      createdAt: '2026-06-28T12:47:00.000Z',
      bodyHtml:
        '<p>Gute Frage — verbindliche Fristen und digitale Schnittstellen zwischen den Ämtern wären dafür der Schlüssel.</p>',
      authorName: 'Jonas Krause',
      authorFn: 'Mitglied BFA Digitales',
      upvoteCount: 7,
    }),
  },
]

const demoChatRef = ref<HTMLElement | null>(null)

function onDemoJumpDeliberation(targetType: ReferenceTargetType, targetId: string) {
  scrollToDeliberationTarget(targetType, targetId)
}

function onDemoJumpPost(postId: string, excerpt?: string) {
  const container = demoChatRef.value
  if (!container) return
  scrollToChatQuote(container, postId, excerpt)
}

// Interactive change suggestions — the real MotionEditor in author "review" mode.
// The working document carries insertion/deletion/modification marks; hovering a
// mark opens the same accept/reject popover the author sees in the live software.
const suggestionDocJson: JSONContent = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Wir fordern ein ' },
        {
          type: 'text',
          text: 'digitales ',
          marks: [{ type: 'insertion', attrs: { id: 1, userName: 'Dr. Lena Vogt' } }],
        },
        {
          type: 'text',
          text: 'One-Stop-Verfahren für Unternehmensgründungen, das ',
        },
        {
          type: 'text',
          text: 'in der Regel ',
          marks: [{ type: 'deletion', attrs: { id: 2, userName: 'Jonas Krause' } }],
        },
        { type: 'text', text: 'innerhalb von ' },
        {
          type: 'text',
          text: 'drei Werktagen',
          marks: [{ type: 'deletion', attrs: { id: 3, userName: 'Jonas Krause' } }],
        },
        {
          type: 'text',
          text: '24 Stunden',
          marks: [{ type: 'insertion', attrs: { id: 5, userName: 'Jonas Krause' } }],
        },
        { type: 'text', text: ' abgeschlossen ist.' },
      ],
    },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Die zuständigen Behörden stellen dafür ' },
        {
          type: 'text',
          text: 'verbindliche digitale Schnittstellen und ',
          marks: [{ type: 'insertion', attrs: { id: 4, userName: 'Marc Schmidt' } }],
        },
        { type: 'text', text: 'klare Fristen bereit.' },
      ],
    },
  ],
}

const suggestionReviewItems: SuggestionItem[] = [
  {
    id: 1,
    type: 'insertion',
    authorId: null,
    authorName: 'Dr. Lena Vogt',
    createdAt: '2026-06-26T10:12:00.000Z',
    rationale: 'Klarstellen, dass das Verfahren rein digital läuft.',
    snippet: 'digitales',
  },
  {
    id: 2,
    type: 'deletion',
    authorId: null,
    authorName: 'Jonas Krause',
    createdAt: '2026-06-26T11:30:00.000Z',
    rationale: 'Schwammige Einschränkung streichen.',
    snippet: 'in der Regel',
  },
  {
    id: 3,
    type: 'deletion',
    authorId: null,
    authorName: 'Jonas Krause',
    createdAt: '2026-06-26T11:32:00.000Z',
    rationale: 'Unklare Frist streichen.',
    snippet: 'drei Werktagen',
  },
  {
    id: 5,
    type: 'insertion',
    authorId: null,
    authorName: 'Jonas Krause',
    createdAt: '2026-06-26T11:33:00.000Z',
    rationale: 'Ambitionierteres, klares Ziel setzen.',
    snippet: '24 Stunden',
  },
  {
    id: 4,
    type: 'insertion',
    authorId: null,
    authorName: 'Marc Schmidt',
    createdAt: '2026-06-27T08:05:00.000Z',
    rationale: 'Interoperabilität explizit aufnehmen.',
    snippet: 'verbindliche digitale Schnittstellen und',
  },
]

interface SuggestionEditorApi {
  acceptSuggestion: (id: number) => void
  rejectSuggestion: (id: number) => void
}
const suggestionEditor = ref<SuggestionEditorApi | null>(null)
const reviewPending = ref<SuggestionItem[]>([...suggestionReviewItems])

function acceptSuggestion(id: number) {
  suggestionEditor.value?.acceptSuggestion(id)
  reviewPending.value = reviewPending.value.filter((s) => s.id !== id)
}
function rejectSuggestion(id: number) {
  suggestionEditor.value?.rejectSuggestion(id)
  reviewPending.value = reviewPending.value.filter((s) => s.id !== id)
}

// Two example resources rendered through the real ResourceListItem template.
const sampleResources: ResourceItem[] = [
  {
    id: 'demo-res-1',
    title: 'Referentenentwurf zum Gründungsverfahren.pdf',
    description: 'Aktueller Gesetzentwurf inklusive Begründung als PDF.',
    kind: 'file',
    url: '#',
    status: 'accepted',
    authorId: null,
    authorName: 'Marc Schmidt',
    createdAt: '2026-06-20T09:00:00.000Z',
    upvoteCount: 9,
    upvotedByMe: false,
    isMine: false,
  },
  {
    id: 'demo-res-2',
    title: 'Studie: Gründungsdauer im EU-Vergleich',
    description: 'Externe Analyse zu Verfahrensdauern in zwölf Mitgliedstaaten.',
    kind: 'link',
    url: 'https://example.org/studie-gruendungsdauer',
    status: 'accepted',
    authorId: null,
    authorName: 'Dr. Lena Vogt',
    createdAt: '2026-06-24T15:30:00.000Z',
    upvoteCount: 5,
    upvotedByMe: false,
    isMine: false,
  },
]

const features = [
  {
    icon: 'wand-magic-sparkles',
    title: 'KI-Assistenz',
    text: 'Erklärt Fachjargon, durchsucht Ressourcen, bietet Kompromissvorschläge an u.v.m.',
  },
  {
    icon: 'lock',
    title: 'Geheime Abstimmung',
    text: 'Entscheide verbindlich per geheimer Abstimmung mit strikter Trennung von Stimme und Profil.',
  },
  {
    icon: 'circle-check',
    title: 'Transparente Beschlüsse',
    text: 'Jede Entscheidung wird einfach auffindbar gespeichert und ist als Datei exportierbar.',
  },
  {
    icon: 'magnifying-glass',
    title: 'Durchsuchbar',
    text: 'Anträge, Beiträge und Ressourcen per Volltextsuche oder KI schnell auffinden.',
  },
  {
    icon: 'circle-question',
    title: 'Dedizierter Q&A-Bereich',
    text: 'Häufige Fragen auffangen, Antworten sammeln und den Klärungsstand strukturiert nachverfolgen.',
  },
  {
    icon: 'bolt',
    title: 'Benutzerfreundlich',
    text: 'Mit besonderem Augenmerk auf eine gute User Experience und selbsterklärende Bedienung entwickelt.',
  },
] as const

const steps = [
  { icon: 'pen-to-square', label: 'Entwurf', text: 'Antrag ausarbeiten, Ressourcen beifügen' },
  { icon: 'comments', label: 'Beratung', text: 'Strukturiert debattieren, Antrag verfeinern, Live-Stimmungsbild' },
  { icon: 'check-to-slot', label: 'Abstimmung', text: 'Geheim entscheiden, finaler Antrag' },
  { icon: 'circle-check', label: 'Beschluss', text: 'Durchsuchbar archiviert' },
] as const
</script>

<template>
  <div class="landing">
    <!-- Hero -->
    <section ref="heroEl" class="lp-hero">
      <div class="lp-hero__bg" aria-hidden="true" />
      <div v-reveal class="lp-brand">
        <img :src="APP_LOGO_MARK_SRC" alt="" class="lp-brand__logo" width="80" height="80">
        <span class="lp-brand__name">FreiWerk</span>
      </div>
      <h1 v-reveal="80" class="lp-hero__title">Der Marktplatz liberaler Ideen</h1>
      <p v-reveal="160" class="lp-hero__lead">
        Die Plattform für politische Anträge und effektive Entscheidungsfindung, assistiert von KI.
      </p>
      <div v-reveal="240" class="lp-hero__actions">
        <FwButton variant="primary" class="lp-hero__cta" @click="startDemo">
          <FontAwesomeIcon icon="rocket" />
          Demo starten
        </FwButton>
      </div>
      <div class="lp-hero__scroll" aria-hidden="true">
        <FontAwesomeIcon icon="chevron-down" />
      </div>
    </section>

    <!-- Interactive showcase -->
    <section class="lp-showcase">
      <div v-reveal class="lp-section-head">
        <h2>Features für eine moderne Entscheidungsfindung</h2>
      </div>

      <!-- Showcase 1: motion detail view of a short example motion -->
      <div v-reveal class="lp-show-row">
        <div class="lp-show-row__text">
          <span class="lp-show-row__icon"><FontAwesomeIcon icon="pen" /></span>
          <h3>Anträge verfassen</h3>
          <p>
            Mit Formatierungen und Referenzen auf zugrunde liegende Ressourcen.
          </p>
        </div>
        <div class="lp-shot">
          <div class="lp-shot__bar" aria-hidden="true">
            <span class="lp-shot__dot" /><span class="lp-shot__dot" /><span class="lp-shot__dot" />
            <span class="lp-shot__title">Antrag</span>
          </div>
          <div class="lp-shot__body lp-shot__body--motion">
            <article class="motion lp-motion">
              <div class="motion__head">
                <h1 class="motion__title">Gründung in 24 Stunden</h1>
                <p class="motion__summary">
                  Digitales One-Stop-Verfahren für Unternehmensgründungen mit klaren
                  Fristen und weniger Nachweispflichten.
                </p>
                <div class="motion__meta">
                  <span class="motion__meta-primary">
                    <span class="motion__meta-item lp-motion__author">
                      <UserAvatar
                        avatar-url="/imgs/profile_m_1.png"
                        name="Marc Schmidt"
                        size="sm"
                      />
                      Marc Schmidt
                    </span>
                    <span class="motion__meta-item">
                      <FontAwesomeIcon icon="clock" aria-hidden="true" />
                      Eingebracht <RelativeTime value="2026-06-11T09:00:00.000Z" />
                    </span>
                  </span>
                </div>
              </div>

              <FwCard class="motion__box" pad>
                <div class="motion__body-area">
                  <div class="motion__body-content">
                    <RichText :html="exampleMotionBodyHtml" />
                  </div>
                </div>
                <div class="motion__body-version-bar">
                  <MotionBodyVersion :version="1" updated-at="2026-06-25T09:00:00.000Z" />
                </div>
              </FwCard>
            </article>
          </div>
        </div>
      </div>

      <!-- Showcase 2: mood trend chart -->
      <div v-reveal class="lp-show-row lp-show-row--reverse">
        <div class="lp-show-row__text">
          <span class="lp-show-row__icon"><FontAwesomeIcon icon="chart-area" /></span>
          <h3>Stimmungsbild in Echtzeit</h3>
          <p>
            Laufende, unverbindliche Meinungsabfrage zur besseren Abschätzung der aktuellen Antragsunterstützung.
          </p>
        </div>
        <div class="lp-shot">
          <div class="lp-shot__bar" aria-hidden="true">
            <span class="lp-shot__dot" /><span class="lp-shot__dot" /><span class="lp-shot__dot" />
            <span class="lp-shot__title">Zeitlicher Verlauf</span>
          </div>
          <div class="lp-shot__body lp-shot__body--chart">
            <ClientOnly>
              <MoodTrendChart :trend="moodTrend" />
              <template #fallback>
                <div class="lp-shot__skeleton">Lädt …</div>
              </template>
            </ClientOnly>
          </div>
        </div>
      </div>

      <!-- Showcase 3: pro/con arguments -->
      <div v-reveal class="lp-show-row">
        <div class="lp-show-row__text">
          <span class="lp-show-row__icon"><FontAwesomeIcon icon="scale-balanced" /></span>
          <h3>Argumente sammeln</h3>
          <p>
            Pro- und Contra-Argumente strukturiert gegenüberstellen, bewerten
            und in der Beratung gezielt referenzieren.
          </p>
        </div>
        <div class="lp-shot">
          <div class="lp-shot__bar" aria-hidden="true">
            <span class="lp-shot__dot" /><span class="lp-shot__dot" /><span class="lp-shot__dot" />
            <span class="lp-shot__title">Argumente</span>
          </div>
          <div class="lp-shot__body lp-shot__body--args">
            <ClientOnly>
              <div class="lp-args" lang="de">
                <div class="lp-args__columns">
                  <section
                    v-for="col in argumentColumns"
                    :key="col.key"
                    class="lp-args__col"
                    :class="`lp-args__col--${col.key}`"
                  >
                    <header class="lp-args__col-head">
                      <h3 class="lp-args__col-title">
                        <FontAwesomeIcon :icon="col.icon" /> {{ col.label }}
                        <span class="lp-args__col-count">1</span>
                      </h3>
                    </header>
                    <ArgumentListItem :argument="col.item" />
                  </section>
                </div>
              </div>
              <template #fallback>
                <div class="lp-shot__skeleton">Lädt …</div>
              </template>
            </ClientOnly>
          </div>
        </div>
      </div>

      <!-- Showcase 4: debate chat -->
      <div v-reveal class="lp-show-row lp-show-row--reverse">
        <div class="lp-show-row__text">
          <span class="lp-show-row__icon"><FontAwesomeIcon icon="comments" /></span>
          <h3>Debattiere im Chat</h3>
          <p>
            Mit Antworten- und Zitierfunktion, interaktive Referenzen und filterbaren
            Gesprächsverläufen. Lasse dir längere Debatten mit KI zusammenfassen.
          </p>
        </div>
        <div class="lp-shot">
          <div class="lp-shot__bar" aria-hidden="true">
            <span class="lp-shot__dot" /><span class="lp-shot__dot" /><span class="lp-shot__dot" />
            <span class="lp-shot__title">Beratung</span>
          </div>
          <div ref="demoChatRef" class="lp-shot__body lp-shot__body--chat">
            <ClientOnly>
              <DebateMessage
                v-for="item in debateItems"
                :key="item.post.id"
                :post="item.post"
                :parent-preview="item.parentPreview"
                :debate-open="true"
                :is-own="item.isOwn"
                :show-references="true"
                @jump="onDemoJumpPost"
                @jump-deliberation="onDemoJumpDeliberation"
              />
              <template #fallback>
                <div class="lp-shot__skeleton">Lädt …</div>
              </template>
            </ClientOnly>
          </div>
        </div>
      </div>

      <!-- Showcase 5: motion excerpt with change suggestions -->
      <div v-reveal class="lp-show-row">
        <div class="lp-show-row__text">
          <span class="lp-show-row__icon"><FontAwesomeIcon icon="pen-to-square" /></span>
          <h3>Änderungen vorschlagen</h3>
          <p>
            Wie in einem geteilten Dokument: Einfügungen und Streichungen werden
            als Vorschläge markiert, die der Antragsteller annehmen kann.
          </p>
        </div>
        <div class="lp-shot">
          <div class="lp-shot__bar" aria-hidden="true">
            <span class="lp-shot__dot" /><span class="lp-shot__dot" /><span class="lp-shot__dot" />
            <span class="lp-shot__title">Antragstext</span>
          </div>
          <div class="lp-shot__body lp-shot__body--doc">
            <ClientOnly>
              <MotionEditor
                ref="suggestionEditor"
                embedded
                :doc-json="suggestionDocJson"
                :review-items="reviewPending"
                :suggestion="{ mode: 'review', userId: '', userName: 'Du' }"
                @review-accept="acceptSuggestion"
                @review-reject="rejectSuggestion"
              />
              <template #fallback>
                <div class="lp-shot__skeleton">Lädt …</div>
              </template>
            </ClientOnly>
            <p class="lp-doc-hint">
              <FontAwesomeIcon icon="comment-dots" aria-hidden="true" />
              Fahre mit der Maus über eine Änderung, um sie als Antragsteller
              anzunehmen oder abzulehnen.
            </p>
          </div>
        </div>
      </div>

      <!-- Showcase 6: resources -->
      <div v-reveal class="lp-show-row lp-show-row--reverse">
        <div class="lp-show-row__text">
          <span class="lp-show-row__icon"><FontAwesomeIcon icon="paperclip" /></span>
          <h3>Belege beifügen</h3>
          <p>
            Dokumente und Links sammeln, hochstimmen und gemeinsam die beste
            Faktenbasis für die Entscheidung schaffen.
          </p>
        </div>
        <div class="lp-shot">
          <div class="lp-shot__bar" aria-hidden="true">
            <span class="lp-shot__dot" /><span class="lp-shot__dot" /><span class="lp-shot__dot" />
            <span class="lp-shot__title">Ressourcen</span>
          </div>
          <div class="lp-shot__body lp-shot__body--res">
            <ClientOnly>
              <ul class="lp-res-list">
                <ResourceListItem
                  v-for="res in sampleResources"
                  :key="res.id"
                  :resource="res"
                />
              </ul>
              <template #fallback>
                <div class="lp-shot__skeleton">Lädt …</div>
              </template>
            </ClientOnly>
          </div>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section class="lp-features">
      <div v-reveal class="lp-section-head">
        <h2>Und mehr! Alles für gute Entscheidungen</h2>
      </div>
      <div class="lp-features__grid">
        <FwCard
          v-for="(f, i) in features"
          :key="f.title"
          v-reveal="i * 80"
          class="lp-feature"
          pad
        >
          <span class="lp-feature__icon"><FontAwesomeIcon :icon="f.icon" /></span>
          <h3 class="lp-feature__title">{{ f.title }}</h3>
          <p class="lp-feature__text">{{ f.text }}</p>
        </FwCard>
      </div>
    </section>

    <!-- Steps -->
    <section class="lp-steps">
      <div v-reveal class="lp-section-head">
        <h2>Von der Idee zum Beschluss</h2>
        <p>Jeder Antrag durchläuft einen klaren, nachvollziehbaren Weg aus 4 Schritten:</p>
      </div>
      <ol class="lp-steps__list">
        <li
          v-for="(step, i) in steps"
          :key="step.label"
          v-reveal="i * 100"
          class="lp-step"
        >
          <span class="lp-step__icon"><FontAwesomeIcon :icon="step.icon" /></span>
          <span class="lp-step__num">Schritt {{ i + 1 }}</span>
          <span class="lp-step__label">{{ step.label }}</span>
          <span class="lp-step__text">{{ step.text }}</span>
          <FontAwesomeIcon
            v-if="i < steps.length - 1"
            class="lp-step__arrow"
            icon="arrow-right"
            aria-hidden="true"
          />
        </li>
      </ol>
    </section>

    <!-- Final CTA -->
    <section v-reveal class="lp-cta">
      <div class="lp-cta__inner">
        <h2 class="lp-cta__title">Bereit, FreiWerk auszuprobieren?</h2>
        <p class="lp-cta__text">
          Starte die Demo in Sekunden — kein Passwort, keine Installation.
        </p>
        <FwButton variant="primary" class="lp-cta__btn" @click="startDemo">
          <FontAwesomeIcon icon="rocket" />
          Demo starten
        </FwButton>
      </div>
    </section>
  </div>
</template>

<style scoped>
.landing {
  display: flex;
  flex-direction: column;
  gap: var(--space-8);
  /* Pull up under the (hidden) header so the hero sits near the top. */
  margin-top: calc(-1 * var(--header-total-height));
}

/* ---------- Scroll reveal (driven by the v-reveal directive) ---------- */
:deep(.reveal--armed) {
  opacity: 0;
  transform: translateY(28px);
}
:deep(.reveal--in) {
  opacity: 1;
  transform: none;
  transition: opacity 0.6s ease, transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}
@media (prefers-reduced-motion: reduce) {
  :deep(.reveal--armed) {
    opacity: 1;
    transform: none;
  }
}

/* ---------- Hero ---------- */
.lp-hero {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-4);
  min-height: min(86vh, 760px);
  justify-content: center;
  padding: calc(var(--header-total-height) + var(--space-6)) var(--space-5) var(--space-8);
  border-radius: var(--radius-lg);
  background: var(--gradient-hero);
  border: 1px solid var(--color-border);
}
.lp-hero__bg {
  position: absolute;
  inset: -40% -10% auto -10%;
  height: 80%;
  background:
    radial-gradient(closest-side, rgba(255, 224, 0, 0.25), transparent),
    radial-gradient(closest-side, rgba(0, 167, 231, 0.22), transparent);
  background-position: 20% 0, 85% 10%;
  background-repeat: no-repeat;
  background-size: 55% 100%, 50% 100%;
  filter: blur(10px);
  pointer-events: none;
}
.lp-brand {
  display: inline-flex;
  align-items: center;
  gap: var(--space-3);
}
.lp-brand__logo {
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
}
.lp-brand__name {
  font-size: clamp(2.4rem, 8vw, 4rem);
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1;
}
.lp-hero__title {
  font-size: clamp(1.6rem, 4.5vw, 2.6rem);
  font-weight: 600;
  margin: var(--space-2) 0 0;
  color: var(--color-text);
  max-width: 22ch;
}
.lp-hero__lead {
  font-size: clamp(1.05rem, 2.4vw, 1.3rem);
  color: var(--color-text-muted);
  margin: 0;
  max-width: 44ch;
}
.lp-hero__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-3);
  margin-top: var(--space-3);
}
.lp-hero__cta {
  font-size: 1.15rem;
  padding: var(--space-4) var(--space-6);
  box-shadow: var(--shadow-md);
}
.lp-hero__scroll {
  position: absolute;
  bottom: var(--space-5);
  left: 50%;
  transform: translateX(-50%);
  font-size: 1.4rem;
  color: var(--color-text-muted);
  animation: lp-bob 1.8s ease-in-out infinite;
}
@keyframes lp-bob {
  0%, 100% { transform: translate(-50%, 0); }
  50% { transform: translate(-50%, 8px); }
}
@media (prefers-reduced-motion: reduce) {
  .lp-hero__scroll { animation: none; }
}

/* ---------- Section heads ---------- */
.lp-section-head {
  text-align: center;
  margin-bottom: var(--space-6);
}
.lp-section-head h2 {
  font-size: clamp(1.7rem, 3.5vw, 2.4rem);
  margin: 0 0 var(--space-2);
}
.lp-section-head p {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 1.1rem;
}

/* ---------- Interactive showcase ---------- */
.lp-showcase {
  display: flex;
  flex-direction: column;
  gap: var(--space-7);
}
.lp-show-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-5);
  align-items: center;
}
.lp-show-row__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  margin-bottom: var(--space-3);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--brand-yellow) 32%, transparent);
  color: var(--brand-blue);
  font-size: 1.9rem;
}
.dark .lp-show-row__icon {
  color: var(--brand-yellow);
}
.lp-show-row__text h3 {
  font-size: clamp(1.3rem, 3vw, 1.7rem);
  margin: 0 0 var(--space-2);
}
.lp-show-row__text p {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 1.05rem;
  line-height: 1.6;
  max-width: 42ch;
}

/* Screenshot-style frame */
.lp-shot {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  background: var(--color-bg-elevated);
  box-shadow: var(--shadow-md);
}
.lp-shot__bar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
}
.lp-shot__dot {
  width: 0.7rem;
  height: 0.7rem;
  border-radius: var(--radius-pill);
  background: var(--color-border);
}
.lp-shot__dot:nth-child(1) { background: #ff5f57; }
.lp-shot__dot:nth-child(2) { background: #febc2e; }
.lp-shot__dot:nth-child(3) { background: #28c840; }
.lp-shot__title {
  margin-left: var(--space-2);
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-muted);
}
.lp-shot__body {
  padding: var(--space-4);
  background: var(--color-bg);
}
/* Showcase 1: motion detail view */
.lp-shot__body--motion {
  padding: var(--space-5) var(--space-4) var(--space-4);
}
.lp-motion {
  max-width: none;
  margin: 0;
}
.lp-motion :deep(.motion__head) {
  margin-bottom: var(--space-6);
}
.lp-motion :deep(.motion__title) {
  font-size: 1.6rem;
  line-height: 1.3;
  margin-bottom: var(--space-3);
}
.lp-motion :deep(.motion__summary) {
  font-size: 1.02rem;
  line-height: 1.55;
  margin-bottom: var(--space-4);
}
.lp-motion :deep(.motion__meta) {
  margin-bottom: 0;
}
.lp-motion :deep(.motion__meta-primary) {
  gap: var(--space-4);
}
.lp-motion__author {
  font-weight: 600;
}

/* Showcase 3: arguments (real ArgumentListItem template) */
.lp-shot__body--args {
  container-type: inline-size;
  container-name: args;
}
.lp-args__columns {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-4);
  min-width: 0;
}
@container args (min-width: 560px) {
  .lp-args__columns {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
}
.lp-args__col {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-top: 3px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg);
}
.lp-args__col--pro {
  border-top-color: var(--color-success);
  background: color-mix(in srgb, var(--color-success) 4%, var(--color-bg));
}
.lp-args__col--con {
  border-top-color: var(--color-danger);
  background: color-mix(in srgb, var(--color-danger) 4%, var(--color-bg));
}
.lp-args__col-head {
  display: flex;
  align-items: center;
  min-width: 0;
}
.lp-args__col-title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: 0;
  min-width: 0;
  font-size: 1.05rem;
  overflow-wrap: anywhere;
}
.lp-args__col--pro .lp-args__col-title {
  color: var(--color-success);
}
.lp-args__col--con .lp-args__col-title {
  color: var(--color-danger);
}
.lp-args__col-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.4rem;
  padding: 0.05rem var(--space-2);
  border-radius: var(--radius-pill);
  font-size: 0.78rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.lp-args__col--pro .lp-args__col-count {
  background: color-mix(in srgb, var(--color-success) 14%, var(--color-bg));
  border: 1px solid color-mix(in srgb, var(--color-success) 35%, var(--color-border));
  color: var(--color-success);
}
.lp-args__col--con .lp-args__col-count {
  background: color-mix(in srgb, var(--color-danger) 14%, var(--color-bg));
  border: 1px solid color-mix(in srgb, var(--color-danger) 35%, var(--color-border));
  color: var(--color-danger);
}
.lp-shot__body--chart {
  display: flex;
  justify-content: center;
}
.lp-shot__body--chart :deep(.trend) {
  width: 100%;
}
.lp-shot__body--chat {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

/* Showcase 4: interactive motion excerpt with suggestions */
.lp-shot__body--doc {
  font-size: 1.02rem;
  line-height: 1.7;
}
.lp-shot__body--doc :deep(.editor-surface) {
  min-height: 0;
}
.lp-shot__body--doc :deep(p) {
  margin: 0 0 var(--space-3);
}
.lp-doc-hint {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  margin: var(--space-4) 0 0;
  padding: var(--space-3) 0 0;
  border-top: 1px solid var(--color-border);
  font-size: 0.82rem;
  line-height: 1.5;
  color: var(--color-text-muted);
}
.lp-doc-hint svg {
  flex-shrink: 0;
  margin-top: 0.15em;
}

/* Showcase 5: resources (real ResourceListItem template) */
.lp-shot__body--res {
  container-type: inline-size;
  container-name: res;
}
.lp-res-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}
.lp-shot__skeleton {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 220px;
  color: var(--color-text-muted);
}

@media (min-width: 860px) {
  .lp-show-row {
    grid-template-columns: 1fr 1fr;
    gap: var(--space-7);
  }
  .lp-show-row--reverse .lp-show-row__text {
    order: 2;
  }
}

/* ---------- Features ---------- */
.lp-features__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 17rem), 1fr));
  gap: var(--space-4);
}
.lp-feature {
  height: 100%;
}
.lp-feature__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 68px;
  height: 68px;
  margin-bottom: var(--space-4);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--brand-yellow) 30%, transparent);
  color: var(--brand-blue);
  font-size: 1.9rem;
}
.dark .lp-feature__icon {
  color: var(--brand-yellow);
}
.lp-feature__title {
  margin: 0 0 var(--space-2);
  font-size: 1.25rem;
}
.lp-feature__text {
  margin: 0;
  color: var(--color-text-muted);
  line-height: 1.6;
}

/* ---------- Steps ---------- */
.lp-steps__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 12rem), 1fr));
  gap: var(--space-4);
}
.lp-step {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-1);
  padding: var(--space-5) var(--space-4);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-elevated);
}
.lp-step__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  margin-bottom: var(--space-2);
  border-radius: var(--radius-pill);
  background: var(--brand-blue);
  color: var(--brand-yellow);
  font-size: 1.5rem;
}
.lp-step__num {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
}
.lp-step__label {
  font-weight: 700;
  font-size: 1.15rem;
}
.lp-step__text {
  color: var(--color-text-muted);
  font-size: 0.95rem;
}
.lp-step__arrow {
  display: none;
  position: absolute;
  right: calc(-1 * var(--space-4));
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-muted);
}
@media (min-width: 720px) {
  .lp-steps__list {
    grid-template-columns: repeat(4, 1fr);
  }
  .lp-step:not(:last-child) .lp-step__arrow {
    display: inline-block;
  }
}

/* ---------- Final CTA ---------- */
.lp-cta {
  border-radius: var(--radius-lg);
  background: var(--brand-blue);
  color: #fff;
  padding: var(--space-8) var(--space-5);
}
.lp-cta__inner {
  max-width: 36rem;
  margin: 0 auto;
  text-align: center;
}
.lp-cta__title {
  margin: 0 0 var(--space-2);
  font-size: clamp(1.7rem, 4vw, 2.4rem);
}
.lp-cta__text {
  margin: 0 0 var(--space-5);
  color: rgba(255, 255, 255, 0.82);
  font-size: 1.1rem;
}
.lp-cta__btn {
  font-size: 1.15rem;
  padding: var(--space-4) var(--space-6);
}
</style>
