export type DebateMessageMenuAction =
  | 'reply'
  | 'quote'
  | 'edit'
  | 'delete'
  | 'copy'
  | 'save'
  | 'report'

export interface DebateMessageMenuItem {
  action: DebateMessageMenuAction
  label: string
  icon: string
  danger?: boolean
}
