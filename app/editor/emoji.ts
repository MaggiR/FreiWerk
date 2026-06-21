/** Matches strings that contain at least one emoji pictograph. */
export const EMOJI_PATTERN = /\p{Extended_Pictographic}/u

export function textContainsEmoji(text: string): boolean {
  return EMOJI_PATTERN.test(text)
}
