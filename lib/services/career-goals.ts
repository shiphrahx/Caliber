import { createClient } from '@/lib/supabase/client'

// ============================================================================
// TYPES
// ============================================================================

export interface CareerGoalsProfile {
  id: string
  whereYouAre: string
  whereYouWantToGo: string
  createdAt: string
  updatedAt: string
}

export interface GapAnalysisCategory {
  id: string
  category: string
  currentState: string
  desiredState: string
  displayOrder: number
  createdAt: string
  updatedAt: string
}

export interface FocusDistribution {
  id: string
  timePeriod: 'short_term' | 'mid_term' | 'long_term'
  categoryId: string
  category: string
  focusPercent: number
  why: string
  createdAt: string
  updatedAt: string
}

export interface CareerGoal {
  id: string
  timePeriod: 'short_term' | 'mid_term' | 'long_term'
  goal: string
  type: 'Core' | 'Stretch'
  categoryId: string
  category: string
  status: 'Not started' | 'In progress' | 'Completed'
  displayOrder: number
  createdAt: string
  updatedAt: string
}

export interface Achievement {
  id: string
  type: 'Book' | 'Course' | 'Certification' | 'Conference' | 'Talk' | 'Other'
  description: string
  achievementDate: string
  keyTakeaway: string
  createdAt: string
  updatedAt: string
}

// Minimal local row types for tables not yet in types.ts
type ProfileRow = { id: string; where_you_are: string | null; where_you_want_to_go: string | null; created_at: string; updated_at: string }
type CategoryRow = { id: string; category: string; current_state: string | null; desired_state: string | null; display_order: number | null; created_at: string; updated_at: string }
type DistRow = { id: string; time_period: string; category_id: string; focus_percent: number | null; why: string | null; created_at: string; updated_at: string; gap_analysis_categories: { category: string } | null }
type GoalRow = { id: string; time_period: string; goal: string; type: string; category_id: string; status: string; display_order: number | null; created_at: string; updated_at: string; gap_analysis_categories: { category: string } | null }
type AchievementRow = { id: string; type: string; description: string; achievement_date: string; key_takeaway: string | null; created_at: string; updated_at: string }

// ============================================================================
// CAREER GOALS PROFILE
// ============================================================================

export async function getCareerGoalsProfile(): Promise<CareerGoalsProfile | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('career_goals_profiles')
    .select('*')
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  if (!data) return null

  const row = data as unknown as ProfileRow
  return {
    id: row.id,
    whereYouAre: row.where_you_are ?? '',
    whereYouWantToGo: row.where_you_want_to_go ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function upsertCareerGoalsProfile(
  profile: Partial<CareerGoalsProfile>
): Promise<CareerGoalsProfile> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('career_goals_profiles')
    .upsert({
      where_you_are: profile.whereYouAre,
      where_you_want_to_go: profile.whereYouWantToGo,
      owning_user_id: user.id,
    }, { onConflict: 'owning_user_id' })
    .select()
    .single()

  if (error) throw error

  const row = data as unknown as ProfileRow
  return {
    id: row.id,
    whereYouAre: row.where_you_are ?? '',
    whereYouWantToGo: row.where_you_want_to_go ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// ============================================================================
// GAP ANALYSIS CATEGORIES
// ============================================================================

export async function getGapAnalysisCategories(): Promise<GapAnalysisCategory[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('gap_analysis_categories')
    .select('*')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) throw error

  return (data ?? []).map((r) => {
    const row = r as unknown as CategoryRow
    return {
      id: row.id,
      category: row.category,
      currentState: row.current_state ?? '',
      desiredState: row.desired_state ?? '',
      displayOrder: row.display_order ?? 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  })
}

export async function createGapAnalysisCategory(
  category: Omit<GapAnalysisCategory, 'id' | 'createdAt' | 'updatedAt'>
): Promise<GapAnalysisCategory> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('gap_analysis_categories')
    .insert({
      category: category.category,
      current_state: category.currentState,
      desired_state: category.desiredState,
      display_order: category.displayOrder,
      owning_user_id: user.id,
    })
    .select()
    .single()

  if (error) throw error

  const row = data as unknown as CategoryRow
  return {
    id: row.id,
    category: row.category,
    currentState: row.current_state ?? '',
    desiredState: row.desired_state ?? '',
    displayOrder: row.display_order ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function updateGapAnalysisCategory(
  id: string,
  updates: Partial<GapAnalysisCategory>
): Promise<GapAnalysisCategory> {
  const supabase = createClient()

  const dbUpdates: Record<string, unknown> = {}
  if (updates.category !== undefined) dbUpdates.category = updates.category
  if (updates.currentState !== undefined) dbUpdates.current_state = updates.currentState
  if (updates.desiredState !== undefined) dbUpdates.desired_state = updates.desiredState
  if (updates.displayOrder !== undefined) dbUpdates.display_order = updates.displayOrder

  const { data, error } = await supabase
    .from('gap_analysis_categories')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  const row = data as unknown as CategoryRow
  return {
    id: row.id,
    category: row.category,
    currentState: row.current_state ?? '',
    desiredState: row.desired_state ?? '',
    displayOrder: row.display_order ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function deleteGapAnalysisCategory(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('gap_analysis_categories').delete().eq('id', id)
  if (error) throw error
}

// ============================================================================
// FOCUS DISTRIBUTIONS
// ============================================================================

export async function getFocusDistributions(
  timePeriod: 'short_term' | 'mid_term' | 'long_term'
): Promise<FocusDistribution[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('focus_distributions')
    .select(`*, gap_analysis_categories!inner(category)`)
    .eq('time_period', timePeriod)

  if (error) throw error

  return (data ?? []).map((r) => {
    const row = r as unknown as DistRow
    return {
      id: row.id,
      timePeriod: row.time_period as FocusDistribution['timePeriod'],
      categoryId: row.category_id,
      category: row.gap_analysis_categories?.category ?? '',
      focusPercent: row.focus_percent ?? 0,
      why: row.why ?? '',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  })
}

export async function upsertFocusDistribution(
  distribution: Omit<FocusDistribution, 'id' | 'category' | 'createdAt' | 'updatedAt'>
): Promise<FocusDistribution> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Clamp focus_percent to valid range
  const focusPercent = Math.max(0, Math.min(100, distribution.focusPercent))

  const { data, error } = await supabase
    .from('focus_distributions')
    .upsert({
      time_period: distribution.timePeriod,
      category_id: distribution.categoryId,
      focus_percent: focusPercent,
      why: distribution.why,
      owning_user_id: user.id,
    }, { onConflict: 'category_id,time_period' })
    .select(`*, gap_analysis_categories!inner(category)`)
    .single()

  if (error) throw error

  const row = data as unknown as DistRow
  return {
    id: row.id,
    timePeriod: row.time_period as FocusDistribution['timePeriod'],
    categoryId: row.category_id,
    category: row.gap_analysis_categories?.category ?? '',
    focusPercent: row.focus_percent ?? 0,
    why: row.why ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// ============================================================================
// CAREER GOALS
// ============================================================================

export async function getCareerGoals(
  timePeriod: 'short_term' | 'mid_term' | 'long_term'
): Promise<CareerGoal[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('career_goals')
    .select(`*, gap_analysis_categories!inner(category)`)
    .eq('time_period', timePeriod)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) throw error

  return (data ?? []).map((r) => {
    const row = r as unknown as GoalRow
    return {
      id: row.id,
      timePeriod: row.time_period as CareerGoal['timePeriod'],
      goal: row.goal,
      type: row.type as CareerGoal['type'],
      categoryId: row.category_id,
      category: row.gap_analysis_categories?.category ?? '',
      status: row.status as CareerGoal['status'],
      displayOrder: row.display_order ?? 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  })
}

export async function createCareerGoal(
  goal: Omit<CareerGoal, 'id' | 'category' | 'createdAt' | 'updatedAt'>
): Promise<CareerGoal> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('career_goals')
    .insert({
      time_period: goal.timePeriod,
      goal: goal.goal,
      type: goal.type,
      category_id: goal.categoryId,
      status: goal.status,
      display_order: goal.displayOrder,
      owning_user_id: user.id,
    })
    .select(`*, gap_analysis_categories!inner(category)`)
    .single()

  if (error) throw error

  const row = data as unknown as GoalRow
  return {
    id: row.id,
    timePeriod: row.time_period as CareerGoal['timePeriod'],
    goal: row.goal,
    type: row.type as CareerGoal['type'],
    categoryId: row.category_id,
    category: row.gap_analysis_categories?.category ?? '',
    status: row.status as CareerGoal['status'],
    displayOrder: row.display_order ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function updateCareerGoal(
  id: string,
  updates: Partial<CareerGoal>
): Promise<CareerGoal> {
  const supabase = createClient()

  const dbUpdates: Record<string, unknown> = {}
  if (updates.goal !== undefined) dbUpdates.goal = updates.goal
  if (updates.type !== undefined) dbUpdates.type = updates.type
  if (updates.categoryId !== undefined) dbUpdates.category_id = updates.categoryId
  if (updates.status !== undefined) dbUpdates.status = updates.status
  if (updates.displayOrder !== undefined) dbUpdates.display_order = updates.displayOrder

  const { data, error } = await supabase
    .from('career_goals')
    .update(dbUpdates)
    .eq('id', id)
    .select(`*, gap_analysis_categories!inner(category)`)
    .single()

  if (error) throw error

  const row = data as unknown as GoalRow
  return {
    id: row.id,
    timePeriod: row.time_period as CareerGoal['timePeriod'],
    goal: row.goal,
    type: row.type as CareerGoal['type'],
    categoryId: row.category_id,
    category: row.gap_analysis_categories?.category ?? '',
    status: row.status as CareerGoal['status'],
    displayOrder: row.display_order ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function deleteCareerGoal(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('career_goals').delete().eq('id', id)
  if (error) throw error
}

// ============================================================================
// ACHIEVEMENTS
// ============================================================================

export async function getAchievements(): Promise<Achievement[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('achievements')
    .select('*')
    .order('achievement_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map((r) => {
    const row = r as unknown as AchievementRow
    return {
      id: row.id,
      type: row.type as Achievement['type'],
      description: row.description,
      achievementDate: row.achievement_date,
      keyTakeaway: row.key_takeaway ?? '',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  })
}

export async function createAchievement(
  achievement: Omit<Achievement, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Achievement> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('achievements')
    .insert({
      type: achievement.type,
      description: achievement.description,
      achievement_date: achievement.achievementDate,
      key_takeaway: achievement.keyTakeaway,
      owning_user_id: user.id,
    })
    .select()
    .single()

  if (error) throw error

  const row = data as unknown as AchievementRow
  return {
    id: row.id,
    type: row.type as Achievement['type'],
    description: row.description,
    achievementDate: row.achievement_date,
    keyTakeaway: row.key_takeaway ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function updateAchievement(
  id: string,
  updates: Partial<Achievement>
): Promise<Achievement> {
  const supabase = createClient()

  const dbUpdates: Record<string, unknown> = {}
  if (updates.type !== undefined) dbUpdates.type = updates.type
  if (updates.description !== undefined) dbUpdates.description = updates.description
  if (updates.achievementDate !== undefined) dbUpdates.achievement_date = updates.achievementDate
  if (updates.keyTakeaway !== undefined) dbUpdates.key_takeaway = updates.keyTakeaway

  const { data, error } = await supabase
    .from('achievements')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  const row = data as unknown as AchievementRow
  return {
    id: row.id,
    type: row.type as Achievement['type'],
    description: row.description,
    achievementDate: row.achievement_date,
    keyTakeaway: row.key_takeaway ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function deleteAchievement(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('achievements').delete().eq('id', id)
  if (error) throw error
}

// ============================================================================
// STALE GOAL DETECTION
// ============================================================================

export interface GoalStalenessRecord {
  goalId: string
  goalTitle: string
  timePeriod: CareerGoal['timePeriod']
  status: CareerGoal['status']
  /** ISO date string (YYYY-MM-DD) of last update, or null if never updated since creation */
  lastUpdatedAt: string
}

/**
 * Returns all non-completed career goals with their last-updated timestamp.
 * Used by the stale goal signal to surface goals with no recent activity.
 *
 * "Last evidenced" is proxied by `updated_at` on the goal row — any status
 * change, note edit, or explicit goal update bumps this timestamp.
 */
export async function getGoalsWithLastEvidenceDate(): Promise<GoalStalenessRecord[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('career_goals')
    .select('id, goal, time_period, status, updated_at')
    .neq('status', 'Completed')
    .order('updated_at', { ascending: true })

  if (error) throw error

  return (data ?? []).map((r: any) => ({
    goalId: r.id,
    goalTitle: r.goal,
    timePeriod: r.time_period as CareerGoal['timePeriod'],
    status: r.status as CareerGoal['status'],
    lastUpdatedAt: (r.updated_at as string).split('T')[0],
  }))
}
