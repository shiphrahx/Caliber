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
  | 'sentiment_drift'
  | 'new_hire_at_risk'
  | 'stale_goal'

export interface Signal {
  type: SignalType
  severity: SignalSeverity
  message: string
  personId?: string
  personName?: string
  entityId: string
  entityType: 'task' | 'person' | 'meeting' | 'follow_up' | 'goal'
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
  sentiment_drift: 4,       // trending negative — notable attention
  new_hire_at_risk: 5,      // new hire triggering 2+ signals — high priority
  stale_goal: 2,            // goal without activity in 60+ days
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

// ─── Team Health Score ────────────────────────────────────────────────────────

/** Deduction values per signal severity for team health score */
export const TEAM_HEALTH_DEDUCTIONS: Record<SignalSeverity, number> = {
  critical: 15,
  warning:  7,
  info:     2,
}

export interface TeamHealthBreakdown {
  tasks: number
  people: number
  followUps: number
  goals: number
}

export interface TeamHealthScore {
  /** 0–100, 100 = perfect health */
  score: number
  /** Human-readable label */
  label: 'Healthy' | 'Needs attention' | 'At risk'
  /** Count of non-info signals per category */
  breakdown: TeamHealthBreakdown
}

const TASK_SIGNAL_TYPES = new Set<SignalType>(['overdue_task', 'upcoming_deadline', 'action_overload', 'unresolved_action'])
const PEOPLE_SIGNAL_TYPES = new Set<SignalType>(['no_recent_1on1', 'no_evidence', 'missing_notes', 'sentiment_drift', 'new_hire_at_risk'])
const FOLLOW_UP_SIGNAL_TYPES = new Set<SignalType>(['overdue_follow_up', 'ageing_follow_up', 'surfaced_follow_up'])
const GOAL_SIGNAL_TYPES = new Set<SignalType>(['stale_goal'])

function signalCategory(type: SignalType): keyof TeamHealthBreakdown | null {
  if (TASK_SIGNAL_TYPES.has(type)) return 'tasks'
  if (PEOPLE_SIGNAL_TYPES.has(type)) return 'people'
  if (FOLLOW_UP_SIGNAL_TYPES.has(type)) return 'followUps'
  if (GOAL_SIGNAL_TYPES.has(type)) return 'goals'
  return null
}

/**
 * Compute a 0-100 team health score from an array of active signals.
 *
 * Score starts at 100. Each signal deducts:
 *   critical → -15, warning → -7, info → -2
 * Floor at 0.
 *
 * Label thresholds: Healthy ≥80, Needs attention 60-79, At risk <60.
 * Breakdown counts non-info signals per category domain.
 */
export function computeTeamHealthScore(signals: Signal[]): TeamHealthScore {
  const deduction = signals.reduce((sum, s) => sum + (TEAM_HEALTH_DEDUCTIONS[s.severity] ?? 0), 0)
  const score = Math.max(0, 100 - deduction)

  const label: TeamHealthScore['label'] =
    score >= 80 ? 'Healthy'
    : score >= 60 ? 'Needs attention'
    : 'At risk'

  const breakdown: TeamHealthBreakdown = { tasks: 0, people: 0, followUps: 0, goals: 0 }
  for (const s of signals) {
    if (s.severity === 'info') continue
    const cat = signalCategory(s.type)
    if (cat) breakdown[cat]++
  }

  return { score, label, breakdown }
}
