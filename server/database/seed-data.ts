import type { Topic } from '../../shared/constants'

export type SeedUser = {
  email: string
  displayName: string
  role: 'member' | 'moderator' | 'admin'
  fn: string
  divisionSlug: 'bund' | 'lv-nrw' | 'lv-bayern'
}

export const SEED_USERS: SeedUser[] = [
  {
    email: 'demo@freiwerk.local',
    displayName: 'Demo Mitglied',
    role: 'member',
    fn: 'Mitglied',
    divisionSlug: 'lv-nrw',
  },
  {
    email: 'admin@freiwerk.local',
    displayName: 'Admin',
    role: 'admin',
    fn: 'Administrator:in',
    divisionSlug: 'bund',
  },
  {
    email: 'mod@freiwerk.local',
    displayName: 'Mira Moderation',
    role: 'moderator',
    fn: 'Moderator:in',
    divisionSlug: 'bund',
  },
  {
    email: 'anna.schneider@freiwerk.local',
    displayName: 'Anna Schneider',
    role: 'member',
    fn: 'Kreisvorsitzende',
    divisionSlug: 'lv-nrw',
  },
  {
    email: 'thomas.berger@freiwerk.local',
    displayName: 'Thomas Berger',
    role: 'member',
    fn: 'Mitglied LFA Wirtschaft',
    divisionSlug: 'lv-bayern',
  },
  {
    email: 'lisa.koch@freiwerk.local',
    displayName: 'Lisa Koch',
    role: 'member',
    fn: 'Mitglied LFA Bildung',
    divisionSlug: 'lv-nrw',
  },
  {
    email: 'felix.weber@freiwerk.local',
    displayName: 'Felix Weber',
    role: 'member',
    fn: 'Mitglied LFA Digitales',
    divisionSlug: 'bund',
  },
  {
    email: 'julia.hartmann@freiwerk.local',
    displayName: 'Julia Hartmann',
    role: 'member',
    fn: 'Mitglied LFA Umwelt',
    divisionSlug: 'lv-bayern',
  },
  {
    email: 'mark.rothermel@freiwerk.local',
    displayName: 'Mark Rothermel',
    role: 'member',
    fn: 'Kreisschatzmeister',
    divisionSlug: 'lv-nrw',
  },
  {
    email: 'sarah.mueller@freiwerk.local',
    displayName: 'Sarah Müller',
    role: 'member',
    fn: 'Mitglied LFA Soziales',
    divisionSlug: 'lv-nrw',
  },
]

export type MoodChoice = 'approve' | 'reject' | 'abstain' | 'undecided'

export type SeedMotion = {
  authorEmail: string
  title: string
  summary: string
  topic: Topic
  status: 'draft' | 'debate'
  divisionSlug: 'bund' | 'lv-nrw' | 'lv-bayern'
  bodyTheme: string
  bodyDemand: string
  /** Days from now when debate ends (debate motions only). */
  debateDays?: number
  /** Days ago when published (debate motions only). */
  publishedDaysAgo?: number
}

export const SEED_MOTIONS: SeedMotion[] = [
  {
    authorEmail: 'demo@freiwerk.local',
    title: 'Bürokratieabbau für Gründerinnen und Gründer',
    summary:
      'Schnellere Unternehmensgründung durch ein digitales One-Stop-Verfahren mit klaren Fristen und weniger Nachweispflichten.',
    topic: 'wirtschaft',
    status: 'debate',
    divisionSlug: 'bund',
    bodyTheme: 'Unternehmensgründungen und Verwaltungsmodernisierung',
    bodyDemand:
      'Wir fordern ein vollständig digitales Gründungsverfahren mit verbindlicher Entscheidung innerhalb von 24 Stunden.',
    debateDays: 14,
    publishedDaysAgo: 10,
  },
  {
    authorEmail: 'admin@freiwerk.local',
    title: 'Digitalpakt für Schulen weiterentwickeln',
    summary:
      'Nachhaltige Finanzierung digitaler Infrastruktur, Gerätezyklen und systematischer Lehrkräfte-Fortbildung an Schulen.',
    topic: 'bildung',
    status: 'debate',
    divisionSlug: 'lv-nrw',
    bodyTheme: 'digitale Bildung und Schulinfrastruktur',
    bodyDemand:
      'Wir fordern eine Verstetigung der Digitalpakt-Mittel, verbindliche Fortbildungsquoten und transparente Gerätezyklen.',
    debateDays: 7,
    publishedDaysAgo: 4,
  },
  {
    authorEmail: 'demo@freiwerk.local',
    title: 'Entwurf: Open-Data-Strategie der Kommunen',
    summary:
      'Offene Verwaltungsdaten als Standard mit einheitlichen Schnittstellen, Qualitätskriterien und Bürgerbeteiligung.',
    topic: 'digitales',
    status: 'draft',
    divisionSlug: 'lv-nrw',
    bodyTheme: 'Open Data und kommunale Transparenz',
    bodyDemand:
      'Wir fordern eine Open-Data-Strategie mit verpflichtenden Maschinenlesbarkeitsstandards für alle Kommunen.',
    debateDays: 21,
    publishedDaysAgo: 0,
  },
  {
    authorEmail: 'julia.hartmann@freiwerk.local',
    title: 'Klimaneutrale Bundesverwaltung bis 2030',
    summary:
      'Verbindliche Emissionsziele, Green Procurement und transparente Berichterstattung für die gesamte Bundesverwaltung.',
    topic: 'umwelt',
    status: 'debate',
    divisionSlug: 'bund',
    bodyTheme: 'Klimaschutz in der öffentlichen Verwaltung',
    bodyDemand:
      'Wir fordern Klimaneutralität der Bundesverwaltung bis 2030 mit jährlichem Fortschrittsbericht und Green Procurement.',
    debateDays: 21,
    publishedDaysAgo: 8,
  },
  {
    authorEmail: 'sarah.mueller@freiwerk.local',
    title: 'Bürgergeld: Anreize zur Erwerbstätigkeit stärken',
    summary:
      'Mehr Freibeträge bei Zuverdienst, schnellere Jobvermittlung und weniger bürokratische Meldepflichten für Betroffene.',
    topic: 'soziales',
    status: 'debate',
    divisionSlug: 'lv-nrw',
    bodyTheme: 'Soziale Sicherung und Erwerbsanreize',
    bodyDemand:
      'Wir fordern höhere Freibeträge, eine einfache Zuverdienstregel und digitale Meldewege ohne Medienbrüche.',
    debateDays: 3,
    publishedDaysAgo: 1,
  },
  {
    authorEmail: 'felix.weber@freiwerk.local',
    title: 'Europäische Digitale Identität für Deutschland',
    summary:
      'Einführung einer freiwilligen, datensparsamen digitalen Identität für Behörden- und Privatleistungen mit Open Source.',
    topic: 'digitales',
    status: 'debate',
    divisionSlug: 'bund',
    bodyTheme: 'digitale Identität und E-Government',
    bodyDemand:
      'Wir fordern eine interoperable digitale Identität auf Basis offener Standards und freiwilliger Nutzung.',
    debateDays: 30,
    publishedDaysAgo: 5,
  },
  {
    authorEmail: 'thomas.berger@freiwerk.local',
    title: 'Forschungsförderung für Mittelstand und Start-ups',
    summary:
      'Steuerliche Forschungsförderung ausweiten, Bürokratie bei Förderanträgen reduzieren und Ergebnisse schneller nutzbar machen.',
    topic: 'finanzen',
    status: 'debate',
    divisionSlug: 'lv-bayern',
    bodyTheme: 'Innovationsförderung und Forschungsfinanzierung',
    bodyDemand:
      'Wir fordern eine automatisierte Forschungszulage für KMU und vereinfachte Antragsverfahren bei öffentlichen Programmen.',
    debateDays: 10,
    publishedDaysAgo: 6,
  },
  {
    authorEmail: 'anna.schneider@freiwerk.local',
    title: 'Kommunale Selbstverwaltung modernisieren',
    summary:
      'Kommunale Entscheidungswege verkürzen, Online-Participation stärken und klare Zuständigkeiten zwischen Bund und Ländern schaffen.',
    topic: 'inneres',
    status: 'debate',
    divisionSlug: 'lv-nrw',
    bodyTheme: 'Kommunalrecht und Bürgerbeteiligung',
    bodyDemand:
      'Wir fordern ein Modernisierungspaket für kommunale Satzungen, digitale Bürgerforen und klare Zuständigkeitsregeln.',
    debateDays: 5,
    publishedDaysAgo: 2,
  },
  {
    authorEmail: 'lisa.koch@freiwerk.local',
    title: 'EU-Handelspolitik: Freihandel mit fairen Regeln',
    summary:
      'Freihandelsabkommen mit starken Nachhaltigkeitskapiteln, Schutz geistigen Eigentums und offenem Marktzugang für KMU.',
    topic: 'aussen',
    status: 'debate',
    divisionSlug: 'bund',
    bodyTheme: 'europäische Handelspolitik und Marktzugang',
    bodyDemand:
      'Wir fordern Freihandelsabkommen mit verbindlichen Nachhaltigkeits- und Transparenzstandards sowie KMU-Quoten.',
    debateDays: 28,
    publishedDaysAgo: 12,
  },
  {
    authorEmail: 'mark.rothermel@freiwerk.local',
    title: 'Prävention und digitale Gesundheitsangebote ausbauen',
    summary:
      'Präventionsprogramme flächendeckend finanzieren, digitale Gesundheitsanwendungen sicher zertifizieren und Datenhoheit wahren.',
    topic: 'gesundheit',
    status: 'debate',
    divisionSlug: 'lv-nrw',
    bodyTheme: 'Gesundheitsvorsorge und digitale Medizin',
    bodyDemand:
      'Wir fordern ein bundesweites Präventionsbudget, sichere DiGA-Zertifizierung und patientenkontrollierte Datennutzung.',
    debateDays: 14,
    publishedDaysAgo: 7,
  },
]

const BODY_SENTENCES = [
  'Weniger Vorschriften und mehr Eigenverantwortung stärken die Handlungsfähigkeit von Bürgerinnen, Unternehmen und Kommunen gleichermaßen.',
  'Transparente Verfahren, offene Daten und nachvollziehbare Entscheidungen sind die Grundlage demokratischer Legitimität.',
  'Digitale Werkzeuge dürfen keine zusätzlichen Hürden schaffen, sondern müssen Abläufe spürbar vereinfachen und beschleunigen.',
  'Reformen brauchen klare Ziele, messbare Indikatoren und regelmäßige Evaluation, damit Wirkung sichtbar wird.',
  'Föderale Zuständigkeiten sollen so ausgestaltet werden, dass Verantwortung erkennbar bleibt und Doppelstrukturen abgebaut werden.',
  'Freiheit und soziale Sicherheit sind kein Widerspruch, wenn Anreize richtig gesetzt und Chancen fair verteilt werden.',
  'Der Mittelstand trägt eine zentrale Rolle für Innovation, Beschäftigung und die finanzielle Stabilität unserer Gesellschaft.',
  'Europa ist für Deutschland der wichtigste Rahmen für Handel, Sicherheit und technologische Zusammenarbeit.',
  'Bildung, Qualifizierung und lebenslanges Lernen sind entscheidend, damit gesellschaftlicher Wandel als Chance erlebt wird.',
  'Klimaschutz gelingt nur mit marktwirtschaftlichen Instrumenten, technologischer Offenheit und realistischen Übergangspfaden.',
  'Bürgerbeteiligung muss früh, strukturiert und ergebnisoffen erfolgen, statt erst nach getroffenen Entscheidungen.',
  'Verwaltung soll Service anbieten, Fehler korrigieren und Vertrauen gewinnen, nicht primär kontrollieren und verzögern.',
] as const

function countWords(html: string): number {
  return html
    .replace(/<[^>]+>/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length
}

/** Builds sanitized TipTap-style HTML with at least 500 words. */
export function buildMotionBody(theme: string, demand: string): string {
  const headings = [
    'Motivation',
    'Ausgangslage',
    'Forderungen',
    'Begründung',
    'Umsetzung und nächste Schritte',
  ]
  let html = ''
  let sentenceIndex = 0

  for (const heading of headings) {
    html += `<h2>${heading}</h2>`
    if (heading === 'Forderungen') {
      html += `<p>${demand}</p>`
    }
    for (let i = 0; i < 3; i++) {
      const sentence = BODY_SENTENCES[sentenceIndex % BODY_SENTENCES.length]
      const paragraph = `${sentence} Im Kontext von ${theme} brauchen wir deshalb konkrete, überprüfbare Maßnahmen mit klaren Verantwortlichkeiten und messbaren Ergebnissen.`
      html += `<p>${paragraph}</p>`
      sentenceIndex++
    }
  }

  while (countWords(html) < 500) {
    const paragraph = `Zusammenfassend gilt: ${theme} erfordert politischen Mut, belastbare Kompromisse und eine Umsetzung, die Wirkung zeigt statt Symbolik.`
    html += `<p>${paragraph}</p>`
    sentenceIndex++
  }

  return html
}

export function daysAgo(now: Date, days: number): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
}

export function daysFromNow(now: Date, days: number): Date {
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
}

export type MoodTimeline = {
  userEmail: string
  events: { choice: MoodChoice; daysAgo: number }[]
}

/** Mood vote histories per motion title (complex trends for charts). */
export const MOOD_TIMELINES_BY_TITLE: Record<string, MoodTimeline[]> = {
  'Bürokratieabbau für Gründerinnen und Gründer': [
    { userEmail: 'demo@freiwerk.local', events: [{ choice: 'approve', daysAgo: 9 }, { choice: 'approve', daysAgo: 3 }] },
    { userEmail: 'admin@freiwerk.local', events: [{ choice: 'abstain', daysAgo: 8 }, { choice: 'reject', daysAgo: 2 }] },
    { userEmail: 'anna.schneider@freiwerk.local', events: [{ choice: 'approve', daysAgo: 7 }, { choice: 'reject', daysAgo: 1 }] },
    { userEmail: 'thomas.berger@freiwerk.local', events: [{ choice: 'reject', daysAgo: 6 }, { choice: 'reject', daysAgo: 2 }] },
    { userEmail: 'lisa.koch@freiwerk.local', events: [{ choice: 'approve', daysAgo: 5 }, { choice: 'abstain', daysAgo: 1 }] },
    { userEmail: 'felix.weber@freiwerk.local', events: [{ choice: 'approve', daysAgo: 4 }] },
    { userEmail: 'julia.hartmann@freiwerk.local', events: [{ choice: 'reject', daysAgo: 4 }, { choice: 'approve', daysAgo: 1 }] },
    { userEmail: 'mark.rothermel@freiwerk.local', events: [{ choice: 'undecided', daysAgo: 3 }, { choice: 'approve', daysAgo: 0 }] },
    { userEmail: 'sarah.mueller@freiwerk.local', events: [{ choice: 'reject', daysAgo: 2 }] },
  ],
  'Digitalpakt für Schulen weiterentwickeln': [
    { userEmail: 'demo@freiwerk.local', events: [{ choice: 'approve', daysAgo: 3 }] },
    { userEmail: 'lisa.koch@freiwerk.local', events: [{ choice: 'approve', daysAgo: 3 }, { choice: 'approve', daysAgo: 1 }] },
    { userEmail: 'anna.schneider@freiwerk.local', events: [{ choice: 'approve', daysAgo: 2 }] },
    { userEmail: 'admin@freiwerk.local', events: [{ choice: 'approve', daysAgo: 2 }] },
    { userEmail: 'sarah.mueller@freiwerk.local', events: [{ choice: 'abstain', daysAgo: 1 }] },
    { userEmail: 'felix.weber@freiwerk.local', events: [{ choice: 'approve', daysAgo: 0 }] },
  ],
  'Klimaneutrale Bundesverwaltung bis 2030': [
    { userEmail: 'julia.hartmann@freiwerk.local', events: [{ choice: 'approve', daysAgo: 7 }, { choice: 'approve', daysAgo: 1 }] },
    { userEmail: 'felix.weber@freiwerk.local', events: [{ choice: 'abstain', daysAgo: 6 }, { choice: 'approve', daysAgo: 2 }] },
    { userEmail: 'demo@freiwerk.local', events: [{ choice: 'approve', daysAgo: 5 }, { choice: 'abstain', daysAgo: 0 }] },
    { userEmail: 'thomas.berger@freiwerk.local', events: [{ choice: 'reject', daysAgo: 4 }] },
    { userEmail: 'admin@freiwerk.local', events: [{ choice: 'approve', daysAgo: 3 }] },
    { userEmail: 'mark.rothermel@freiwerk.local', events: [{ choice: 'approve', daysAgo: 2 }] },
    { userEmail: 'anna.schneider@freiwerk.local', events: [{ choice: 'reject', daysAgo: 1 }, { choice: 'abstain', daysAgo: 0 }] },
  ],
  'Bürgergeld: Anreize zur Erwerbstätigkeit stärken': [
    { userEmail: 'sarah.mueller@freiwerk.local', events: [{ choice: 'approve', daysAgo: 1 }] },
    { userEmail: 'demo@freiwerk.local', events: [{ choice: 'reject', daysAgo: 1 }, { choice: 'reject', daysAgo: 0 }] },
    { userEmail: 'anna.schneider@freiwerk.local', events: [{ choice: 'reject', daysAgo: 0 }] },
    { userEmail: 'thomas.berger@freiwerk.local', events: [{ choice: 'approve', daysAgo: 0 }] },
    { userEmail: 'admin@freiwerk.local', events: [{ choice: 'abstain', daysAgo: 0 }] },
  ],
  'Europäische Digitale Identität für Deutschland': [
    { userEmail: 'felix.weber@freiwerk.local', events: [{ choice: 'approve', daysAgo: 4 }, { choice: 'approve', daysAgo: 0 }] },
    { userEmail: 'admin@freiwerk.local', events: [{ choice: 'approve', daysAgo: 3 }] },
    { userEmail: 'demo@freiwerk.local', events: [{ choice: 'abstain', daysAgo: 2 }, { choice: 'approve', daysAgo: 0 }] },
    { userEmail: 'julia.hartmann@freiwerk.local', events: [{ choice: 'reject', daysAgo: 1 }] },
    { userEmail: 'lisa.koch@freiwerk.local', events: [{ choice: 'approve', daysAgo: 0 }] },
  ],
  'Forschungsförderung für Mittelstand und Start-ups': [
    { userEmail: 'thomas.berger@freiwerk.local', events: [{ choice: 'approve', daysAgo: 5 }, { choice: 'approve', daysAgo: 1 }] },
    { userEmail: 'felix.weber@freiwerk.local', events: [{ choice: 'approve', daysAgo: 4 }] },
    { userEmail: 'demo@freiwerk.local', events: [{ choice: 'approve', daysAgo: 3 }, { choice: 'abstain', daysAgo: 0 }] },
    { userEmail: 'anna.schneider@freiwerk.local', events: [{ choice: 'abstain', daysAgo: 2 }] },
    { userEmail: 'mark.rothermel@freiwerk.local', events: [{ choice: 'approve', daysAgo: 1 }] },
  ],
  'Kommunale Selbstverwaltung modernisieren': [
    { userEmail: 'anna.schneider@freiwerk.local', events: [{ choice: 'approve', daysAgo: 2 }] },
    { userEmail: 'demo@freiwerk.local', events: [{ choice: 'approve', daysAgo: 1 }] },
    { userEmail: 'mark.rothermel@freiwerk.local', events: [{ choice: 'approve', daysAgo: 1 }, { choice: 'approve', daysAgo: 0 }] },
    { userEmail: 'admin@freiwerk.local', events: [{ choice: 'abstain', daysAgo: 0 }] },
  ],
  'EU-Handelspolitik: Freihandel mit fairen Regeln': [
    { userEmail: 'lisa.koch@freiwerk.local', events: [{ choice: 'approve', daysAgo: 11 }, { choice: 'reject', daysAgo: 3 }] },
    { userEmail: 'thomas.berger@freiwerk.local', events: [{ choice: 'approve', daysAgo: 10 }, { choice: 'approve', daysAgo: 2 }] },
    { userEmail: 'demo@freiwerk.local', events: [{ choice: 'reject', daysAgo: 9 }, { choice: 'reject', daysAgo: 1 }] },
    { userEmail: 'admin@freiwerk.local', events: [{ choice: 'approve', daysAgo: 8 }, { choice: 'abstain', daysAgo: 1 }] },
    { userEmail: 'felix.weber@freiwerk.local', events: [{ choice: 'approve', daysAgo: 6 }] },
    { userEmail: 'julia.hartmann@freiwerk.local', events: [{ choice: 'reject', daysAgo: 5 }, { choice: 'approve', daysAgo: 0 }] },
    { userEmail: 'sarah.mueller@freiwerk.local', events: [{ choice: 'reject', daysAgo: 4 }] },
    { userEmail: 'anna.schneider@freiwerk.local', events: [{ choice: 'abstain', daysAgo: 2 }] },
  ],
  'Prävention und digitale Gesundheitsangebote ausbauen': [
    { userEmail: 'mark.rothermel@freiwerk.local', events: [{ choice: 'approve', daysAgo: 6 }, { choice: 'approve', daysAgo: 0 }] },
    { userEmail: 'sarah.mueller@freiwerk.local', events: [{ choice: 'approve', daysAgo: 5 }] },
    { userEmail: 'demo@freiwerk.local', events: [{ choice: 'abstain', daysAgo: 4 }, { choice: 'approve', daysAgo: 1 }] },
    { userEmail: 'lisa.koch@freiwerk.local', events: [{ choice: 'approve', daysAgo: 3 }] },
    { userEmail: 'admin@freiwerk.local', events: [{ choice: 'approve', daysAgo: 2 }] },
    { userEmail: 'julia.hartmann@freiwerk.local', events: [{ choice: 'reject', daysAgo: 1 }] },
  ],
}

export function buildMoodRows(
  motionId: string,
  timelines: MoodTimeline[],
  userIdByEmail: Record<string, string>,
  now: Date,
) {
  const votes: {
    motionId: string
    userId: string
    choice: MoodChoice
    updatedAt: Date
  }[] = []
  const events: {
    motionId: string
    userId: string
    choice: MoodChoice
    createdAt: Date
  }[] = []

  for (const timeline of timelines) {
    const userId = userIdByEmail[timeline.userEmail]
    if (!userId) continue
    const latest = timeline.events.reduce((current, candidate) =>
      candidate.daysAgo < current.daysAgo ? candidate : current,
    )

    votes.push({
      motionId,
      userId,
      choice: latest.choice,
      updatedAt: daysAgo(now, latest.daysAgo),
    })

    for (const event of timeline.events) {
      events.push({
        motionId,
        userId,
        choice: event.choice,
        createdAt: daysAgo(now, event.daysAgo),
      })
    }
  }

  events.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  return { votes, events }
}

/** Verify all motion bodies meet the minimum word count during seeding. */
export function assertMotionBodyLength(html: string, title: string, minWords = 500): void {
  const words = countWords(html)
  if (words < minWords) {
    throw new Error(`Motion "${title}" body has only ${words} words (min ${minWords}).`)
  }
}
