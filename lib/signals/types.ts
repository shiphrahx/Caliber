export type SignalSeverity = 'info' | 'warning' | 'critical'

export type SignalType =
  | 'overdue_task'
  | 'no_recent_1on1'
  | 'unresolved_action'
  | 'no_evidence'
  | 'upcoming_deadline'
  | 'missing_notes'
  | 'overdue_follow_up'
  | 'ageing_follow_up'
  | 'surfaced_follow_up'
  | 'action_overload'

export interface Signal {
  type: SignalType
  severity: SignalSeverity
  message: string
  personId?: string
  personName?: string
  entityId: string
  entityType: 'task' | 'person' | 'meeting' | 'follow_up'
  meta?: Record<string, unknown>
}

/** Weight table — higher = more attention needed */
export const SIGNAL_WEIGHTS: Record<SignalType, number> = {
  no_recent_1on1: 3,        // 14-20 days: warning weight
  overdue_task: 3,
  unresolved_action: 3,
  no_evidence: 2,
  upcoming_deadline: 0,     // info only, no attention weight
  missing_notes: 2,
  overdue_follow_up: 4,
  ageing_follow_up: 3,
  surfaced_follow_up: 5,
  action_overload: 3,
}

/** Critical signals get a bonus weight */
export const CRITICAL_BONUS = 2

export function computeAttentionScore(signals: Signal[]): number {
  return signals.reduce((sum, s) => {
    const base = SIGNAL_WEIGHTS[s.type] ?? 1
    const bonus = s.severity === 'critical' ? CRITICAL_BONUS : 0
    return sum + base + bonus
  }, 0)
}

export function scoreToColor(score: number): string {
  if (score === 0) return '#00f058'
  if (score <= 5) return '#ffd43b'
  if (score <= 10) return '#ffa94d'
  return '#ff6b6b'
}

export function scoreToBg(score: number): string {
  if (score === 0) return '#0d1f14'
  if (score <= 5) return '#2a2508'
  if (score <= 10) return '#2a1a08'
  return '#2a0a0a'
}
