import type { Topic } from '../../shared/constants'
import type { DivisionSlug } from '../../shared/divisions'

export type SeedUser = {
  email: string
  displayName: string
  gender: 'm' | 'f'
  role: 'member' | 'moderator' | 'admin'
  fn: string
  divisionSlug: DivisionSlug
}

/** Static demo avatars in `public/imgs/profile_m_1.png` … `profile_m_4.png` and `profile_f_1.png` … `profile_f_4.png`. */
export const SEED_PROFILE_AVATARS_PER_GENDER = 4

const avatarSlotByGender = { m: 0, f: 0 }

export function seedProfileAvatarUrl(user: Pick<SeedUser, 'gender'>): string {
  const slot =
    (avatarSlotByGender[user.gender]++ % SEED_PROFILE_AVATARS_PER_GENDER) + 1
  return `/imgs/profile_${user.gender}_${slot}.png`
}

export const SEED_USERS: SeedUser[] = [
  {
    email: 'demo@freiwerk.local',
    displayName: 'Marc Schmidt',
    gender: 'm',
    role: 'member',
    fn: 'Mitglied',
    divisionSlug: 'nrw',
  },
  {
    email: 'admin@freiwerk.local',
    displayName: 'Stefan Hoffmann',
    gender: 'm',
    role: 'admin',
    fn: 'Administrator:in',
    divisionSlug: 'bund',
  },
  {
    email: 'mod@freiwerk.local',
    displayName: 'Mira Becker',
    gender: 'f',
    role: 'moderator',
    fn: 'Moderator:in',
    divisionSlug: 'bund',
  },
  {
    email: 'anna.schneider@freiwerk.local',
    displayName: 'Anna Schneider',
    gender: 'f',
    role: 'member',
    fn: 'Kreisvorsitzende',
    divisionSlug: 'nrw',
  },
  {
    email: 'thomas.berger@freiwerk.local',
    displayName: 'Thomas Berger',
    gender: 'm',
    role: 'member',
    fn: 'Mitglied LFA Wirtschaft',
    divisionSlug: 'bayern',
  },
  {
    email: 'lisa.koch@freiwerk.local',
    displayName: 'Lisa Koch',
    gender: 'f',
    role: 'member',
    fn: 'Mitglied LFA Bildung',
    divisionSlug: 'nrw',
  },
  {
    email: 'felix.weber@freiwerk.local',
    displayName: 'Felix Weber',
    gender: 'm',
    role: 'member',
    fn: 'Mitglied LFA Digitales',
    divisionSlug: 'hessen',
  },
  {
    email: 'julia.hartmann@freiwerk.local',
    displayName: 'Julia Hartmann',
    gender: 'f',
    role: 'member',
    fn: 'Mitglied LFA Umwelt',
    divisionSlug: 'baden-wuerttemberg',
  },
  {
    email: 'mark.rothermel@freiwerk.local',
    displayName: 'Mark Rothermel',
    gender: 'm',
    role: 'member',
    fn: 'Kreisschatzmeister',
    divisionSlug: 'niedersachsen',
  },
  {
    email: 'sarah.mueller@freiwerk.local',
    displayName: 'Sarah Müller',
    gender: 'f',
    role: 'member',
    fn: 'Mitglied LFA Soziales',
    divisionSlug: 'berlin',
  },
]

export const SEED_DISPLAY_NAME_BY_EMAIL = Object.fromEntries(
  SEED_USERS.map((user) => [user.email, user.displayName]),
) as Record<string, string>

export type MoodChoice = 'approve' | 'reject' | 'abstain' | 'undecided'

export type BallotTally = { approve: number; reject: number; abstain: number }

export type MotionBodyStyle = 'standard' | 'compact' | 'rich' | 'custom'

export type DeliberationLevel = 'none' | 'minimal' | 'moderate' | 'rich'

export type SeedMotion = {
  authorEmail: string
  title: string
  summary: string
  topic: Topic
  status: 'draft' | 'debate' | 'ballot' | 'decided'
  divisionSlug: DivisionSlug
  bodyTheme: string
  bodyDemand: string
  bodyHtml?: string
  bodyStyle?: Exclude<MotionBodyStyle, 'custom'>
  /** How much deliberation data to seed (defaults by status). */
  deliberationLevel?: DeliberationLevel
  /** Debate posts to seed (0 for none). */
  postCount?: number
  debateDays?: number
  publishedDaysAgo?: number
  ballotDays?: number
  ballotStartedDaysAgo?: number
  outcome?: 'accepted' | 'rejected'
  ballotTally?: BallotTally
}

function attachmentChip(href: string, label: string, mime = 'application/pdf'): string {
  return `<a href="${href}" class="attachment-chip attachment-chip__link" data-attachment data-label="${label}" data-mime="${mime}" target="_blank" rel="noopener noreferrer nofollow"><span class="attachment-chip__icon" aria-hidden="true"></span><span class="attachment-chip__label">${label}</span></a>`
}

/** Extra paragraph block for slightly longer demo bodies. */
function rationaleParagraph(theme: string, extra?: string): string {
  const tail = extra ?? 'Subsidiarität, Transparenz und messbare Wirkung sind dabei Leitplanken.'
  return `<h2>Begründung</h2><p>Im Bereich ${theme} verbinden wir liberale Freiheits- und Verantwortungsideen mit pragmatischer Umsetzung. ${tail}</p>`
}

export function defaultDeliberationLevel(status: SeedMotion['status']): DeliberationLevel {
  if (status === 'draft') return 'none'
  if (status === 'ballot' || status === 'decided') return 'moderate'
  return 'moderate'
}

export function defaultPostCount(meta: SeedMotion): number {
  if (meta.postCount != null) return meta.postCount
  if (meta.status === 'draft') return 0
  const level = meta.deliberationLevel ?? defaultDeliberationLevel(meta.status)
  switch (level) {
    case 'none':
      return 0
    case 'minimal':
      return 2
    case 'rich':
      return 8
    default:
      return 5
  }
}

export const SEED_MOTIONS: SeedMotion[] = [
  {
    authorEmail: 'demo@freiwerk.local',
    title: 'Gründung in 24 Stunden',
    summary:
      'Digitales One-Stop-Verfahren für Unternehmensgründungen mit klaren Fristen und weniger Nachweispflichten.',
    topic: 'wirtschaft',
    status: 'debate',
    divisionSlug: 'bund',
    deliberationLevel: 'rich',
    bodyTheme: 'Unternehmensgründung',
    bodyDemand: 'Wir fordern ein vollständig digitales Gründungsverfahren mit verbindlicher Entscheidung innerhalb von 24 Stunden.',
    bodyHtml: [
      '<h2>Kernpunkt</h2>',
      '<p><strong>Wir fordern ein vollständig digitales Gründungsverfahren mit verbindlicher Entscheidung innerhalb von 24 Stunden.</strong></p>',
      '<p>Gründerinnen und Gründer sollen Anträge zentral einreichen können – analog zum ',
      '<a href="https://www.unternehmensregister.de/" target="_blank" rel="noopener noreferrer">Unternehmensregister</a>.</p>',
      '<h2>Umsetzung</h2>',
      '<ul>',
      '<li>Ein Portal für alle Schritte von der Idee bis zur Eintragung</li>',
      '<li>Automatische Prüfung standardisierter Unterlagen</li>',
      '<li>Evaluierung nach zwei Jahren mit öffentlichem Bericht</li>',
      '</ul>',
      `<p>Hintergrund: ${attachmentChip('/uploads/seed-feasibility-study.pdf', 'Kurzstudie Gründungsverfahren')}</p>`,
      rationaleParagraph('Unternehmensgründung', 'Gerade Gründerinnen und Gründer ohne Netzwerk profitieren von klaren Fristen und digitalen Prozessen.'),
    ].join(''),
  },
  {
    authorEmail: 'admin@freiwerk.local',
    title: 'Digitalpakt verstetigen',
    summary:
      'Dauerhafte Mittel für Schulnetze, Geräte und Lehrkräfte-Fortbildung statt Stückwerk-Förderung.',
    topic: 'bildung',
    status: 'debate',
    divisionSlug: 'nrw',
    deliberationLevel: 'moderate',
    debateDays: 7,
    publishedDaysAgo: 4,
    bodyTheme: 'digitale Bildung',
    bodyDemand:
      'Wir fordern verbindliche Fortbildungsquoten und transparente Gerätezyklen an allen Schulen.',
    bodyHtml: [
      '<blockquote><p>Digitalisierung darf nicht am Schulgeld scheitern.</p></blockquote>',
      '<p><strong>Wir fordern verbindliche Fortbildungsquoten und transparente Gerätezyklen an allen Schulen.</strong></p>',
      '<p>Der <a href="https://www.bildungsserver.de/" target="_blank" rel="noopener noreferrer">Deutsche Bildungsserver</a> zeigt: Infrastruktur und Didaktik müssen zusammen gedacht werden.</p>',
      '<ol>',
      '<li>Digitalpakt-Mittel dauerhaft verstetigen</li>',
      '<li>Mindeststandards für WLAN und Endgeräte</li>',
      '<li>Fortbildung verpflichtend einplanen</li>',
      '</ol>',
      rationaleParagraph('digitale Bildung'),
    ].join(''),
  },
  {
    authorEmail: 'demo@freiwerk.local',
    title: 'Open Data in Kommunen',
    summary: 'Offene Verwaltungsdaten als Standard – maschinenlesbar, aktuell und frei nutzbar.',
    topic: 'digitales',
    status: 'draft',
    divisionSlug: 'berlin',
    deliberationLevel: 'none',
    bodyTheme: 'Open Data',
    bodyDemand:
      'Wir fordern Open-Data-Standards mit verpflichtender Maschinenlesbarkeit für alle Kommunen.',
    bodyHtml: [
      '<h2>Entwurf</h2>',
      '<p><strong>Wir fordern Open-Data-Standards mit verpflichtender Maschinenlesbarkeit für alle Kommunen.</strong></p>',
      '<p>Vorbild: <a href="https://opendata.de/" target="_blank" rel="noopener noreferrer">Open Knowledge Foundation Deutschland</a>.</p>',
      '<p>Bürgerinnen, Bürger und Unternehmen profitieren von offenen Daten und weniger Hürden.</p>',
      '<ul><li>Offene Schnittstellen (APIs)</li><li>Lizenzfreie Nutzung</li><li>Qualitätskontrolle durch Metadaten</li></ul>',
    ].join(''),
  },
  {
    authorEmail: 'julia.hartmann@freiwerk.local',
    title: 'Klimaneutrale Verwaltung 2030',
    summary: 'Emissionsziele, Green Procurement und jährliche Berichte für die Bundesverwaltung.',
    topic: 'umwelt',
    status: 'debate',
    divisionSlug: 'bund',
    deliberationLevel: 'moderate',
    debateDays: 21,
    publishedDaysAgo: 8,
    bodyTheme: 'Klimaschutz in der Verwaltung',
    bodyDemand:
      'Wir fordern Klimaneutralität der Bundesverwaltung bis 2030 mit jährlichem Fortschrittsbericht.',
    bodyHtml: [
      '<h2>Ziel</h2>',
      '<p><strong>Wir fordern Klimaneutralität der Bundesverwaltung bis 2030 mit jährlichem Fortschrittsbericht.</strong></p>',
      '<p>Green Procurement und Energieeffizienz sind Hebel – siehe ',
      '<a href="https://www.umweltbundesamt.de/" target="_blank" rel="noopener noreferrer">Umweltbundesamt</a>.</p>',
      '<p><em>Scope 1–3</em> sollen erfasst und veröffentlicht werden; Ausnahmen müssen begründet sein.</p>',
      rationaleParagraph('Klimaschutz in der öffentlichen Verwaltung'),
    ].join(''),
  },
  {
    authorEmail: 'sarah.mueller@freiwerk.local',
    title: 'Mehr Zuverdienst beim Bürgergeld',
    summary: 'Höhere Freibeträge, einfache Meldewege und schnellere Vermittlung statt bürokratischer Hürden.',
    topic: 'soziales',
    status: 'debate',
    divisionSlug: 'berlin',
    deliberationLevel: 'rich',
    debateDays: 3,
    publishedDaysAgo: 1,
    bodyTheme: 'Soziale Sicherung',
    bodyDemand:
      'Wir fordern höhere Freibeträge, eine einfache Zuverdienstregel und digitale Meldewege ohne Medienbrüche.',
    bodyHtml: [
      '<h2>Kurzfassung</h2>',
      '<p><strong>Wir fordern höhere Freibeträge, eine einfache Zuverdienstregel und digitale Meldewege ohne Medienbrüche.</strong></p>',
      '<p>Arbeit muss sich lohnen – ohne Angst vor Rückforderungen. Informationen: ',
      '<a href="https://www.arbeitsagentur.de/" target="_blank" rel="noopener noreferrer">Bundesagentur für Arbeit</a>.</p>',
      rationaleParagraph('Soziale Sicherung', 'Anreize zur Erwerbstätigkeit dürfen nicht durch Bürokratie untergraben werden.'),
    ].join(''),
  },
  {
    authorEmail: 'felix.weber@freiwerk.local',
    title: 'Europäische Digitale Identität',
    summary: 'Freiwillige, datensparsame eID für Behörden- und Privatleistungen auf Open-Source-Basis.',
    topic: 'digitales',
    status: 'debate',
    divisionSlug: 'bund',
    deliberationLevel: 'rich',
    debateDays: 30,
    publishedDaysAgo: 5,
    bodyTheme: 'digitale Identität',
    bodyDemand:
      'Wir fordern eine interoperable digitale Identität auf Basis offener Standards und freiwilliger Nutzung.',
    bodyHtml: [
      '<h2>Einleitung</h2>',
      '<blockquote><p>Wir fordern eine interoperable digitale Identität auf Basis offener Standards und freiwilliger Nutzung.</p></blockquote>',
      '<p>Die <a href="https://digital-strategy.ec.europa.eu/" target="_blank" rel="noopener noreferrer">EU-Digitalstrategie</a> (eIDAS 2.0) bietet den Rahmen.</p>',
      '<h2>Leitplanken</h2>',
      '<ol>',
      '<li>Freiwilligkeit und gleichwertige analoge Wege</li>',
      '<li>Open Source für Wallet-Software</li>',
      '<li>Dezentrale Speicherung statt zentraler Identitätsstores</li>',
      '</ol>',
      `<p>${attachmentChip('/uploads/seed-eu-id-background.pdf', 'Hintergrundpapier eID')}</p>`,
      rationaleParagraph('digitale Identität'),
    ].join(''),
  },
  {
    authorEmail: 'thomas.berger@freiwerk.local',
    title: 'Forschungszulage für KMU',
    summary: 'Automatisierte Forschungsförderung und weniger Antragsaufwand für Mittelstand und Start-ups.',
    topic: 'finanzen',
    status: 'debate',
    divisionSlug: 'bayern',
    deliberationLevel: 'minimal',
    postCount: 3,
    debateDays: 10,
    publishedDaysAgo: 6,
    bodyTheme: 'Innovationsförderung',
    bodyDemand:
      'Wir fordern eine automatisierte Forschungszulage für KMU und vereinfachte Antragsverfahren.',
    bodyHtml: [
      '<h2>Forderung</h2>',
      '<p><strong>Wir fordern eine automatisierte Forschungszulage für KMU und vereinfachte Antragsverfahren.</strong></p>',
      '<p>Bayern und der Bund sollten Modelle abstimmen – vgl. ',
      '<a href="https://www.zim.de/" target="_blank" rel="noopener noreferrer">ZIM-Förderung</a>.</p>',
      '<ul><li>Pauschale Zuschüsse statt Dutzende Formulare</li><li>Schnellere Bescheide</li></ul>',
      rationaleParagraph('Innovationsförderung'),
    ].join(''),
  },
  {
    authorEmail: 'anna.schneider@freiwerk.local',
    title: 'Kommunale Bürgerforen',
    summary: 'Digitale Beteiligung und klarere Zuständigkeiten für schnellere kommunale Entscheidungen.',
    topic: 'inneres',
    status: 'debate',
    divisionSlug: 'nrw',
    deliberationLevel: 'moderate',
    debateDays: 5,
    publishedDaysAgo: 2,
    bodyTheme: 'Kommunalrecht',
    bodyDemand:
      'Wir fordern digitale Bürgerforen, modernisierte Satzungen und klare Zuständigkeitsregeln.',
    bodyHtml: [
      '<h2>Problem</h2>',
      '<p><strong>Wir fordern digitale Bürgerforen, modernisierte Satzungen und klare Zuständigkeitsregeln.</strong></p>',
      '<p>NRW braucht niedrigschwellige Formate – orientiert an ',
      '<a href="https://www.bpb.de/" target="_blank" rel="noopener noreferrer">bpb-Beteiligungsformaten</a>.</p>',
      `<p>Anhang: ${attachmentChip('/uploads/seed-lfa-digital-position.pdf', 'Positionspapier LFA')}</p>`,
      rationaleParagraph('Kommunalrecht'),
    ].join(''),
  },
  {
    authorEmail: 'lisa.koch@freiwerk.local',
    title: 'Fairer Freihandel mit Nachhaltigkeit',
    summary: 'Handelsabkommen mit verbindlichen Sozial- und Umweltkapiteln plus KMU-Marktzugang.',
    topic: 'aussen',
    status: 'debate',
    divisionSlug: 'bund',
    deliberationLevel: 'rich',
    debateDays: 28,
    publishedDaysAgo: 12,
    bodyTheme: 'Handelspolitik',
    bodyDemand:
      'Wir fordern Freihandelsabkommen mit verbindlichen Nachhaltigkeits- und Transparenzstandards.',
    bodyHtml: [
      '<blockquote><p>Freihandel ja – aber mit fairen Regeln.</p></blockquote>',
      '<p><strong>Wir fordern Freihandelsabkommen mit verbindlichen Nachhaltigkeits- und Transparenzstandards.</strong></p>',
      '<p>Referenz: <a href="https://ec.europa.eu/trade/" target="_blank" rel="noopener noreferrer">EU-Handelspolitik</a>.</p>',
      '<hr><p><strong>Fazit:</strong> Marktzugang für KMU und Schutz hoher Standards gehören zusammen.</p>',
    ].join(''),
  },
  {
    authorEmail: 'mark.rothermel@freiwerk.local',
    title: 'Prävention digital ausbauen',
    summary: 'Flächendeckende Präventionsprogramme und sichere digitale Gesundheitsangebote.',
    topic: 'gesundheit',
    status: 'debate',
    divisionSlug: 'niedersachsen',
    deliberationLevel: 'minimal',
    postCount: 3,
    debateDays: 14,
    publishedDaysAgo: 7,
    bodyTheme: 'Gesundheitsvorsorge',
    bodyDemand:
      'Wir fordern ein bundesweites Präventionsbudget und patientenkontrollierte Datennutzung bei DiGAs.',
    bodyHtml: [
      '<h2>Kurz</h2>',
      '<p><strong>Wir fordern ein bundesweites Präventionsbudget und patientenkontrollierte Datennutzung bei DiGAs.</strong></p>',
      '<p>Mehr zu DiGAs: ',
      '<a href="https://www.bundesgesundheitsministerium.de/" target="_blank" rel="noopener noreferrer">Bundesgesundheitsministerium</a>.</p>',
      rationaleParagraph('Gesundheitsvorsorge', 'Prävention ist günstiger als Behandlung – digitale Angebote müssen sicher und freiwillig bleiben.'),
    ].join(''),
  },
  {
    authorEmail: 'felix.weber@freiwerk.local',
    title: 'Public Money, Public Code',
    summary: 'Öffentlich finanzierte Behördensoftware soll quelloffen entwickelt und nachnutzbar sein.',
    topic: 'digitales',
    status: 'ballot',
    divisionSlug: 'bund',
    deliberationLevel: 'moderate',
    postCount: 6,
    bodyTheme: 'Open Source in der Verwaltung',
    bodyDemand:
      'Wir fordern eine verbindliche Open-Source-Strategie nach dem Grundsatz „Public Money, Public Code“.',
    bodyHtml: [
      '<h2>Grundsatz</h2>',
      '<p><strong>Wir fordern eine verbindliche Open-Source-Strategie nach dem Grundsatz „Public Money, Public Code“.</strong></p>',
      '<p>Beispiele: <a href="https://publiccode.eu/" target="_blank" rel="noopener noreferrer">Public Code Europe</a>.</p>',
      '<ol><li>Neue Software standardmäßig quelloffen</li><li>Ausnahmen begründen und dokumentieren</li></ol>',
      `<p>${attachmentChip('/uploads/seed-feasibility-study.pdf', 'Umsetzungsstudie OSS')}</p>`,
    ].join(''),
    debateDays: 14,
    publishedDaysAgo: 24,
    ballotDays: 7,
    ballotStartedDaysAgo: 5,
    ballotTally: { approve: 4, reject: 1, abstain: 1 },
  },
  {
    authorEmail: 'anna.schneider@freiwerk.local',
    title: 'Transparenzregister kommunaler Beteiligungen',
    summary: 'Offenes, maschinenlesbares Register kommunaler Unternehmensbeteiligungen.',
    topic: 'inneres',
    status: 'decided',
    divisionSlug: 'nrw',
    deliberationLevel: 'rich',
    postCount: 8,
    bodyTheme: 'Kommunale Transparenz',
    bodyDemand:
      'Wir fordern ein einheitliches, maschinenlesbares Transparenzregister für alle kommunalen Beteiligungen.',
    bodyHtml: [
      '<h2>Beschlusslage</h2>',
      '<p><strong>Wir fordern ein einheitliches, maschinenlesbares Transparenzregister für alle kommunalen Beteiligungen.</strong></p>',
      '<p>Kontrolle und Vergleichbarkeit stärken Vertrauen in kommunale Wirtschaftlichkeit.</p>',
      `<p>${attachmentChip('/uploads/seed-lfa-digital-position.pdf', 'Musterregister (PDF)')}</p>`,
    ].join(''),
    debateDays: 14,
    publishedDaysAgo: 45,
    ballotDays: 7,
    ballotStartedDaysAgo: 21,
    outcome: 'accepted',
    ballotTally: { approve: 6, reject: 2, abstain: 1 },
  },
  {
    authorEmail: 'julia.hartmann@freiwerk.local',
    title: 'Windenergie-Abstände modernisieren',
    summary:
      'Planungsrecht an neue Technik anpassen, Abstände kommunalfreundlich gestalten und Genehmigungen beschleunigen.',
    topic: 'umwelt',
    status: 'debate',
    divisionSlug: 'hessen',
    deliberationLevel: 'rich',
    debateDays: 18,
    publishedDaysAgo: 9,
    bodyTheme: 'Erneuerbare Energien',
    bodyDemand:
      'Wir fordern eine Reform der Abstandsregeln mit kommunaler Mitbestimmung und schnelleren Genehmigungsverfahren.',
    bodyHtml: [
      '<h2>Ausgangslage</h2>',
      '<p><strong>Wir fordern eine Reform der Abstandsregeln mit kommunaler Mitbestimmung und schnelleren Genehmigungsverfahren.</strong></p>',
      '<p>Windkraft ist zentral für Klimaziele – siehe ',
      '<a href="https://www.bmwk.de/" target="_blank" rel="noopener noreferrer">BMWK Energiewende</a>.</p>',
      '<ul>',
      '<li>Abstände an Rotordurchmesser und Lärmschutz koppeln</li>',
      '<li>Kommunen erhalten Planungshoheit bei Standortpaketen</li>',
      '<li>Bürgerbeteiligung vor Festlegung von Flächen</li>',
      '</ul>',
      rationaleParagraph('Windenergie', 'Akzeptanz entsteht durch Transparenz und faire Ausgleichsmechanismen.'),
    ].join(''),
  },
  {
    authorEmail: 'felix.weber@freiwerk.local',
    title: 'Ehrenamtskarte bundesweit',
    summary:
      'Einheitliche digitale Ehrenamtskarte mit Anerkennungsleistungen und einfacher Nachweisführung für Engagierte.',
    topic: 'inneres',
    status: 'debate',
    divisionSlug: 'bund',
    deliberationLevel: 'moderate',
    debateDays: 21,
    publishedDaysAgo: 6,
    bodyTheme: 'Ehrenamt',
    bodyDemand:
      'Wir fordern eine bundesweit gültige Ehrenamtskarte mit digitalen Services und kommunalen Anerkennungsangeboten.',
    bodyHtml: [
      '<blockquote><p>Ehrenamt darf nicht an Bürokratie scheitern.</p></blockquote>',
      '<p><strong>Wir fordern eine bundesweit gültige Ehrenamtskarte mit digitalen Services und kommunalen Anerkennungsangeboten.</strong></p>',
      '<p>Viele Länder haben Piloten – ein Bund-Länder-Standard würde Entlastung schaffen.</p>',
      '<ol>',
      '<li>Einheitliche digitale Karte mit fälschungssicherem Nachweis</li>',
      '<li>Kommunen definieren freiwillige Vergünstigungen</li>',
      '<li>Datenschutz by Design</li>',
      '</ol>',
      rationaleParagraph('Ehrenamt'),
    ].join(''),
  },
  {
    authorEmail: 'sarah.mueller@freiwerk.local',
    title: 'Kitaplätze verbindlich sichern',
    summary:
      'Rechtsanspruch mit klaren Fristen, besserer Personalgewinnung und transparentem Kita-Monitoring.',
    topic: 'soziales',
    status: 'debate',
    divisionSlug: 'berlin',
    deliberationLevel: 'minimal',
    postCount: 1,
    debateDays: 28,
    publishedDaysAgo: 1,
    bodyTheme: 'Frühkindliche Bildung',
    bodyDemand:
      'Wir fordern verbindliche Kitaplätze innerhalb definierter Fristen und ein öffentliches Monitoring der Versorgung.',
    bodyHtml: [
      '<h2>Forderung</h2>',
      '<p><strong>Wir fordern verbindliche Kitaplätze innerhalb definierter Fristen und ein öffentliches Monitoring der Versorgung.</strong></p>',
      '<p>Eltern brauchen Planbarkeit; Kommunen brauchen Unterstützung bei Personal und Infrastruktur.</p>',
      rationaleParagraph('Kitabetreuung', 'Chancengleichheit beginnt vor der Schule.'),
    ].join(''),
  },
  {
    authorEmail: 'admin@freiwerk.local',
    title: 'KRITIS-Schutz stärken',
    summary:
      'Mindeststandards für Cybersicherheit kritischer Infrastruktur, Meldepflichten und unabhängige Audits.',
    topic: 'digitales',
    status: 'debate',
    divisionSlug: 'bund',
    deliberationLevel: 'rich',
    debateDays: 14,
    publishedDaysAgo: 11,
    bodyTheme: 'Cybersicherheit',
    bodyDemand:
      'Wir fordern verbindliche Sicherheitsstandards für KRITIS-Betreiber mit unabhängigen Audits und Bußgeldern bei Nachlässigkeit.',
    bodyHtml: [
      '<h2>Problem</h2>',
      '<p><strong>Wir fordern verbindliche Sicherheitsstandards für KRITIS-Betreiber mit unabhängigen Audits und Bußgeldern bei Nachlässigkeit.</strong></p>',
      '<p>Das BSI veröffentlicht Leitlinien – sie müssen verbindlich werden: ',
      '<a href="https://www.bsi.bund.de/" target="_blank" rel="noopener noreferrer">BSI</a>.</p>',
      '<ul>',
      '<li>Regelmäßige Penetrationstests</li>',
      '<li>Meldepflicht bei Sicherheitsvorfällen innerhalb von 24 Stunden</li>',
      '<li>Förderung für Mittelstandslieferanten</li>',
      '</ul>',
      `<p>${attachmentChip('/uploads/seed-feasibility-study.pdf', 'Audit-Checkliste KRITIS')}</p>`,
      rationaleParagraph('Cybersicherheit'),
    ].join(''),
  },
  {
    authorEmail: 'mark.rothermel@freiwerk.local',
    title: 'Wohnungsbau beschleunigen',
    summary:
      'Genehmigungen straffen, Standardisierung fördern und Kommunen bei Baulandaktivierung unterstützen.',
    topic: 'inneres',
    status: 'ballot',
    divisionSlug: 'nrw',
    deliberationLevel: 'moderate',
    postCount: 6,
    bodyTheme: 'Wohnungsmarkt',
    bodyDemand:
      'Wir fordern ein Beschleunigungsgesetz für Wohnungsbau mit digitalen Genehmigungsverfahren und Vorrang für verdichtete Projekte.',
    bodyHtml: [
      '<h2>Kernpunkt</h2>',
      '<p><strong>Wir fordern ein Beschleunigungsgesetz für Wohnungsbau mit digitalen Genehmigungsverfahren und Vorrang für verdichtete Projekte.</strong></p>',
      '<p>Bezahlbarer Wohnraum erfordert schnellere Planung ohne Qualitätsverlust.</p>',
      '<ol>',
      '<li>Standardisierte Bauweise privilegieren</li>',
      '<li>Kommunale Baulandoffensive</li>',
      '<li>Evaluierung nach drei Jahren</li>',
      '</ol>',
      rationaleParagraph('Wohnungsmarkt'),
    ].join(''),
    debateDays: 10,
    publishedDaysAgo: 20,
    ballotDays: 5,
    ballotStartedDaysAgo: 3,
    ballotTally: { approve: 5, reject: 3, abstain: 1 },
  },
  {
    authorEmail: 'thomas.berger@freiwerk.local',
    title: 'Tempolimit auf Autobahnen abschaffen',
    summary:
      'Rückkehr zu bedarfsorientierten Geschwindigkeiten auf Autobahnen statt pauschaler Limits.',
    topic: 'sonstiges',
    status: 'decided',
    divisionSlug: 'bayern',
    deliberationLevel: 'moderate',
    postCount: 7,
    bodyTheme: 'Verkehrspolitik',
    bodyDemand:
      'Wir fordern die Abschaffung genereller Tempolimits auf Autobahnen zugunsten dynamischer, verkehrsabhängiger Regelungen.',
    bodyHtml: [
      '<h2>Position</h2>',
      '<p><strong>Wir fordern die Abschaffung genereller Tempolimits auf Autobahnen zugunsten dynamischer, verkehrsabhängiger Regelungen.</strong></p>',
      '<p>Freie Fahrt dort, wo es die Situation erlaubt, stärkt Akzeptanz und Effizienz.</p>',
      rationaleParagraph('Verkehrspolitik', 'Entscheidungen sollten Daten und lokale Gegebenheiten berücksichtigen.'),
    ].join(''),
    debateDays: 7,
    publishedDaysAgo: 35,
    ballotDays: 5,
    ballotStartedDaysAgo: 18,
    outcome: 'rejected',
    ballotTally: { approve: 2, reject: 7, abstain: 1 },
  },
  {
    authorEmail: 'lisa.koch@freiwerk.local',
    title: 'Feuerwehr-Funk digitalisieren',
    summary:
      'Moderne Kommunikationsinfrastruktur für Hilfsorganisationen mit bundesweiter Interoperabilität.',
    topic: 'inneres',
    status: 'debate',
    divisionSlug: 'saarland',
    deliberationLevel: 'minimal',
    postCount: 3,
    debateDays: 12,
    publishedDaysAgo: 3,
    bodyTheme: 'Katastrophenschutz',
    bodyDemand:
      'Wir fordern ein digitales Funksystem für Feuerwehr und Rettungsdienste mit bundesweit kompatiblen Standards.',
    bodyHtml: [
      '<p><strong>Wir fordern ein digitales Funksystem für Feuerwehr und Rettungsdienste mit bundesweit kompatiblen Standards.</strong></p>',
      '<p>Analogfunk ist am Limit – Einsatzkräfte brauchen zuverlässige Datenübertragung.</p>',
      rationaleParagraph('Katastrophenschutz'),
    ].join(''),
  },
  {
    authorEmail: 'demo@freiwerk.local',
    title: 'Sozialleistungen digital vereinfachen',
    summary:
      'Entwurf für ein Once-Only-Prinzip bei Anträgen und automatische Weiterleitung nachgewiesener Daten.',
    topic: 'soziales',
    status: 'draft',
    divisionSlug: 'hamburg',
    deliberationLevel: 'none',
    bodyTheme: 'Verwaltungsdigitalisierung',
    bodyDemand:
      'Wir fordern das Once-Only-Prinzip für Sozialleistungen mit sicheren Datentreuhändern.',
    bodyHtml: [
      '<h2>Entwurf</h2>',
      '<p><strong>Wir fordern das Once-Only-Prinzip für Sozialleistungen mit sicheren Datentreuhändern.</strong></p>',
      '<p>Bürgerinnen und Bürger sollen Nachweise nicht dutzende Male einreichen müssen.</p>',
      '<ul><li>Datensparsamkeit</li><li>Freiwillige Nutzung</li><li>Offline-Alternative</li></ul>',
    ].join(''),
  },
  {
    authorEmail: 'anna.schneider@freiwerk.local',
    title: 'Wasserstoffkernnetz ausbauen',
    summary:
      'Gezielte Investitionen in H2-Infrastruktur für Industrie und Schwerlastverkehr mit klarer Förderlogik.',
    topic: 'wirtschaft',
    status: 'decided',
    divisionSlug: 'niedersachsen',
    deliberationLevel: 'rich',
    postCount: 9,
    bodyTheme: 'Energiewirtschaft',
    bodyDemand:
      'Wir fordern den bundesweiten Ausbau eines Wasserstoffkernnetzes mit marktwirtschaftlicher Förderung und Technologieoffenheit.',
    bodyHtml: [
      '<h2>Ziel</h2>',
      '<p><strong>Wir fordern den bundesweiten Ausbau eines Wasserstoffkernnetzes mit marktwirtschaftlicher Förderung und Technologieoffenheit.</strong></p>',
      '<p>Industriestandorte an der Küste und im Binnenland brauchen planbare Anschlüsse.</p>',
      '<p>Referenz: ',
      '<a href="https://www.netztransparenz.de/" target="_blank" rel="noopener noreferrer">Netztransparenz</a>.</p>',
      `<p>${attachmentChip('/uploads/seed-lfa-digital-position.pdf', 'Infrastrukturkarte H2')}</p>`,
      rationaleParagraph('Wasserstoffwirtschaft'),
    ].join(''),
    debateDays: 21,
    publishedDaysAgo: 50,
    ballotDays: 7,
    ballotStartedDaysAgo: 25,
    outcome: 'accepted',
    ballotTally: { approve: 7, reject: 2, abstain: 0 },
  },
  {
    authorEmail: 'julia.hartmann@freiwerk.local',
    title: 'Landesplanung Wind anpassen',
    summary:
      'Regionale Flächenfestlegung statt Detailstreit um Einzelanlagen – Entwurf ohne breite Debatte.',
    topic: 'umwelt',
    status: 'debate',
    divisionSlug: 'schleswig-holstein',
    deliberationLevel: 'none',
    postCount: 0,
    debateDays: 30,
    publishedDaysAgo: 2,
    bodyTheme: 'Regionalplanung',
    bodyDemand:
      'Wir fordern eine landesweite Flächenkulisse für Windenergie mit kommunaler Mitwirkung.',
    bodyHtml: [
      '<p><strong>Wir fordern eine landesweite Flächenkulisse für Windenergie mit kommunaler Mitwirkung.</strong></p>',
      '<p>Planungssicherheit reduziert Konflikte um Einzelstandorte.</p>',
      rationaleParagraph('Regionalplanung'),
    ].join(''),
  },
]

const BODY_SENTENCES = [
  'Weniger Vorschriften und mehr Eigenverantwortung stärken die Handlungsfähigkeit von Bürgerinnen, Unternehmen und Kommunen gleichermaßen.',
  'Transparente Verfahren, offene Daten und nachvollziehbare Entscheidungen sind die Grundlage demokratischer Legitimität.',
  'Digitale Werkzeuge dürfen keine zusätzlichen Hürden schaffen, sondern müssen Abläufe spürbar vereinfachen und beschleunigen.',
] as const

function countWords(html: string): number {
  return html
    .replace(/<[^>]+>/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length
}

/** Fallback body builder when no custom HTML is provided. */
export function buildMotionBody(
  theme: string,
  demand: string,
  style: Exclude<MotionBodyStyle, 'custom'> = 'standard',
): string {
  if (style === 'compact') {
    return [
      `<h2>Kurzfassung</h2>`,
      `<p><strong>${demand}</strong></p>`,
      `<p>${BODY_SENTENCES[0]} Im Kontext von ${theme} brauchen wir pragmatische Schritte.</p>`,
      `<ul><li>Verantwortlichkeiten klären</li><li>Ergebnisse evaluieren</li></ul>`,
    ].join('')
  }

  if (style === 'rich') {
    return [
      `<blockquote><p>${demand}</p></blockquote>`,
      `<p>${BODY_SENTENCES[1]} Für ${theme} gilt das besonders.</p>`,
      `<ol><li>Transparenz</li><li>Pragmatismus</li><li>Subsidiarität</li></ol>`,
      `<p>${demand}</p>`,
    ].join('')
  }

  return [
    `<h2>Motivation</h2>`,
    `<p>${demand}</p>`,
    `<p>${BODY_SENTENCES[2]} Thema: ${theme}.</p>`,
    `<h2>Umsetzung</h2>`,
    `<p>Konkrete Schritte mit messbarer Wirkung statt Symbolpolitik.</p>`,
  ].join('')
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

export const MOOD_TIMELINES_BY_TITLE: Record<string, MoodTimeline[]> = {
  'Gründung in 24 Stunden': [
    { userEmail: 'demo@freiwerk.local', events: [{ choice: 'approve', daysAgo: 9 }, { choice: 'approve', daysAgo: 3 }] },
    { userEmail: 'admin@freiwerk.local', events: [{ choice: 'abstain', daysAgo: 8 }, { choice: 'reject', daysAgo: 2 }] },
    { userEmail: 'anna.schneider@freiwerk.local', events: [{ choice: 'approve', daysAgo: 7 }, { choice: 'reject', daysAgo: 1 }] },
    { userEmail: 'thomas.berger@freiwerk.local', events: [{ choice: 'reject', daysAgo: 6 }] },
    { userEmail: 'lisa.koch@freiwerk.local', events: [{ choice: 'approve', daysAgo: 5 }] },
    { userEmail: 'felix.weber@freiwerk.local', events: [{ choice: 'approve', daysAgo: 4 }] },
    { userEmail: 'julia.hartmann@freiwerk.local', events: [{ choice: 'reject', daysAgo: 4 }, { choice: 'approve', daysAgo: 1 }] },
    { userEmail: 'mark.rothermel@freiwerk.local', events: [{ choice: 'undecided', daysAgo: 3 }, { choice: 'approve', daysAgo: 0 }] },
  ],
  'Digitalpakt verstetigen': [
    { userEmail: 'demo@freiwerk.local', events: [{ choice: 'approve', daysAgo: 3 }] },
    { userEmail: 'lisa.koch@freiwerk.local', events: [{ choice: 'approve', daysAgo: 3 }, { choice: 'approve', daysAgo: 1 }] },
    { userEmail: 'anna.schneider@freiwerk.local', events: [{ choice: 'approve', daysAgo: 2 }] },
    { userEmail: 'admin@freiwerk.local', events: [{ choice: 'approve', daysAgo: 2 }] },
    { userEmail: 'sarah.mueller@freiwerk.local', events: [{ choice: 'abstain', daysAgo: 1 }] },
  ],
  'Klimaneutrale Verwaltung 2030': [
    { userEmail: 'julia.hartmann@freiwerk.local', events: [{ choice: 'approve', daysAgo: 7 }, { choice: 'approve', daysAgo: 1 }] },
    { userEmail: 'felix.weber@freiwerk.local', events: [{ choice: 'abstain', daysAgo: 6 }, { choice: 'approve', daysAgo: 2 }] },
    { userEmail: 'demo@freiwerk.local', events: [{ choice: 'approve', daysAgo: 5 }, { choice: 'abstain', daysAgo: 0 }] },
    { userEmail: 'admin@freiwerk.local', events: [{ choice: 'approve', daysAgo: 3 }] },
  ],
  'Mehr Zuverdienst beim Bürgergeld': [
    { userEmail: 'sarah.mueller@freiwerk.local', events: [{ choice: 'approve', daysAgo: 1 }] },
    { userEmail: 'demo@freiwerk.local', events: [{ choice: 'reject', daysAgo: 1 }, { choice: 'reject', daysAgo: 0 }] },
    { userEmail: 'anna.schneider@freiwerk.local', events: [{ choice: 'reject', daysAgo: 0 }] },
    { userEmail: 'thomas.berger@freiwerk.local', events: [{ choice: 'approve', daysAgo: 0 }] },
  ],
  'Europäische Digitale Identität': [
    { userEmail: 'felix.weber@freiwerk.local', events: [{ choice: 'approve', daysAgo: 4 }, { choice: 'approve', daysAgo: 0 }] },
    { userEmail: 'admin@freiwerk.local', events: [{ choice: 'approve', daysAgo: 3 }] },
    { userEmail: 'demo@freiwerk.local', events: [{ choice: 'abstain', daysAgo: 2 }, { choice: 'approve', daysAgo: 0 }] },
    { userEmail: 'julia.hartmann@freiwerk.local', events: [{ choice: 'reject', daysAgo: 1 }] },
    { userEmail: 'lisa.koch@freiwerk.local', events: [{ choice: 'approve', daysAgo: 0 }] },
  ],
  'Forschungszulage für KMU': [
    { userEmail: 'thomas.berger@freiwerk.local', events: [{ choice: 'approve', daysAgo: 5 }, { choice: 'approve', daysAgo: 1 }] },
    { userEmail: 'felix.weber@freiwerk.local', events: [{ choice: 'approve', daysAgo: 4 }] },
    { userEmail: 'demo@freiwerk.local', events: [{ choice: 'approve', daysAgo: 3 }, { choice: 'abstain', daysAgo: 0 }] },
    { userEmail: 'mark.rothermel@freiwerk.local', events: [{ choice: 'approve', daysAgo: 1 }] },
  ],
  'Kommunale Bürgerforen': [
    { userEmail: 'anna.schneider@freiwerk.local', events: [{ choice: 'approve', daysAgo: 2 }] },
    { userEmail: 'demo@freiwerk.local', events: [{ choice: 'approve', daysAgo: 1 }] },
    { userEmail: 'mark.rothermel@freiwerk.local', events: [{ choice: 'approve', daysAgo: 1 }, { choice: 'approve', daysAgo: 0 }] },
    { userEmail: 'admin@freiwerk.local', events: [{ choice: 'abstain', daysAgo: 0 }] },
  ],
  'Fairer Freihandel mit Nachhaltigkeit': [
    { userEmail: 'lisa.koch@freiwerk.local', events: [{ choice: 'approve', daysAgo: 11 }, { choice: 'reject', daysAgo: 3 }] },
    { userEmail: 'thomas.berger@freiwerk.local', events: [{ choice: 'approve', daysAgo: 10 }] },
    { userEmail: 'demo@freiwerk.local', events: [{ choice: 'reject', daysAgo: 9 }, { choice: 'reject', daysAgo: 1 }] },
    { userEmail: 'admin@freiwerk.local', events: [{ choice: 'approve', daysAgo: 8 }, { choice: 'abstain', daysAgo: 1 }] },
    { userEmail: 'felix.weber@freiwerk.local', events: [{ choice: 'approve', daysAgo: 6 }] },
  ],
  'Prävention digital ausbauen': [
    { userEmail: 'mark.rothermel@freiwerk.local', events: [{ choice: 'approve', daysAgo: 6 }, { choice: 'approve', daysAgo: 0 }] },
    { userEmail: 'sarah.mueller@freiwerk.local', events: [{ choice: 'approve', daysAgo: 5 }] },
    { userEmail: 'demo@freiwerk.local', events: [{ choice: 'abstain', daysAgo: 4 }, { choice: 'approve', daysAgo: 1 }] },
    { userEmail: 'admin@freiwerk.local', events: [{ choice: 'approve', daysAgo: 2 }] },
  ],
  'Public Money, Public Code': [
    { userEmail: 'felix.weber@freiwerk.local', events: [{ choice: 'approve', daysAgo: 20 }, { choice: 'approve', daysAgo: 12 }] },
    { userEmail: 'admin@freiwerk.local', events: [{ choice: 'approve', daysAgo: 18 }] },
    { userEmail: 'demo@freiwerk.local', events: [{ choice: 'abstain', daysAgo: 16 }, { choice: 'approve', daysAgo: 11 }] },
    { userEmail: 'thomas.berger@freiwerk.local', events: [{ choice: 'reject', daysAgo: 15 }] },
  ],
  'Transparenzregister kommunaler Beteiligungen': [
    { userEmail: 'anna.schneider@freiwerk.local', events: [{ choice: 'approve', daysAgo: 40 }, { choice: 'approve', daysAgo: 30 }] },
    { userEmail: 'demo@freiwerk.local', events: [{ choice: 'approve', daysAgo: 38 }] },
    { userEmail: 'mark.rothermel@freiwerk.local', events: [{ choice: 'approve', daysAgo: 36 }] },
    { userEmail: 'admin@freiwerk.local', events: [{ choice: 'approve', daysAgo: 33 }] },
  ],
  'Windenergie-Abstände modernisieren': [
    { userEmail: 'julia.hartmann@freiwerk.local', events: [{ choice: 'approve', daysAgo: 8 }, { choice: 'approve', daysAgo: 1 }] },
    { userEmail: 'demo@freiwerk.local', events: [{ choice: 'abstain', daysAgo: 7 }, { choice: 'reject', daysAgo: 2 }] },
    { userEmail: 'thomas.berger@freiwerk.local', events: [{ choice: 'reject', daysAgo: 6 }] },
    { userEmail: 'admin@freiwerk.local', events: [{ choice: 'approve', daysAgo: 5 }] },
    { userEmail: 'anna.schneider@freiwerk.local', events: [{ choice: 'approve', daysAgo: 3 }] },
  ],
  'Ehrenamtskarte bundesweit': [
    { userEmail: 'felix.weber@freiwerk.local', events: [{ choice: 'approve', daysAgo: 5 }] },
    { userEmail: 'sarah.mueller@freiwerk.local', events: [{ choice: 'approve', daysAgo: 4 }, { choice: 'approve', daysAgo: 1 }] },
    { userEmail: 'demo@freiwerk.local', events: [{ choice: 'approve', daysAgo: 3 }] },
    { userEmail: 'mark.rothermel@freiwerk.local', events: [{ choice: 'abstain', daysAgo: 2 }] },
  ],
  'Kitaplätze verbindlich sichern': [
    { userEmail: 'sarah.mueller@freiwerk.local', events: [{ choice: 'approve', daysAgo: 1 }] },
    { userEmail: 'demo@freiwerk.local', events: [{ choice: 'approve', daysAgo: 0 }] },
  ],
  'KRITIS-Schutz stärken': [
    { userEmail: 'admin@freiwerk.local', events: [{ choice: 'approve', daysAgo: 10 }, { choice: 'approve', daysAgo: 2 }] },
    { userEmail: 'felix.weber@freiwerk.local', events: [{ choice: 'approve', daysAgo: 9 }] },
    { userEmail: 'demo@freiwerk.local', events: [{ choice: 'approve', daysAgo: 8 }, { choice: 'abstain', daysAgo: 1 }] },
    { userEmail: 'julia.hartmann@freiwerk.local', events: [{ choice: 'reject', daysAgo: 5 }] },
    { userEmail: 'thomas.berger@freiwerk.local', events: [{ choice: 'approve', daysAgo: 4 }] },
  ],
  'Wohnungsbau beschleunigen': [
    { userEmail: 'mark.rothermel@freiwerk.local', events: [{ choice: 'approve', daysAgo: 18 }, { choice: 'approve', daysAgo: 10 }] },
    { userEmail: 'anna.schneider@freiwerk.local', events: [{ choice: 'approve', daysAgo: 16 }] },
    { userEmail: 'demo@freiwerk.local', events: [{ choice: 'abstain', daysAgo: 14 }, { choice: 'approve', daysAgo: 9 }] },
    { userEmail: 'sarah.mueller@freiwerk.local', events: [{ choice: 'reject', daysAgo: 12 }] },
    { userEmail: 'admin@freiwerk.local', events: [{ choice: 'approve', daysAgo: 11 }] },
  ],
  'Tempolimit auf Autobahnen abschaffen': [
    { userEmail: 'thomas.berger@freiwerk.local', events: [{ choice: 'approve', daysAgo: 30 }, { choice: 'approve', daysAgo: 20 }] },
    { userEmail: 'demo@freiwerk.local', events: [{ choice: 'reject', daysAgo: 28 }, { choice: 'reject', daysAgo: 19 }] },
    { userEmail: 'julia.hartmann@freiwerk.local', events: [{ choice: 'reject', daysAgo: 25 }] },
    { userEmail: 'admin@freiwerk.local', events: [{ choice: 'reject', daysAgo: 22 }] },
    { userEmail: 'lisa.koch@freiwerk.local', events: [{ choice: 'reject', daysAgo: 20 }] },
  ],
  'Feuerwehr-Funk digitalisieren': [
    { userEmail: 'lisa.koch@freiwerk.local', events: [{ choice: 'approve', daysAgo: 2 }] },
    { userEmail: 'mark.rothermel@freiwerk.local', events: [{ choice: 'approve', daysAgo: 1 }] },
  ],
  'Wasserstoffkernnetz ausbauen': [
    { userEmail: 'anna.schneider@freiwerk.local', events: [{ choice: 'approve', daysAgo: 45 }, { choice: 'approve', daysAgo: 30 }] },
    { userEmail: 'mark.rothermel@freiwerk.local', events: [{ choice: 'approve', daysAgo: 42 }] },
    { userEmail: 'felix.weber@freiwerk.local', events: [{ choice: 'approve', daysAgo: 40 }] },
    { userEmail: 'demo@freiwerk.local', events: [{ choice: 'abstain', daysAgo: 38 }] },
    { userEmail: 'admin@freiwerk.local', events: [{ choice: 'approve', daysAgo: 35 }] },
  ],
  'Landesplanung Wind anpassen': [
    { userEmail: 'julia.hartmann@freiwerk.local', events: [{ choice: 'undecided', daysAgo: 1 }] },
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

export function buildBallotRows(
  motionId: string,
  tally: BallotTally,
  voterIds: string[],
  createdAt: Date,
) {
  const participants: { motionId: string; userId: string; createdAt: Date }[] = []
  const ballots: {
    motionId: string
    choice: 'approve' | 'reject' | 'abstain'
    createdAt: Date
  }[] = []

  const choices: ('approve' | 'reject' | 'abstain')[] = []
  for (const choice of ['approve', 'reject', 'abstain'] as const) {
    for (let i = 0; i < tally[choice]; i++) choices.push(choice)
  }

  choices.forEach((choice, index) => {
    const userId = voterIds[index % voterIds.length]
    if (!userId) return
    participants.push({ motionId, userId, createdAt })
    ballots.push({ motionId, choice, createdAt })
  })

  return { participants, ballots }
}

const MIN_WORDS_BY_STYLE: Record<MotionBodyStyle, number> = {
  compact: 20,
  standard: 30,
  rich: 30,
  custom: 20,
}

export function assertMotionBodyLength(
  html: string,
  title: string,
  style: MotionBodyStyle = 'standard',
): void {
  const minWords = MIN_WORDS_BY_STYLE[style]
  const words = countWords(html)
  if (words < minWords) {
    throw new Error(`Motion "${title}" body has only ${words} words (min ${minWords}).`)
  }
}
