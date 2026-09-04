import type { PlanBlock, PriorityItem, FocusContext } from './types'

export function focusContextForBlock(block: PlanBlock): FocusContext {
  return { kind: block.kind, sourceId: block.id, title: block.title, selectedAt: Date.now() }
}

export function focusContextForPriority(item: PriorityItem): FocusContext {
  const kind = item.sourceType === 'application' ? 'application' : item.sourceType === 'learning' ? 'learning' : item.category === 'Personal' ? 'personal' : item.category === 'Academic' ? 'task' : 'task'
  return { kind, sourceId: item.sourceId ?? item.id, title: item.title, selectedAt: Date.now() }
}
