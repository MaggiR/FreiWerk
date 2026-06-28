import type { Topic } from '../../shared/constants'
import type { DivisionSlug } from '../../shared/divisions'

export type SeedUser = {
  email: string
  displayName: string
  gender: 'm' | 'f'
  /** 1–5, maps to `public/imgs/profile_{gender}_{n}.png` (one image per seed user). */
  avatarIndex: 1 | 2 | 3 | 4 | 5
  role: 'member' | 'moderator' | 'admin'
  fn: string
  divisionSlug: DivisionSlug
}

/** Static demo avatars in `public/imgs/profile_m_1.png` … `profile_m_5.png` and `profile_f_1.png` … `profile_f_5.png`. */
export const SEED_PROFILE_AVATARS_PER_GENDER = 5

export function seedProfileAvatarUrl(user: Pick<SeedUser, 'gender' | 'avatarIndex'>): string {
  return `/imgs/profile_${user.gender}_${user.avatarIndex}.png`
}

export const SEED_USERS: SeedUser[] = [
  {
    email: 'demo@freiwerk.local',
    displayName: 'Marc Schmidt',
    gender: 'm',
    avatarIndex: 1,
    role: 'member',
    fn: 'Mitglied',
    divisionSlug: 'nrw',
  },
  {
    email: 'admin@freiwerk.local',
    displayName: 'Stefan Hoffmann',
    gender: 'm',
    avatarIndex: 2,
    role: 'admin',
    fn: 'Administrator:in',
    divisionSlug: 'bund',
  },
  {
    email: 'mod@freiwerk.local',
    displayName: 'Mira Becker',
    gender: 'f',
    avatarIndex: 1,
    role: 'moderator',
    fn: 'Moderator:in',
    divisionSlug: 'bund',
  },
  {
    email: 'anna.schneider@freiwerk.local',
    displayName: 'Anna Schneider',
    gender: 'f',
    avatarIndex: 2,
    role: 'member',
    fn: 'Kreisvorsitzende',
    divisionSlug: 'nrw',
  },
  {
    email: 'thomas.berger@freiwerk.local',
    displayName: 'Thomas Berger',
    gender: 'm',
    avatarIndex: 3,
    role: 'member',
    fn: 'Mitglied LFA Wirtschaft',
    divisionSlug: 'bayern',
  },
  {
    email: 'lisa.koch@freiwerk.local',
    displayName: 'Lisa Koch',
    gender: 'f',
    avatarIndex: 3,
    role: 'member',
    fn: 'Mitglied LFA Bildung',
    divisionSlug: 'nrw',
  },
  {
    email: 'felix.weber@freiwerk.local',
    displayName: 'Felix Weber',
    gender: 'm',
    avatarIndex: 4,
    role: 'member',
    fn: 'Mitglied LFA Digitales',
    divisionSlug: 'hessen',
  },
  {
    email: 'julia.hartmann@freiwerk.local',
    displayName: 'Julia Hartmann',
    gender: 'f',
    avatarIndex: 4,
    role: 'member',
    fn: 'Mitglied LFA Umwelt',
    divisionSlug: 'baden-wuerttemberg',
  },
  {
    email: 'niklas.brandt@freiwerk.local',
    displayName: 'Niklas Brandt',
    gender: 'm',
    avatarIndex: 5,
    role: 'member',
    fn: 'Kreisschatzmeister',
    divisionSlug: 'niedersachsen',
  },
  {
    email: 'sarah.mueller@freiwerk.local',
    displayName: 'Sarah Müller',
    gender: 'f',
    avatarIndex: 5,
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
  /** Draft creation date offset; defaults to `now` when omitted. */
  createdDaysAgo?: number
  ballotDays?: number
  ballotStartedDaysAgo?: number
  outcome?: 'accepted' | 'rejected'
  ballotTally?: BallotTally
}

function attachmentChip(href: string, label: string, mime = 'application/pdf'): string {
  return `<a href="${href}" class="attachment-chip attachment-chip__link" data-attachment data-label="${label}" data-mime="${mime}" target="_blank" rel="noopener noreferrer nofollow"><span class="attachment-chip__icon" aria-hidden="true"></span><span class="attachment-chip__label">${label}</span></a>`
}

/** Closing rationale block — plain prose, no extra heading. */
function rationaleParagraph(theme: string, extra?: string): string {
  const tail =
    extra ??
    'Subsidiarität, Transparenz und messbare Wirkung sind dabei Leitplanken. Wir wollen Entscheidungen nachvollziehbar machen und unnötige Hürden abbauen, ohne Qualitätsstandards aufzugeben.'
  return `<p>Im Bereich ${theme} verbinden wir liberale Freiheits- und Verantwortungsideen mit pragmatischer Umsetzung. ${tail}</p>`
}

function prose(...paragraphs: string[]): string {
  return paragraphs.map((text) => `<p>${text}</p>`).join('')
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
    postCount: 20,
    publishedDaysAgo: 12,
    debateDays: 30,
    bodyTheme: 'Unternehmensgründung',
    bodyDemand:
      'Wir fordern ein vollständig digitales Gründungsverfahren mit verbindlicher Entscheidung innerhalb von 24 Stunden.',
    bodyHtml: [
      prose(
        'Wir fordern ein vollständig digitales Gründungsverfahren mit verbindlicher Entscheidung innerhalb von 24 Stunden. Gründerinnen und Gründer sollen Anträge zentral einreichen, Status verfolgen und Bescheide digital entgegennehmen können – ohne Medienbrüche zwischen Notar, Registergericht und Finanzamt.',
        'Heute dauern Gründungen oft Wochen, weil Behörden parallel arbeiten, aber nicht miteinander verbunden sind. Ein One-Stop-Portal würde standardisierte Unterlagen automatisch prüfen, fehlende Angaben sofort zurückmelden und Fristen für jede Stelle verbindlich festlegen.',
        'Gerade Gründerinnen und Gründer ohne etabliertes Netzwerk profitieren von klaren Fristen und nachvollziehbaren Prozessen. Weniger Wartezeit bedeutet schnelleres Testen von Geschäftsideen und weniger Fixkosten in der Startphase.',
      ),
      '<p>Orientierung bietet das ',
      '<a href="https://www.unternehmensregister.de/" target="_blank" rel="noopener noreferrer">Unternehmensregister</a> – ein vergleichbares Modell soll den gesamten Gründungsweg abdecken.</p>',
      `<p>Hintergrund: ${attachmentChip('/uploads/seed-feasibility-study.pdf', 'Kurzstudie Gründungsverfahren')}</p>`,
      rationaleParagraph(
        'Unternehmensgründung',
        'Subsidiarität und Transparenz bleiben Leitplanken: Kommunen und Länder können ergänzen, der Bund garantiert Mindeststandards und messbare Bearbeitungszeiten.',
      ),
    ].join(''),
  },
  {
    authorEmail: 'admin@freiwerk.local',
    title:
      'Digitalpakt Schule verstetigen: dauerhafte Mittel für Netze, Geräte und Lehrkräfte-Fortbildung',
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
      prose(
        'Wir fordern verbindliche Fortbildungsquoten und transparente Gerätezyklen an allen Schulen. Digitalisierung darf nicht am fehlenden Budget oder an unklaren Zuständigkeiten scheitern – Schülerinnen und Schüler brauchen verlässliche Infrastruktur, nicht punktuelle Pilotprojekte.',
        'Der Digitalpakt hat Fortschritte gebracht, endete aber zu oft in Insellösungen. Dauerhafte Mittel würden WLAN-Ausbau, Endgeräte und didaktische Begleitung zusammen planbar machen. Lehrkräfte müssen regelmäßig geschult werden, damit Technik im Unterricht nicht zur Belastung wird.',
        'Transparenz über Gerätealter, Wartungszyklen und Fortbildungsstunden schafft Vergleichbarkeit zwischen Schulträgern und erleichtert die Kommunikation mit Eltern und Schulaufsicht.',
      ),
      '<p>Der ',
      '<a href="https://www.bildungsserver.de/" target="_blank" rel="noopener noreferrer">Deutsche Bildungsserver</a> zeigt: Infrastruktur und Didaktik müssen gemeinsam gedacht werden.</p>',
      rationaleParagraph('digitale Bildung'),
    ].join(''),
  },
  {
    authorEmail: 'demo@freiwerk.local',
    title: 'Open Data',
    summary: 'Offene Verwaltungsdaten als Standard – maschinenlesbar, aktuell und frei nutzbar.',
    topic: 'digitales',
    status: 'draft',
    divisionSlug: 'berlin',
    deliberationLevel: 'none',
    createdDaysAgo: 5,
    bodyTheme: 'Open Data',
    bodyDemand:
      'Wir fordern Open-Data-Standards mit verpflichtender Maschinenlesbarkeit für alle Kommunen.',
    bodyHtml: [
      prose(
        'Wir fordern Open-Data-Standards mit verpflichtender Maschinenlesbarkeit für alle Kommunen. Verwaltungsdaten sollen standardmäßig offen, aktuell und unter freien Lizenzen veröffentlicht werden – nicht nur auf Anfrage oder in PDF-Form.',
        'Bürgerinnen, Bürger, Journalistinnen und Unternehmen profitieren von offenen Daten: Sie ermöglichen neue Dienste, erleichtern Kontrolle und reduzieren Doppelarbeit. Kommunen gewinnen Planungssicherheit, wenn Schnittstellen einheitlich sind.',
        'Metadaten, Qualitätskennzeichnungen und klare Aktualisierungsrhythmen sind Voraussetzung dafür, dass Open Data nicht zur Flickschusterei wird. Der Entwurf sieht schrittweise Einführung und Unterstützung kleinerer Städte vor.',
      ),
      '<p>Vorbild: ',
      '<a href="https://opendata.de/" target="_blank" rel="noopener noreferrer">Open Knowledge Foundation Deutschland</a>.</p>',
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
      prose(
        'Wir fordern Klimaneutralität der Bundesverwaltung bis 2030 mit jährlichem Fortschrittsbericht. Der Staat muss beim Klimaschutz Vorbild sein – durch Energieeffizienz, klimafreundliche Beschaffung und transparente Emissionsbilanzierung über alle Standorte.',
        'Green Procurement kann Marktimpulse setzen, wenn Anforderungen klar, prüfbar und wettbewerbsfähig formuliert sind. Scope-1-, Scope-2- und relevante Scope-3-Emissionen sollen erfasst und veröffentlicht werden; Ausnahmen müssen begründet und zeitlich begrenzt sein.',
        'Jährliche Fortschrittsberichte machen Ziele überprüfbar und erlauben Anpassungen, wenn Maßnahmen nicht greifen. So entsteht Vertrauen, dass Klimaziele ernst gemeint sind und nicht nur auf dem Papier stehen.',
      ),
      '<p>Green Procurement und Energieeffizienz sind zentrale Hebel – siehe ',
      '<a href="https://www.umweltbundesamt.de/" target="_blank" rel="noopener noreferrer">Umweltbundesamt</a>.</p>',
      rationaleParagraph('Klimaschutz in der öffentlichen Verwaltung'),
    ].join(''),
  },
  {
    authorEmail: 'sarah.mueller@freiwerk.local',
    title: 'Bürgergeld-Zuverdienst',
    summary:
      'Höhere Freibeträge, einfache Meldewege und schnellere Vermittlung statt bürokratischer Hürden.',
    topic: 'soziales',
    status: 'debate',
    divisionSlug: 'berlin',
    deliberationLevel: 'rich',
    postCount: 5,
    debateDays: 3,
    publishedDaysAgo: 1,
    bodyTheme: 'Soziale Sicherung',
    bodyDemand:
      'Wir fordern höhere Freibeträge, eine einfache Zuverdienstregel und digitale Meldewege ohne Medienbrüche.',
    bodyHtml: [
      prose(
        'Wir fordern höhere Freibeträge, eine einfache Zuverdienstregel und digitale Meldewege ohne Medienbrüche. Arbeit muss sich lohnen – ohne Angst vor Rückforderungen oder undurchsichtigen Berechnungen.',
        'Viele Betroffene verzichten auf Zuverdienst, weil Meldewege kompliziert sind und Folgen schwer absehbar bleiben. Eine verständliche Freigrenze, klare Fristen und automatische Mitteilungen würden Anreize stärken und Fehlentscheidungen reduzieren.',
        'Jobcenter und Träger brauchen einheitliche IT-Schnittstellen, damit Einkommen einmal gemeldet und überall berücksichtigt wird. Beratung sollte niedrigschwellig erreichbar bleiben, auch für Menschen ohne digitale Routine.',
      ),
      '<p>Informationen zur Arbeitsmarktpolitik: ',
      '<a href="https://www.arbeitsagentur.de/" target="_blank" rel="noopener noreferrer">Bundesagentur für Arbeit</a>.</p>',
      rationaleParagraph(
        'Soziale Sicherung',
        'Anreize zur Erwerbstätigkeit dürfen nicht durch Bürokratie untergraben werden – Transparenz und Einfachheit sind liberaler Kern.',
      ),
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
    postCount: 6,
    debateDays: 30,
    publishedDaysAgo: 5,
    bodyTheme: 'digitale Identität',
    bodyDemand:
      'Wir fordern eine interoperable digitale Identität auf Basis offener Standards und freiwilliger Nutzung.',
    bodyHtml: [
      prose(
        'Wir fordern eine interoperable digitale Identität auf Basis offener Standards und freiwilliger Nutzung. Bürgerinnen und Bürger sollen Behörden- und Privatleistungen digital nutzen können, ohne zentralen Datenspeicher und ohne Zwang zur Wallet-Nutzung.',
        'Die EU-Digitalstrategie mit eIDAS 2.0 bietet den Rahmen – Deutschland soll ihn nutzen, ohne Sicherheit und Datensparsamkeit zu opfern. Wallet-Software soll quelloffen sein, damit unabhängige Prüfung möglich bleibt.',
        'Gleichwertige analoge Wege müssen erhalten bleiben. Dezentrale Speicherung statt zentraler Identitätsstores reduziert Angriffsflächen und stärkt die Kontrolle der Nutzerinnen und Nutzer über ihre Daten.',
      ),
      '<p>Referenz: ',
      '<a href="https://digital-strategy.ec.europa.eu/" target="_blank" rel="noopener noreferrer">EU-Digitalstrategie</a> (eIDAS 2.0).</p>',
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
      prose(
        'Wir fordern eine automatisierte Forschungszulage für KMU und vereinfachte Antragsverfahren. Forschung und Entwicklung sollen sich lohnen, ohne dass kleine Betriebe ganze Abteilungen für Förderanträge aufbauen müssen.',
        'Pauschale Zuschüsse auf Basis nachvollziehbarer Kriterien ersetzen Dutzende Formulare. Schnellere Bescheide geben Planungssicherheit und halten Talente im Unternehmen statt in der Verwaltung.',
        'Bayern und der Bund sollten Modelle abstimmen, damit Unternehmen nicht zwischen widersprüchlichen Regeln navigieren müssen. Evaluierung nach drei Jahren zeigt, ob Ziele erreicht wurden.',
      ),
      '<p>Orientierung bietet die ',
      '<a href="https://www.zim.de/" target="_blank" rel="noopener noreferrer">ZIM-Förderung</a> – ähnliche Logik soll breiter greifen.</p>',
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
      prose(
        'Wir fordern digitale Bürgerforen, modernisierte Satzungen und klare Zuständigkeitsregeln. Kommunale Entscheidungen werden schneller und nachvollziehbarer, wenn Bürgerinnen und Bürger früh und niedrigschwellig einbezogen werden.',
        'NRW braucht Formate, die neben klassischen Sitzungen funktionieren – barrierefrei, zeitlich flexibel und mit klarem Ergebnisprotokoll. Satzungen sollen Beteiligung ermöglichen, nicht ausschließlich regulieren.',
        'Zuständigkeiten zwischen Rat, Verwaltung und Fachgremien müssen transparent sein, damit Foren nicht im luftleeren Raum enden. Digitale Tools ersetzen keine Demokratie, sie erweitern den Zugang dazu.',
      ),
      '<p>Orientiert an ',
      '<a href="https://www.bpb.de/" target="_blank" rel="noopener noreferrer">bpb-Beteiligungsformaten</a>.</p>',
      `<p>Anhang: ${attachmentChip('/uploads/seed-lfa-digital-position.pdf', 'Positionspapier LFA')}</p>`,
      rationaleParagraph('Kommunalrecht'),
    ].join(''),
  },
  {
    authorEmail: 'lisa.koch@freiwerk.local',
    title: 'Freihandel mit Nachhaltigkeit',
    summary: 'Handelsabkommen mit verbindlichen Sozial- und Umweltkapiteln plus KMU-Marktzugang.',
    topic: 'aussen',
    status: 'debate',
    divisionSlug: 'bund',
    deliberationLevel: 'rich',
    postCount: 8,
    debateDays: 28,
    publishedDaysAgo: 12,
    bodyTheme: 'Handelspolitik',
    bodyDemand:
      'Wir fordern Freihandelsabkommen mit verbindlichen Nachhaltigkeits- und Transparenzstandards.',
    bodyHtml: [
      prose(
        'Wir fordern Freihandelsabkommen mit verbindlichen Nachhaltigkeits- und Transparenzstandards. Freihandel ja – aber mit fairen Regeln, die Arbeits-, Umwelt- und Verbraucherschutz nicht untergraben.',
        'Marktzugang für KMU und Schutz hoher Standards gehören zusammen. Abkommen müssen prüfbar sein: Verstöße brauchen Konsequenzen, Verhandlungen Transparenz. Nur so entsteht Akzeptanz jenseits großer Konzerne.',
        'Offene Märkte stärken Wohlstand, wenn Wettbewerb auf Augenhöhe stattfindet. Nachhaltigkeitskapitel dürfen keine Lippenbekenntnisse bleiben – sie brauchen Durchsetzungsmechanismen und öffentliche Berichte.',
      ),
      '<p>Referenz: ',
      '<a href="https://ec.europa.eu/trade/" target="_blank" rel="noopener noreferrer">EU-Handelspolitik</a>.</p>',
      rationaleParagraph(
        'Handelspolitik',
        'Liberaler Freihandel und verantwortungsvolle Rahmenbedingungen schließen einander nicht aus – im Gegenteil.',
      ),
    ].join(''),
  },
  {
    authorEmail: 'niklas.brandt@freiwerk.local',
    title: 'Prävention ausbauen',
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
      prose(
        'Wir fordern ein bundesweites Präventionsbudget und patientenkontrollierte Datennutzung bei DiGAs. Prävention ist günstiger als Behandlung – und entlastet das Gesundheitssystem langfristig.',
        'Flächendeckende Programme brauchen verlässliche Finanzierung statt Projektcharakter. Digitale Gesundheitsangebote müssen sicher, freiwillig und datensparsam sein; Nutzerinnen und Nutzer behalten die Kontrolle über ihre Daten.',
        'DiGAs können niedrigschwellige Hilfe bieten, wenn Qualität und Datenschutz klar geregelt sind. Der Bund soll Mindeststandards setzen, Länder und Krankenkassen passende Angebote entwickeln.',
      ),
      '<p>Mehr zu DiGAs: ',
      '<a href="https://www.bundesgesundheitsministerium.de/" target="_blank" rel="noopener noreferrer">Bundesgesundheitsministerium</a>.</p>',
      rationaleParagraph(
        'Gesundheitsvorsorge',
        'Prävention stärkt Eigenverantwortung und entlastet den Staat – ohne Bevormundung.',
      ),
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
    debateDays: 14,
    publishedDaysAgo: 24,
    ballotDays: 7,
    ballotStartedDaysAgo: 5,
    ballotTally: { approve: 4, reject: 1, abstain: 1 },
    bodyTheme: 'Open Source in der Verwaltung',
    bodyDemand:
      'Wir fordern eine verbindliche Open-Source-Strategie nach dem Grundsatz „Public Money, Public Code“.',
    bodyHtml: [
      prose(
        'Wir fordern eine verbindliche Open-Source-Strategie nach dem Grundsatz „Public Money, Public Code“. Software, die mit Steuergeldern entwickelt wird, soll quelloffen sein und anderen Behörden zur Nachnutzung bereitstehen.',
        'Neue Verwaltungssoftware soll standardmäßig unter offenen Lizenzen veröffentlicht werden. Ausnahmen müssen begründet, dokumentiert und zeitlich überprüft werden – Sicherheitsgründe rechtfertigen kein Dauer-Blackbox-Modell.',
        'Open Source reduziert Lock-in-Effekte, senkt Folgekosten und ermöglicht unabhängige Sicherheitsprüfungen. Kommunen und Länder profitieren von geteilten Komponenten statt paralleler Entwicklung.',
      ),
      '<p>Beispiele und Best Practices: ',
      '<a href="https://publiccode.eu/" target="_blank" rel="noopener noreferrer">Public Code Europe</a>.</p>',
      `<p>${attachmentChip('/uploads/seed-feasibility-study.pdf', 'Umsetzungsstudie OSS')}</p>`,
    ].join(''),
  },
  {
    authorEmail: 'anna.schneider@freiwerk.local',
    title: 'Transparenzregister kommunaler Beteiligungen',
    summary: 'Offenes, maschinenlesbares Register kommunaler Unternehmensbeteiligungen.',
    topic: 'inneres',
    status: 'decided',
    divisionSlug: 'nrw',
    deliberationLevel: 'rich',
    postCount: 7,
    debateDays: 14,
    publishedDaysAgo: 45,
    ballotDays: 7,
    ballotStartedDaysAgo: 21,
    outcome: 'accepted',
    ballotTally: { approve: 6, reject: 2, abstain: 1 },
    bodyTheme: 'Kommunale Transparenz',
    bodyDemand:
      'Wir fordern ein einheitliches, maschinenlesbares Transparenzregister für alle kommunalen Beteiligungen.',
    bodyHtml: [
      prose(
        'Wir fordern ein einheitliches, maschinenlesbares Transparenzregister für alle kommunalen Beteiligungen. Bürgerinnen und Bürger sollen nachvollziehen können, welche Unternehmen Kommunen beteiligt halten und welche wirtschaftlichen Interessen dahinterstehen.',
        'Kontrolle und Vergleichbarkeit stärken Vertrauen in kommunale Wirtschaftlichkeit. Ein Register mit offenen Schnittstellen erleichtert Recherche für Medien, Wissenschaft und engagierte Bürgerinnen und Bürger.',
        'Datenschutz und Geschäftsgeheimnisse bleiben gewahrt, wo gesetzlich vorgesehen – aber Grunddaten zu Beteiligungen, Anteilen und Geschäftsführung gehören in die Öffentlichkeit.',
      ),
      `<p>${attachmentChip('/uploads/seed-lfa-digital-position.pdf', 'Musterregister (PDF)')}</p>`,
    ].join(''),
  },
  {
    authorEmail: 'julia.hartmann@freiwerk.local',
    title: 'Windabstände reformieren',
    summary:
      'Planungsrecht an neue Technik anpassen, Abstände kommunalfreundlich gestalten und Genehmigungen beschleunigen.',
    topic: 'umwelt',
    status: 'debate',
    divisionSlug: 'hessen',
    deliberationLevel: 'rich',
    postCount: 5,
    debateDays: 18,
    publishedDaysAgo: 9,
    bodyTheme: 'Erneuerbare Energien',
    bodyDemand:
      'Wir fordern eine Reform der Abstandsregeln mit kommunaler Mitbestimmung und schnelleren Genehmigungsverfahren.',
    bodyHtml: [
      prose(
        'Wir fordern eine Reform der Abstandsregeln mit kommunaler Mitbestimmung und schnelleren Genehmigungsverfahren. Windkraft ist zentral für Klimaziele – aber Akzeptanz entsteht nur durch faire Regeln und transparente Planung.',
        'Abstände sollten an Rotordurchmesser, Lärmschutz und Standortqualität gekoppelt werden, statt pauschaler Mindestwerte. Kommunen brauchen Planungshoheit bei Standortpaketen und Ausgleichsmechanismen für Anwohnerinnen und Anwohner.',
        'Bürgerbeteiligung muss vor Festlegung von Flächen stattfinden, nicht erst im Einzelverfahren. Schnellere Genehmigungen sind möglich, wenn Konflikte früh geklärt werden und Verfahren digitalisiert sind.',
      ),
      '<p>Windkraft und Energiewende: ',
      '<a href="https://www.bmwk.de/" target="_blank" rel="noopener noreferrer">BMWK Energiewende</a>.</p>',
      rationaleParagraph(
        'Windenergie',
        'Akzeptanz entsteht durch Transparenz, faire Ausgleichsmechanismen und kommunale Mitbestimmung.',
      ),
    ].join(''),
  },
  {
    authorEmail: 'felix.weber@freiwerk.local',
    title: 'Ehrenamtskarte',
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
      prose(
        'Wir fordern eine bundesweit gültige Ehrenamtskarte mit digitalen Services und kommunalen Anerkennungsangeboten. Ehrenamt darf nicht an Bürokratie scheitern – Engagierte brauchen einen einfachen, fälschungssicheren Nachweis ihrer Tätigkeit.',
        'Viele Länder haben Piloten gestartet; ein Bund-Länder-Standard würde Entlastung schaffen und Vergünstigungen planbar machen. Kommunen definieren freiwillige Anerkennungsangebote, der Bund stellt die technische Infrastruktur bereit.',
        'Datenschutz by Design ist Pflicht: Die Karte belegt Engagement, ohne sensible Details unnötig preiszugeben. Offline-Nutzung und barrierefreie Antragstellung bleiben möglich.',
      ),
      rationaleParagraph('Ehrenamt'),
    ].join(''),
  },
  {
    authorEmail: 'sarah.mueller@freiwerk.local',
    title:
      'Rechtsanspruch auf Kitaplätze mit verbindlichen Fristen und transparentem Monitoring',
    summary:
      'Rechtsanspruch mit klaren Fristen, besserer Personalgewinnung und transparentem Kita-Monitoring.',
    topic: 'soziales',
    status: 'debate',
    divisionSlug: 'berlin',
    deliberationLevel: 'minimal',
    postCount: 1,
    debateDays: 28,
    publishedDaysAgo: 0,
    bodyTheme: 'Frühkindliche Bildung',
    bodyDemand:
      'Wir fordern verbindliche Kitaplätze innerhalb definierter Fristen und ein öffentliches Monitoring der Versorgung.',
    bodyHtml: [
      prose(
        'Wir fordern verbindliche Kitaplätze innerhalb definierter Fristen und ein öffentliches Monitoring der Versorgung. Eltern brauchen Planbarkeit – nicht Wartelisten ohne Perspektive und nicht unterschiedliche Standards von Bezirk zu Bezirk.',
        'Ein Rechtsanspruch ohne Durchsetzung bleibt wirkungslos. Deshalb brauchen klare Fristen, Sanktionen bei Verzug und ein Dashboard, das Versorgungsquoten, Personaldecke und Wartezeiten transparent macht.',
        'Kommunen brauchen Unterstützung bei Personalgewinnung und Infrastruktur. Bund und Länder müssen Finanzierung und Qualitätsstandards abstimmen, damit Chancengleichheit nicht am Geld scheitert.',
      ),
      rationaleParagraph(
        'Kitabetreuung',
        'Chancengleichheit beginnt vor der Schule – verlässliche Betreuung entlastet Familien und stärkt den Arbeitsmarkt.',
      ),
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
    postCount: 6,
    debateDays: 14,
    publishedDaysAgo: 11,
    bodyTheme: 'Cybersicherheit',
    bodyDemand:
      'Wir fordern verbindliche Sicherheitsstandards für KRITIS-Betreiber mit unabhängigen Audits und Bußgeldern bei Nachlässigkeit.',
    bodyHtml: [
      prose(
        'Wir fordern verbindliche Sicherheitsstandards für KRITIS-Betreiber mit unabhängigen Audits und Bußgeldern bei Nachlässigkeit. Kritische Infrastruktur – Energie, Wasser, Gesundheit, Verkehr – darf nicht auf Kosten kurzfristiger Einsparungen unsicher werden.',
        'Das BSI veröffentlicht Leitlinien; sie müssen verbindlich werden. Regelmäßige Penetrationstests, dokumentierte Notfallpläne und Meldepflicht bei Sicherheitsvorfällen innerhalb von 24 Stunden sind Mindeststandard.',
        'Mittelstandslieferanten brauchen Förderung und Beratung, damit sie Anforderungen erfüllen können, ohne ausgeschlossen zu werden. Sicherheit ist keine Luxusfrage, sondern Voraussetzung für Vertrauen in digitale Dienste.',
      ),
      '<p>Leitlinien und Standards: ',
      '<a href="https://www.bsi.bund.de/" target="_blank" rel="noopener noreferrer">BSI</a>.</p>',
      `<p>${attachmentChip('/uploads/seed-feasibility-study.pdf', 'Audit-Checkliste KRITIS')}</p>`,
      rationaleParagraph('Cybersicherheit'),
    ].join(''),
  },
  {
    authorEmail: 'niklas.brandt@freiwerk.local',
    title: 'Wohnungsbau beschleunigen',
    summary:
      'Genehmigungen straffen, Standardisierung fördern und Kommunen bei Baulandaktivierung unterstützen.',
    topic: 'inneres',
    status: 'ballot',
    divisionSlug: 'nrw',
    deliberationLevel: 'moderate',
    postCount: 6,
    debateDays: 10,
    publishedDaysAgo: 20,
    ballotDays: 5,
    ballotStartedDaysAgo: 3,
    ballotTally: { approve: 5, reject: 3, abstain: 1 },
    bodyTheme: 'Wohnungsmarkt',
    bodyDemand:
      'Wir fordern ein Beschleunigungsgesetz für Wohnungsbau mit digitalen Genehmigungsverfahren und Vorrang für verdichtete Projekte.',
    bodyHtml: [
      prose(
        'Wir fordern ein Beschleunigungsgesetz für Wohnungsbau mit digitalen Genehmigungsverfahren und Vorrang für verdichteter Projekte. Bezahlbarer Wohnraum erfordert schnellere Planung ohne Qualitätsverlust – nicht weniger Bürgerbeteiligung, sondern klarere Verfahren.',
        'Standardisierte Bauweise und wiederkehrende Bauelemente können Genehmigungen beschleunigen, wenn Sicherheits- und Umweltstandards gewahrt bleiben. Kommunale Baulandoffensive bringt brachliegende Flächen in die Entwicklung.',
        'Digitale Antragstellung, einheitliche Formate und feste Bearbeitungsfristen reduzieren Wartezeiten. Nach drei Jahren soll eine Evaluation zeigen, ob mehr Wohnraum bei gleichbleibender Qualität entstanden ist.',
      ),
      rationaleParagraph('Wohnungsmarkt'),
    ].join(''),
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
    debateDays: 7,
    publishedDaysAgo: 35,
    ballotDays: 5,
    ballotStartedDaysAgo: 18,
    outcome: 'rejected',
    ballotTally: { approve: 2, reject: 7, abstain: 1 },
    bodyTheme: 'Verkehrspolitik',
    bodyDemand:
      'Wir fordern die Abschaffung genereller Tempolimits auf Autobahnen zugunsten dynamischer, verkehrsabhängiger Regelungen.',
    bodyHtml: [
      prose(
        'Wir fordern die Abschaffung genereller Tempolimits auf Autobahnen zugunsten dynamischer, verkehrsabhängiger Regelungen. Freie Fahrt dort, wo es die Situation erlaubt, stärkt Akzeptanz und Effizienz – pauschale Limits greifen oft zu grob.',
        'Moderne Assistenzsysteme, Verkehrsdaten und wetterabhängige Steuerung ermöglichen sicherere Geschwindigkeiten als starre Vorgaben. Entscheidungen sollten Daten und lokale Gegebenheiten berücksichtigen, nicht Ideologie.',
        'Der Beschluss wurde abgelehnt – die Debatte zeigt aber, dass Verkehrspolitik zwischen Freiheit, Sicherheit und Klimazielen ausgewogen bleiben muss.',
      ),
      rationaleParagraph(
        'Verkehrspolitik',
        'Entscheidungen sollten Daten und lokale Gegebenheiten berücksichtigen – nicht pauschale Regeln ohne Blick auf die Realität.',
      ),
    ].join(''),
  },
  {
    authorEmail: 'lisa.koch@freiwerk.local',
    title:
      'Digitale BOS-Funknetze für Feuerwehr und Rettungsdienste bundesweit interoperabel',
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
      prose(
        'Wir fordern ein digitales Funksystem für Feuerwehr und Rettungsdienste mit bundesweit kompatiblen Standards. Analogfunk ist am Limit – Einsatzkräfte brauchen zuverlässige Sprach- und Datenübertragung, auch unter Extrembedingungen.',
        'Großschadenslagen und länderübergreifende Hilfe scheitern, wenn Funknetze nicht zusammenarbeiten. Ein einheitlicher Standard mit getesteter Interoperabilität spart Leben und vereinfacht Ausbildung.',
        'Finanzierung muss Bund und Länder fair teilen; kleine Wehrverbände dürfen nicht allein auf Kosten sitzen bleiben. Datenschutz und Verschlüsselung sind Pflicht, ohne Einsatzfähigkeit zu gefährden.',
      ),
      rationaleParagraph('Katastrophenschutz'),
    ].join(''),
  },
  {
    authorEmail: 'demo@freiwerk.local',
    title: 'Once-Only für Sozialleistungen',
    summary:
      'Entwurf für ein Once-Only-Prinzip bei Anträgen und automatische Weiterleitung nachgewiesener Daten.',
    topic: 'soziales',
    status: 'draft',
    divisionSlug: 'hamburg',
    deliberationLevel: 'none',
    createdDaysAgo: 3,
    bodyTheme: 'Verwaltungsdigitalisierung',
    bodyDemand:
      'Wir fordern das Once-Only-Prinzip für Sozialleistungen mit sicheren Datentreuhändern.',
    bodyHtml: [
      prose(
        'Wir fordern das Once-Only-Prinzip für Sozialleistungen mit sicheren Datentreuhändern. Bürgerinnen und Bürger sollen Nachweise nicht dutzende Male einreichen müssen – einmal eingereicht, überall berücksichtigt.',
        'Datensparsamkeit, freiwillige Nutzung und eine gleichwertige Offline-Alternative sind zwingend. Der Staat darf Digitalisierung nicht als Zwang verstehen, sondern als Entlastung.',
        'Datentreuhänder unter staatlicher Aufsicht können Daten sicher weiterleiten, ohne zentralen Datenspeicher. Der Entwurf wird noch mit Datenschutzbeauftragten und Trägern abgestimmt.',
      ),
    ].join(''),
  },
  {
    authorEmail: 'anna.schneider@freiwerk.local',
    title: 'H2-Kernnetz',
    summary:
      'Gezielte Investitionen in H2-Infrastruktur für Industrie und Schwerlastverkehr mit klarer Förderlogik.',
    topic: 'wirtschaft',
    status: 'decided',
    divisionSlug: 'niedersachsen',
    deliberationLevel: 'rich',
    postCount: 6,
    debateDays: 21,
    publishedDaysAgo: 50,
    ballotDays: 7,
    ballotStartedDaysAgo: 25,
    outcome: 'accepted',
    ballotTally: { approve: 7, reject: 2, abstain: 0 },
    bodyTheme: 'Energiewirtschaft',
    bodyDemand:
      'Wir fordern den bundesweiten Ausbau eines Wasserstoffkernnetzes mit marktwirtschaftlicher Förderung und Technologieoffenheit.',
    bodyHtml: [
      prose(
        'Wir fordern den bundesweiten Ausbau eines Wasserstoffkernnetzes mit marktwirtschaftlicher Förderung und Technologieoffenheit. Industriestandorte an der Küste und im Binnenland brauchen planbare Anschlüsse für grünen Wasserstoff.',
        'Schwerlastverkehr und energieintensive Produktion können so klimaneutraler werden, wenn Infrastruktur rechtzeitig verfügbar ist. Förderlogik muss transparent sein und Wettbewerb zulassen – keine Dauer-Subvention ohne Wirkungskontrolle.',
        'Der Antrag wurde angenommen. Nächste Schritte: Leitungsplanung, Netztransparenz und Abstimmung mit Erneuerbare-Energien-Ausbau.',
      ),
      '<p>Referenz: ',
      '<a href="https://www.netztransparenz.de/" target="_blank" rel="noopener noreferrer">Netztransparenz</a>.</p>',
      `<p>${attachmentChip('/uploads/seed-lfa-digital-position.pdf', 'Infrastrukturkarte H2')}</p>`,
      rationaleParagraph('Wasserstoffwirtschaft'),
    ].join(''),
  },
  {
    authorEmail: 'julia.hartmann@freiwerk.local',
    title:
      'Schleswig-Holstein: regionale Flächenkulisse für Windenergie mit kommunaler Mitwirkung',
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
      prose(
        'Wir fordern eine landesweite Flächenkulisse für Windenergie mit kommunaler Mitwirkung. Planungssicherheit reduziert Konflikte um Einzelstandorte und beschleunigt den Ausbau erneuerbarer Energien in Schleswig-Holstein.',
        'Regionale Festlegungen ersetzen nicht Bürgerbeteiligung, sondern strukturieren sie. Kommunen sollen früh mitbestimmen, welche Gebiete für Windenergie in Frage kommen und welche Ausgleichsmechanismen gelten.',
        'Das Land profitiert als Energie-Exporteur, wenn Genehmigungen planbar werden und Netzanbindungen synchron geplant sind. Der Antrag liegt frisch vor und wartet auf breitere Debatte.',
      ),
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
      `<p>Im Kontext von ${theme} brauchen wir pragmatische Schritte mit messbarer Wirkung.</p>`,
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
    { userEmail: 'niklas.brandt@freiwerk.local', events: [{ choice: 'undecided', daysAgo: 3 }, { choice: 'approve', daysAgo: 0 }] },
  ],
  'Digitalpakt Schule verstetigen: dauerhafte Mittel für Netze, Geräte und Lehrkräfte-Fortbildung': [
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
  'Bürgergeld-Zuverdienst': [
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
    { userEmail: 'niklas.brandt@freiwerk.local', events: [{ choice: 'approve', daysAgo: 1 }] },
  ],
  'Kommunale Bürgerforen': [
    { userEmail: 'anna.schneider@freiwerk.local', events: [{ choice: 'approve', daysAgo: 2 }] },
    { userEmail: 'demo@freiwerk.local', events: [{ choice: 'approve', daysAgo: 1 }] },
    { userEmail: 'niklas.brandt@freiwerk.local', events: [{ choice: 'approve', daysAgo: 1 }, { choice: 'approve', daysAgo: 0 }] },
    { userEmail: 'admin@freiwerk.local', events: [{ choice: 'abstain', daysAgo: 0 }] },
  ],
  'Freihandel mit Nachhaltigkeit': [
    { userEmail: 'demo@freiwerk.local', events: [{ choice: 'reject', daysAgo: 11 }, { choice: 'approve', daysAgo: 1 }] },
    { userEmail: 'lisa.koch@freiwerk.local', events: [{ choice: 'reject', daysAgo: 10 }, { choice: 'approve', daysAgo: 2 }] },
    { userEmail: 'thomas.berger@freiwerk.local', events: [{ choice: 'approve', daysAgo: 9 }] },
    { userEmail: 'felix.weber@freiwerk.local', events: [{ choice: 'abstain', daysAgo: 8 }, { choice: 'approve', daysAgo: 3 }] },
    { userEmail: 'julia.hartmann@freiwerk.local', events: [{ choice: 'reject', daysAgo: 7 }, { choice: 'approve', daysAgo: 0 }] },
    { userEmail: 'admin@freiwerk.local', events: [{ choice: 'approve', daysAgo: 6 }, { choice: 'reject', daysAgo: 1 }] },
    { userEmail: 'anna.schneider@freiwerk.local', events: [{ choice: 'approve', daysAgo: 5 }, { choice: 'reject', daysAgo: 0 }] },
    { userEmail: 'sarah.mueller@freiwerk.local', events: [{ choice: 'approve', daysAgo: 4 }, { choice: 'reject', daysAgo: 2 }] },
    { userEmail: 'niklas.brandt@freiwerk.local', events: [{ choice: 'approve', daysAgo: 3 }, { choice: 'reject', daysAgo: 1 }] },
    { userEmail: 'mod@freiwerk.local', events: [{ choice: 'approve', daysAgo: 2 }, { choice: 'reject', daysAgo: 0 }] },
  ],
  'Prävention ausbauen': [
    { userEmail: 'niklas.brandt@freiwerk.local', events: [{ choice: 'approve', daysAgo: 6 }, { choice: 'approve', daysAgo: 0 }] },
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
    { userEmail: 'niklas.brandt@freiwerk.local', events: [{ choice: 'approve', daysAgo: 36 }] },
    { userEmail: 'admin@freiwerk.local', events: [{ choice: 'approve', daysAgo: 33 }] },
  ],
  'Windabstände reformieren': [
    { userEmail: 'julia.hartmann@freiwerk.local', events: [{ choice: 'approve', daysAgo: 8 }, { choice: 'approve', daysAgo: 1 }] },
    { userEmail: 'demo@freiwerk.local', events: [{ choice: 'abstain', daysAgo: 7 }, { choice: 'reject', daysAgo: 2 }] },
    { userEmail: 'thomas.berger@freiwerk.local', events: [{ choice: 'reject', daysAgo: 6 }] },
    { userEmail: 'admin@freiwerk.local', events: [{ choice: 'approve', daysAgo: 5 }] },
    { userEmail: 'anna.schneider@freiwerk.local', events: [{ choice: 'approve', daysAgo: 3 }] },
  ],
  'Ehrenamtskarte': [
    { userEmail: 'felix.weber@freiwerk.local', events: [{ choice: 'approve', daysAgo: 5 }] },
    { userEmail: 'sarah.mueller@freiwerk.local', events: [{ choice: 'approve', daysAgo: 4 }, { choice: 'approve', daysAgo: 1 }] },
    { userEmail: 'demo@freiwerk.local', events: [{ choice: 'approve', daysAgo: 3 }] },
    { userEmail: 'niklas.brandt@freiwerk.local', events: [{ choice: 'abstain', daysAgo: 2 }] },
  ],
  'Rechtsanspruch auf Kitaplätze mit verbindlichen Fristen und transparentem Monitoring': [
    { userEmail: 'sarah.mueller@freiwerk.local', events: [{ choice: 'approve', daysAgo: 0 }] },
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
    { userEmail: 'niklas.brandt@freiwerk.local', events: [{ choice: 'approve', daysAgo: 18 }, { choice: 'approve', daysAgo: 10 }] },
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
  'Digitale BOS-Funknetze für Feuerwehr und Rettungsdienste bundesweit interoperabel': [
    { userEmail: 'lisa.koch@freiwerk.local', events: [{ choice: 'approve', daysAgo: 2 }] },
    { userEmail: 'niklas.brandt@freiwerk.local', events: [{ choice: 'approve', daysAgo: 1 }] },
  ],
  'H2-Kernnetz': [
    { userEmail: 'anna.schneider@freiwerk.local', events: [{ choice: 'approve', daysAgo: 45 }, { choice: 'approve', daysAgo: 30 }] },
    { userEmail: 'niklas.brandt@freiwerk.local', events: [{ choice: 'approve', daysAgo: 42 }] },
    { userEmail: 'felix.weber@freiwerk.local', events: [{ choice: 'approve', daysAgo: 40 }] },
    { userEmail: 'demo@freiwerk.local', events: [{ choice: 'abstain', daysAgo: 38 }] },
    { userEmail: 'admin@freiwerk.local', events: [{ choice: 'approve', daysAgo: 35 }] },
  ],
  'Schleswig-Holstein: regionale Flächenkulisse für Windenergie mit kommunaler Mitwirkung': [
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
