export interface SidebarSection {
  id: string
  label: string
  icon: string
  count?: number
  active?: boolean
  /** When set, the entry navigates to this route instead of calling `select`. */
  to?: string
  /** Visual tone of the entry; defaults to the standard accent. */
  tone?: 'main' | 'panel' | 'ballot'
}

export interface SidebarGroup {
  id: string
  items: SidebarSection[]
}

// Module-level singletons. All mutation happens client-side (page onMounted /
// watchers), so the server render never registers page sections and there is no
// cross-request state leakage.
const expanded = ref(false)
const groups = ref<SidebarGroup[]>([])
let selectHandler: ((id: string) => void) | null = null

/**
 * Shared state between the global `AppSidebar` and the current page. Pages can
 * register contextual section entries (e.g. the motion views) that render below
 * the global navigation; the sidebar owns the collapsed/expanded state.
 */
export function useAppSidebar() {
  return {
    expanded,
    groups,
    setGroups(next: SidebarGroup[]) {
      groups.value = next
    },
    clearGroups() {
      groups.value = []
    },
    setSelectHandler(fn: ((id: string) => void) | null) {
      selectHandler = fn
    },
    select(id: string) {
      selectHandler?.(id)
    },
  }
}
