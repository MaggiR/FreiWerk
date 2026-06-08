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

export const ROLE_LABELS: Record<string, string> = {
  member: 'Mitglied',
  moderator: 'Moderator:in',
  admin: 'Administrator:in',
}

export const DEFAULT_DEBATE_DAYS = 14
