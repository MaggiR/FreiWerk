import type { ActivityItem } from '#shared/types'
import type { ReferenceTargetType } from '~/utils/references'
import { isDeliberationReferenceType } from '~/utils/deliberationNavigation'

export function isActivityTargetClickable(event: ActivityItem): boolean {
  if (!event.targetId || !event.targetType) return false
  if (event.targetType === 'motion') return true
  return isDeliberationReferenceType(event.targetType as ReferenceTargetType)
}

export function activityDeliberationTarget(
  event: ActivityItem,
): { targetType: ReferenceTargetType; targetId: string } | null {
  if (!event.targetId || !event.targetType) return null
  if (!isDeliberationReferenceType(event.targetType as ReferenceTargetType)) return null
  return { targetType: event.targetType as ReferenceTargetType, targetId: event.targetId }
}
