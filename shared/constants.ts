// Shared constants used by both the Nuxt app (forms/labels) and the server
// (Zod validation). German labels are user-facing; keys are English domain terms.

export const TOPICS = [
  'wirtschaft',
  'bildung',
  'digitales',
  'umwelt',
  'soziales',
  'inneres',
  'aussen',
  'finanzen',
  'gesundheit',
  'sonstiges',
] as const

export type Topic = (typeof TOPICS)[number]

export const TOPIC_LABELS: Record<Topic, string> = {
  wirtschaft: 'Wirtschaft',
  bildung: 'Bildung',
  digitales: 'Digitales',
  umwelt: 'Umwelt',
  soziales: 'Soziales',
  inneres: 'Inneres & Recht',
  aussen: 'Außen & Europa',
  finanzen: 'Finanzen',
  gesundheit: 'Gesundheit',
  sonstiges: 'Sonstiges',
}

// Choices counted in charts and aggregate statistics.
export const MOOD_POLL_CHOICES = ['approve', 'reject', 'abstain'] as const

export type MoodPollChoice = (typeof MOOD_POLL_CHOICES)[number]

/** All selectable poll options (undecided is stored but excluded from statistics). */
export const MOOD_CHOICE_VALUES = [...MOOD_POLL_CHOICES, 'undecided'] as const

export type MoodChoiceValue = (typeof MOOD_CHOICE_VALUES)[number]

/** Alias used by Zod validation — accepts all stored enum values. */
export const MOOD_CHOICES = MOOD_CHOICE_VALUES

export const MOOD_LABELS: Record<MoodChoiceValue, string> = {
  approve: 'Zustimmung',
  reject: 'Ablehnung',
  abstain: 'Enthaltung',
  undecided: 'Unentschieden',
}

export const MOOD_COLORS_LIGHT: Record<MoodPollChoice, string> = {
  approve: '#0A9F5E',
  reject: '#D91E36',
  abstain: '#B8C5D6',
}

export const MOOD_COLORS_DARK: Record<MoodPollChoice, string> = {
  approve: '#3CB892',
  reject: '#D45F72',
  abstain: '#9AA3B2',
}

/** @deprecated Use moodColorsForScheme() in theme-aware UI. */
export const MOOD_COLORS = MOOD_COLORS_LIGHT

export function moodColorsForScheme(
  scheme: 'light' | 'dark',
): Record<MoodPollChoice, string> {
  return scheme === 'dark' ? MOOD_COLORS_DARK : MOOD_COLORS_LIGHT
}

export const MOTION_STATUS_LABELS: Record<string, string> = {
  draft: 'Entwurf',
  debate: 'Debatte',
  ballot: 'Abstimmung',
  decided: 'Entschieden',
}

// Selectable options in a formal ballot (secret vote — no "undecided").
export const BALLOT_CHOICES = ['approve', 'reject', 'abstain'] as const

export type BallotChoiceValue = (typeof BALLOT_CHOICES)[number]

export const BALLOT_LABELS: Record<BallotChoiceValue, string> = {
  approve: 'Zustimmung',
  reject: 'Ablehnung',
  abstain: 'Enthaltung',
}

export const MOTION_OUTCOMES = ['accepted', 'rejected'] as const

export type MotionOutcomeValue = (typeof MOTION_OUTCOMES)[number]

export const MOTION_OUTCOME_LABELS: Record<MotionOutcomeValue, string> = {
  accepted: 'Angenommen',
  rejected: 'Abgelehnt',
}

export const ROLE_LABELS: Record<string, string> = {
  member: 'Mitglied',
  moderator: 'Moderator:in',
  admin: 'Administrator:in',
}

// ---------- Phase 5: moderation & reports ----------

export const REPORT_TARGET_LABELS: Record<string, string> = {
  motion: 'Antrag',
  post: 'Debattenbeitrag',
}

export const REPORT_STATUS_LABELS: Record<string, string> = {
  open: 'Offen',
  resolved: 'Bearbeitet',
  dismissed: 'Abgewiesen',
}

export const MODERATION_ACTION_LABELS: Record<string, string> = {
  post_removed: 'Beitrag entfernt',
  user_banned: 'Mitglied gesperrt',
  user_unbanned: 'Sperre aufgehoben',
  report_resolved: 'Meldung bearbeitet',
  report_dismissed: 'Meldung abgewiesen',
  motion_archived: 'Antrag archiviert',
  motion_unarchived: 'Antrag aus Archiv geholt',
  ballot_finalized: 'Abstimmung ausgewertet',
}

// ---------- Phase 6: deliberation ----------

export const ARGUMENT_STANCES = ['pro', 'con'] as const

export type ArgumentStanceValue = (typeof ARGUMENT_STANCES)[number]

export const ARGUMENT_STANCE_LABELS: Record<ArgumentStanceValue, string> = {
  pro: 'Pro',
  con: 'Contra',
}

// Deliberation status of an accepted argument.
export const ARGUMENT_STATUS_LABELS: Record<string, string> = {
  open: 'Offen',
  confirmed: 'Bestätigt',
  refuted: 'Widerlegt',
}

// Approval status shared by author-moderated elements (arguments, resources).
export const PROPOSAL_STATUS_LABELS: Record<string, string> = {
  proposed: 'Vorgeschlagen',
  accepted: 'Angenommen',
  rejected: 'Abgelehnt',
}

export const QUESTION_STATUS_LABELS: Record<string, string> = {
  open: 'Offen',
  partially_answered: 'Teilweise beantwortet',
  answered: 'Beantwortet',
}

export const RESOURCE_KIND_LABELS: Record<string, string> = {
  link: 'Link',
  file: 'Datei',
}

/** Tab ids on the motion detail page (main + side panel). */
export type MotionViewId =
  | 'antrag'
  | 'arguments'
  | 'questions'
  | 'mood'
  | 'resources'
  | 'debate'
  | 'activity'

export const MOTION_VIEW_META: Record<
  MotionViewId,
  { label: string; icon: string }
> = {
  antrag: { label: 'Antrag', icon: 'file-lines' },
  arguments: { label: 'Argumente', icon: 'scale-balanced' },
  questions: { label: 'Fragen', icon: 'circle-question' },
  mood: { label: 'Stimmungsbild', icon: 'chart-pie' },
  resources: { label: 'Ressourcen', icon: 'paperclip' },
  debate: { label: 'Debatte', icon: 'comments' },
  activity: { label: 'Aktivität', icon: 'list-ul' },
}

// Human-readable labels for the per-motion activity feed.
export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  motion_published: 'Antrag veröffentlicht',
  debate_started: 'Debattenphase begonnen',
  motion_version: 'Neue Antragsversion',
  argument_proposed: 'Argument vorgeschlagen',
  argument_accepted: 'Argument angenommen',
  argument_rejected: 'Argument abgelehnt',
  argument_status_changed: 'Argumentstatus geändert',
  question_asked: 'Frage gestellt',
  question_answered: 'Frage beantwortet',
  answer_accepted: 'Antwort akzeptiert',
  resource_proposed: 'Ressource vorgeschlagen',
  resource_accepted: 'Ressource angenommen',
  resource_rejected: 'Ressource abgelehnt',
}

// FontAwesome icon per activity type (all icons are registered in the FA plugin).
export const ACTIVITY_TYPE_ICONS: Record<string, string> = {
  motion_published: 'paper-plane',
  debate_started: 'comments',
  motion_version: 'code-branch',
  argument_proposed: 'scale-balanced',
  argument_accepted: 'circle-check',
  argument_rejected: 'circle-xmark',
  argument_status_changed: 'scale-balanced',
  question_asked: 'circle-question',
  question_answered: 'comment-dots',
  answer_accepted: 'circle-check',
  resource_proposed: 'paperclip',
  resource_accepted: 'circle-check',
  resource_rejected: 'circle-xmark',
}

// Short labels for the kind of element an inline reference points at.
export const REFERENCE_TARGET_LABELS: Record<string, string> = {
  argument: 'Argument',
  question: 'Frage',
  answer: 'Antwort',
  resource: 'Ressource',
  post: 'Beitrag',
  motion_excerpt: 'Antragstext',
}

export const ARGUMENT_TITLE_MIN = 5
export const ARGUMENT_TITLE_MAX = 160
export const QUESTION_TITLE_MIN = 8
export const QUESTION_TITLE_MAX = 200
export const RESOURCE_TITLE_MIN = 3
export const RESOURCE_TITLE_MAX = 160

export const DEFAULT_DEBATE_DAYS = 14

// Default length of a formal ballot window in days (README: 1 week).
export const DEFAULT_BALLOT_DAYS = 7

export const MOTION_TITLE_MIN = 10
export const MOTION_TITLE_MAX = 150
export const MOTION_SUMMARY_MIN = 50
export const MOTION_SUMMARY_MAX = 200
