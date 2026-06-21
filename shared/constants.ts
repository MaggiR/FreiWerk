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

export const DEFAULT_DEBATE_DAYS = 14

// Default length of a formal ballot window in days (README: 1 week).
export const DEFAULT_BALLOT_DAYS = 7

export const MOTION_TITLE_MIN = 10
export const MOTION_TITLE_MAX = 150
export const MOTION_SUMMARY_MIN = 50
export const MOTION_SUMMARY_MAX = 200
