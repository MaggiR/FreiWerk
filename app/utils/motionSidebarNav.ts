import type { SidebarGroup, SidebarSection } from '~/composables/useAppSidebar'
import { MOTION_VIEW_META } from '#shared/constants'
import type { MotionViewId } from '#shared/constants'

const MAIN_TAB_IDS = [
  'antrag',
  'ballot',
  'arguments',
  'questions',
  'mood',
  'resources',
  'versions',
] as const
const PANEL_TAB_IDS = ['debate', 'activity'] as const

type MainTabId = (typeof MAIN_TAB_IDS)[number]

export type MotionTabCountId =
  | 'antrag'
  | 'arguments'
  | 'questions'
  | 'mood'
  | 'resources'
  | 'versions'

export function buildMotionSidebarGroups(options: {
  isDraft: boolean
  isBallot: boolean
  ballotVotingOpen?: boolean
  isDecided: boolean
  activeMainId: string | null
  activePanelId: string | null
  debateUnreadCount?: number
  tabCounts?: Partial<Record<MotionTabCountId, number>>
}): SidebarGroup[] {
  if (options.isDraft) return []

  const mainIds: MainTabId[] = ['antrag']
  if (options.isBallot || options.isDecided) {
    mainIds.push('ballot')
  }
  mainIds.push('arguments', 'questions', 'mood', 'resources', 'versions')

  const mainItems: SidebarSection[] = mainIds.map((id) => ({
    id,
    label: MOTION_VIEW_META[id].label,
    icon: MOTION_VIEW_META[id].icon,
    count: options.tabCounts?.[id as MotionTabCountId],
    active: id === options.activeMainId,
    tone: id === 'ballot' && options.ballotVotingOpen ? 'ballot' : 'main',
  }))

  const panelItems: SidebarSection[] = PANEL_TAB_IDS.map((id) => ({
    id,
    label: MOTION_VIEW_META[id].label,
    icon: MOTION_VIEW_META[id].icon,
    count: id === 'debate' ? options.debateUnreadCount : undefined,
    active: id === options.activePanelId,
    tone: 'panel',
  }))

  return [
    { id: 'motion-main', items: mainItems },
    { id: 'motion-panel', items: panelItems },
  ]
}

export function isMotionViewTab(value: string): value is MotionViewId {
  return (
    value === 'antrag'
    || value === 'ballot'
    || value === 'arguments'
    || value === 'questions'
    || value === 'mood'
    || value === 'resources'
    || value === 'versions'
    || value === 'debate'
    || value === 'activity'
  )
}

export function motionTabStorageKey(motionId: string): string {
  return `freiwerk-motion-tab-${motionId}`
}
