"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { MarkdownTextarea } from "@/components/ui/markdown-textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Trash2, Target, TrendingUp, Zap, Award, Pencil } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { BadgeSelect } from "@/components/ui/badge-select"
import {
  getCareerGoalsProfile,
  upsertCareerGoalsProfile,
  getGapAnalysisCategories,
  createGapAnalysisCategory,
  updateGapAnalysisCategory,
  deleteGapAnalysisCategory,
  getFocusDistributions,
  upsertFocusDistribution,
  getCareerGoals,
  createCareerGoal,
  updateCareerGoal,
  deleteCareerGoal,
  getAchievements,
  createAchievement,
  updateAchievement,
  deleteAchievement,
} from "@/lib/services/career-goals"
import { toast } from "sonner"

interface GapAnalysisRow {
  id: string
  category: string
  currentState: string
  desiredState: string
}

interface FocusDistribution {
  category: string
  categoryId: string
  focusPercent: number
  why: string
}

interface Goal {
  id: string
  goal: string
  type: "Core" | "Stretch"
  category: string
  categoryId: string
  status: "Not started" | "In progress" | "Completed"
  updatedAt: string
}

interface AchievementRow {
  id: string
  type: "Book" | "Course" | "Certification" | "Conference" | "Talk" | "Other"
  description: string
  date: string
  keyTakeaway: string
}

const goalStatuses = ["Not started", "In progress", "Completed"]

function calculateGoalDistribution(goals: Goal[], categories: string[]): { [key: string]: number } {
  const distribution: { [key: string]: number } = {}
  categories.forEach(cat => { distribution[cat] = 0 })
  goals.forEach(goal => { distribution[goal.category] = (distribution[goal.category] || 0) + 1 })
  return distribution
}

function GoalsTable({ goals, setter, categories, updateGoal, deleteGoal, stalenessBadge }: {
  goals: Goal[]
  term: 'short_term' | 'mid_term' | 'long_term'
  setter: React.Dispatch<React.SetStateAction<Goal[]>>
  categories: string[]
  updateGoal: (setter: React.Dispatch<React.SetStateAction<Goal[]>>, goals: Goal[], id: string, field: keyof Goal, value: string) => void
  deleteGoal: (setter: React.Dispatch<React.SetStateAction<Goal[]>>, goals: Goal[], id: string) => void
  stalenessBadge: (updatedAt: string, status: Goal['status']) => React.ReactNode
}) {
  return (
    <div className="cg-table-wrap">
      <table className="cg-table">
        <thead>
          <tr className="cg-table-head-row">
            <th className="col-header" style={{ padding: "8px 12px", width: "45%" }}>Goal</th>
            <th className="col-header" style={{ padding: "8px 12px", width: "12%" }}>Type</th>
            <th className="col-header" style={{ padding: "8px 12px", width: "18%" }}>Category</th>
            <th className="col-header" style={{ padding: "8px 12px", width: "15%" }}>Status</th>
            <th style={{ padding: "8px 12px", width: "40px" }}></th>
          </tr>
        </thead>
        <tbody>
          {goals.map((goal) => (
            <tr key={goal.id} className="cg-table-body-row">
              <td className="p-2">
                <Textarea value={goal.goal} onChange={(e) => updateGoal(setter, goals, goal.id, "goal", e.target.value)} placeholder="Goal description..." className="text-sm min-h-[60px]" rows={2} autoResize />
                {stalenessBadge(goal.updatedAt, goal.status)}
              </td>
              <td className="p-2">
                <BadgeSelect value={goal.type} onValueChange={(value) => updateGoal(setter, goals, goal.id, "type", value)}
                  options={[
                    { value: "Core", label: "Core", className: "", style: { background: "#0d1420", color: "#818cf8", fontSize: "var(--text-overline)", fontFamily: "var(--font-mono)", fontWeight: 500, borderRadius: "3px", padding: "2px 7px" } },
                    { value: "Stretch", label: "Stretch", className: "", style: { background: "#1a0d0d", color: "#f87171", fontSize: "var(--text-overline)", fontFamily: "var(--font-mono)", fontWeight: 500, borderRadius: "3px", padding: "2px 7px" } },
                  ]}
                />
              </td>
              <td className="p-2">
                <BadgeSelect value={goal.category} onValueChange={(value) => updateGoal(setter, goals, goal.id, "category", value)}
                  options={categories.map((cat) => ({
                    value: cat,
                    label: cat.length > 20 ? cat.substring(0, 20) + "..." : cat,
                    className: "",
                    style: { background: "var(--surf-3)", color: "var(--text-2)", fontSize: "var(--text-overline)", fontFamily: "var(--font-mono)", fontWeight: 500, borderRadius: "3px", padding: "2px 7px" },
                  }))}
                />
              </td>
              <td className="p-2">
                <BadgeSelect value={goal.status} onValueChange={(value) => updateGoal(setter, goals, goal.id, "status", value)}
                  options={goalStatuses.map((status) => ({
                    value: status,
                    label: status,
                    className: "",
                    style: {
                      background: status === "Completed" ? "#0d2015" : status === "In progress" ? "#0c1a3d" : "#1a1a22",
                      color: status === "Completed" ? "#4ade80" : status === "In progress" ? "#60a5fa" : "#6b7280",
                      fontSize: "var(--text-overline)", fontFamily: "var(--font-mono)", fontWeight: 500, borderRadius: "3px", padding: "2px 7px",
                    },
                  }))}
                />
              </td>
              <td className="p-2">
                <button onClick={() => deleteGoal(setter, goals, goal.id)} className="cg-goal-delete-btn">
                  <Trash2 />
                </button>
              </td>
            </tr>
          ))}
          {goals.length === 0 && (
            <tr>
              <td colSpan={5} className="cg-goals-empty-td">No goals yet. Click &quot;Add Goal&quot; to create one.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function FocusTable({ focus, term, setter, updateFocusDistribution }: {
  focus: FocusDistribution[]
  term: 'short_term' | 'mid_term' | 'long_term'
  setter: React.Dispatch<React.SetStateAction<FocusDistribution[]>>
  updateFocusDistribution: (timePeriod: 'short_term' | 'mid_term' | 'long_term', setter: React.Dispatch<React.SetStateAction<FocusDistribution[]>>, category: string, field: keyof FocusDistribution, value: string | number) => void
}) {
  const total = focus.reduce((sum, item) => sum + item.focusPercent, 0)
  return (
    <div>
      <div className="form-section-header">Desired Focus Distribution</div>
      <div className="cg-focus-table-wrap">
        <table className="cg-table">
          <thead>
            <tr className="cg-table-head-row">
              <th className="col-header" style={{ padding: "8px 12px", width: "30%" }}>Category</th>
              <th className="col-header" style={{ padding: "8px 12px", width: "10%" }}>Focus %</th>
              <th className="col-header" style={{ padding: "8px 12px", width: "60%" }}>Why</th>
            </tr>
          </thead>
          <tbody>
            {focus.map((item) => (
              <tr key={item.category} className="cg-table-body-row">
                <td className="cg-focus-td-name" title={item.category}>{item.category}</td>
                <td className="p-3">
                  <Input type="number" value={item.focusPercent === 0 ? "" : item.focusPercent}
                    onChange={(e) => updateFocusDistribution(term, setter, item.category, "focusPercent", e.target.value === "" ? 0 : parseInt(e.target.value) || 0)}
                    onBlur={(e) => { if (e.target.value === "") updateFocusDistribution(term, setter, item.category, "focusPercent", 0) }}
                    className="text-sm w-24" min="0" max="100" />
                </td>
                <td className="p-3">
                  <Input value={item.why} onChange={(e) => updateFocusDistribution(term, setter, item.category, "why", e.target.value)} placeholder="Why this focus percentage..." className="text-sm" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {total !== 100 && total > 0 && (
        <div className="cg-warning-box">Warning: Total focus percentage is {total}%. It should equal 100%.</div>
      )}
    </div>
  )
}

function MismatchBox({ focus, goals, categories }: { focus: FocusDistribution[], goals: Goal[], categories: string[] }) {
  const currentDist = calculateGoalDistribution(goals, categories)
  const mismatches: string[] = []
  focus.forEach((desired) => {
    const currentCount = currentDist[desired.category] || 0
    const currentPercent = goals.length > 0 ? Math.round((currentCount / goals.length) * 100) : 0
    if (desired.focusPercent > 0 && currentPercent !== desired.focusPercent) {
      mismatches.push(`${desired.category}: ${currentPercent}% (target: ${desired.focusPercent}%)`)
    }
  })
  if (mismatches.length === 0) return null
  return (
    <div className="cg-mismatch-box">
      Note: Current focus differs from desired:
      <ul className="cg-mismatch-list">
        {mismatches.map((msg, i) => <li key={i}>{msg}</li>)}
      </ul>
    </div>
  )
}

export default function CareerGoalsPage() {
  const focusDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [whereYouAre, setWhereYouAre] = useState("")
  const [whereYouWantToGo, setWhereYouWantToGo] = useState("")

  const [gapAnalysis, setGapAnalysis] = useState<GapAnalysisRow[]>([])
  const [isGapDialogOpen, setIsGapDialogOpen] = useState(false)
  const [editingGap, setEditingGap] = useState<GapAnalysisRow | null>(null)
  const [gapFormData, setGapFormData] = useState({ category: "", currentState: "", desiredState: "" })

  const categories = useMemo(() => gapAnalysis.map(row => row.category), [gapAnalysis])
  const categoryMap = useMemo(() => new Map(gapAnalysis.map(row => [row.category, row.id])), [gapAnalysis])

  const [shortTermFocus, setShortTermFocus] = useState<FocusDistribution[]>([])
  const [shortTermGoals, setShortTermGoals] = useState<Goal[]>([])
  const [midTermFocus, setMidTermFocus] = useState<FocusDistribution[]>([])
  const [midTermGoals, setMidTermGoals] = useState<Goal[]>([])
  const [longTermFocus, setLongTermFocus] = useState<FocusDistribution[]>([])
  const [longTermGoals, setLongTermGoals] = useState<Goal[]>([])

  const [achievements, setAchievements] = useState<AchievementRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => { loadAllData() }, [])

  const loadAllData = async () => {
    try {
      setIsLoading(true)
      const profile = await getCareerGoalsProfile()
      if (profile) { setWhereYouAre(profile.whereYouAre); setWhereYouWantToGo(profile.whereYouWantToGo) }

      const categories = await getGapAnalysisCategories()
      setGapAnalysis(categories.map(cat => ({ id: cat.id, category: cat.category, currentState: cat.currentState, desiredState: cat.desiredState })))

      const [shortFocus, midFocus, longFocus] = await Promise.all([
        getFocusDistributions('short_term'), getFocusDistributions('mid_term'), getFocusDistributions('long_term'),
      ])
      setShortTermFocus(shortFocus.map(f => ({ category: f.category, categoryId: f.categoryId, focusPercent: f.focusPercent, why: f.why })))
      setMidTermFocus(midFocus.map(f => ({ category: f.category, categoryId: f.categoryId, focusPercent: f.focusPercent, why: f.why })))
      setLongTermFocus(longFocus.map(f => ({ category: f.category, categoryId: f.categoryId, focusPercent: f.focusPercent, why: f.why })))

      const [shortGoals, midGoals, longGoals] = await Promise.all([
        getCareerGoals('short_term'), getCareerGoals('mid_term'), getCareerGoals('long_term'),
      ])
      const mapGoal = (g: any) => ({ id: g.id, goal: g.goal, type: g.type, category: g.category, categoryId: g.categoryId, status: g.status, updatedAt: g.updatedAt.split('T')[0] })
      setShortTermGoals(shortGoals.map(mapGoal))
      setMidTermGoals(midGoals.map(mapGoal))
      setLongTermGoals(longGoals.map(mapGoal))

      const achievementsData = await getAchievements()
      setAchievements(achievementsData.map(a => ({ id: a.id, type: a.type, description: a.description, date: a.achievementDate, keyTakeaway: a.keyTakeaway })))
    } catch (error) {
      console.error('Failed to load career goals data:', error)
      toast.error('Failed to load career goals data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleProfileUpdate = useCallback(async () => {
    try { await upsertCareerGoalsProfile({ whereYouAre, whereYouWantToGo }) }
    catch (error) { console.error('Failed to update profile:', error); toast.error('Failed to save profile') }
  }, [whereYouAre, whereYouWantToGo])

  useEffect(() => {
    if (!isLoading && (whereYouAre || whereYouWantToGo)) {
      const timer = setTimeout(() => { handleProfileUpdate() }, 1000)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [whereYouAre, whereYouWantToGo, isLoading, handleProfileUpdate])

  useEffect(() => {
    if (isLoading) return
    const updateFocusDistributions = (currentFocus: FocusDistribution[], setter: React.Dispatch<React.SetStateAction<FocusDistribution[]>>) => {
      const updatedFocus = categories.map(category => {
        const categoryId = categoryMap.get(category) || ''
        const existing = currentFocus.find(f => f.category === category)
        return existing || { category, categoryId, focusPercent: 0, why: "" }
      })
      setter(updatedFocus)
    }
    updateFocusDistributions(shortTermFocus, setShortTermFocus)
    updateFocusDistributions(midTermFocus, setMidTermFocus)
    updateFocusDistributions(longTermFocus, setLongTermFocus)
  }, [gapAnalysis, categories, categoryMap, shortTermFocus, midTermFocus, longTermFocus, isLoading])

  const openAddGapDialog = () => {
    setGapFormData({ category: "", currentState: "", desiredState: "" })
    setEditingGap(null)
    setIsGapDialogOpen(true)
  }

  const openEditGapDialog = (gap: GapAnalysisRow) => {
    setGapFormData({ category: gap.category, currentState: gap.currentState, desiredState: gap.desiredState })
    setEditingGap(gap)
    setIsGapDialogOpen(true)
  }

  const handleSaveGap = async () => {
    if (!gapFormData.category.trim()) return
    try {
      if (editingGap) await updateGapAnalysisCategory(editingGap.id, gapFormData)
      else await createGapAnalysisCategory({ ...gapFormData, displayOrder: gapAnalysis.length })
      await loadAllData()
      setIsGapDialogOpen(false)
    } catch (error) { console.error('Failed to save gap category:', error); toast.error('Failed to save gap category') }
  }

  const handleDeleteGap = async (id: string) => {
    try { await deleteGapAnalysisCategory(id); await loadAllData() }
    catch (error) { console.error('Failed to delete gap category:', error); toast.error('Failed to delete gap category') }
  }

  const updateFocusDistribution = (
    timePeriod: 'short_term' | 'mid_term' | 'long_term',
    setter: React.Dispatch<React.SetStateAction<FocusDistribution[]>>,
    category: string,
    field: keyof FocusDistribution,
    value: string | number
  ) => {
    setter(prev => prev.map(item => item.category === category ? { ...item, [field]: value } : item))
    if (focusDebounceRef.current) clearTimeout(focusDebounceRef.current)
    const categoryId = categoryMap.get(category)
    if (!categoryId) return
    const focusItem = (timePeriod === 'short_term' ? shortTermFocus : timePeriod === 'mid_term' ? midTermFocus : longTermFocus).find(f => f.category === category)
    if (focusItem) {
      focusDebounceRef.current = setTimeout(async () => {
        try {
          await upsertFocusDistribution({
            timePeriod, categoryId,
            focusPercent: field === 'focusPercent' ? Number(value) : focusItem.focusPercent,
            why: field === 'why' ? String(value) : focusItem.why,
          })
        } catch (error) { console.error('Failed to update focus distribution:', error); toast.error('Failed to save focus distribution') }
      }, 400)
    }
  }

  const addGoal = async (timePeriod: 'short_term' | 'mid_term' | 'long_term', setter: React.Dispatch<React.SetStateAction<Goal[]>>, goals: Goal[]) => {
    if (categories.length === 0) { alert("Please add at least one category in the Gap Analysis section first."); return }
    const categoryId = categoryMap.get(categories[0])
    if (!categoryId) return
    try {
      const newGoal = await createCareerGoal({ timePeriod, goal: "", type: "Core", categoryId, status: "Not started", displayOrder: goals.length })
      setter([...goals, { id: newGoal.id, goal: newGoal.goal, type: newGoal.type, category: newGoal.category, categoryId: newGoal.categoryId, status: newGoal.status, updatedAt: newGoal.updatedAt.split('T')[0] }])
    } catch (error) { console.error('Failed to create goal:', error); toast.error('Failed to create goal') }
  }

  const updateGoal = async (setter: React.Dispatch<React.SetStateAction<Goal[]>>, goals: Goal[], id: string, field: keyof Goal, value: string) => {
    const todayISO = new Date().toISOString().split('T')[0]
    setter(goals.map(goal => goal.id === id ? { ...goal, [field]: value, updatedAt: todayISO } : goal))
    try {
      const updates: any = {}
      if (field === 'goal') updates.goal = value
      if (field === 'type') updates.type = value as 'Core' | 'Stretch'
      if (field === 'status') updates.status = value as 'Not started' | 'In progress' | 'Completed'
      if (field === 'category') { const categoryId = categoryMap.get(value); if (categoryId) updates.categoryId = categoryId }
      await updateCareerGoal(id, updates)
    } catch (error) { console.error('Failed to update goal:', error); toast.error('Failed to update goal') }
  }

  const deleteGoal = async (setter: React.Dispatch<React.SetStateAction<Goal[]>>, goals: Goal[], id: string) => {
    try { await deleteCareerGoal(id); setter(goals.filter(goal => goal.id !== id)) }
    catch (error) { console.error('Failed to delete goal:', error); toast.error('Failed to delete goal') }
  }

  const addAchievement = async () => {
    try {
      const newAchievement = await createAchievement({ type: "Book", description: "", achievementDate: new Date().toISOString().split('T')[0], keyTakeaway: "" })
      setAchievements([...achievements, { id: newAchievement.id, type: newAchievement.type, description: newAchievement.description, date: newAchievement.achievementDate, keyTakeaway: newAchievement.keyTakeaway }])
    } catch (error) { console.error('Failed to create achievement:', error); toast.error('Failed to create achievement') }
  }

  const updateAchievementField = async (id: string, field: keyof AchievementRow, value: string) => {
    setAchievements(achievements.map(a => a.id === id ? { ...a, [field]: value } : a))
    try {
      const updates: any = {}
      if (field === 'type') updates.type = value as AchievementRow['type']
      if (field === 'description') updates.description = value
      if (field === 'date') updates.achievementDate = value
      if (field === 'keyTakeaway') updates.keyTakeaway = value
      await updateAchievement(id, updates)
    } catch (error) { console.error('Failed to update achievement:', error); toast.error('Failed to update achievement') }
  }

  const deleteAchievementById = async (id: string) => {
    try { await deleteAchievement(id); setAchievements(achievements.filter(a => a.id !== id)) }
    catch (error) { console.error('Failed to delete achievement:', error); toast.error('Failed to delete achievement') }
  }

  const getGoalStaleness = (updatedAt: string): { daysSince: number; severity: 'info' | 'warning' | 'critical' } | null => {
    const today = new Date()
    const last = new Date(updatedAt + 'T00:00:00')
    const daysSince = Math.floor((today.getTime() - last.getTime()) / (24 * 60 * 60 * 1000))
    if (daysSince < 60) return null
    const severity = daysSince >= 120 ? 'critical' : daysSince >= 90 ? 'warning' : 'info'
    return { daysSince, severity }
  }

  const stalenessBadge = (updatedAt: string, status: Goal['status']) => {
    if (status === 'Completed') return null
    const staleness = getGoalStaleness(updatedAt)
    if (!staleness) return null
    const { daysSince, severity } = staleness
    const bg = severity === 'critical' ? '#2a0a0a' : severity === 'warning' ? '#2a1a08' : '#0c1a3d'
    const color = severity === 'critical' ? '#f87171' : severity === 'warning' ? '#f97316' : '#60a5fa'
    return (
      <span title={`No activity in ${daysSince} days`} className="cg-staleness-badge" style={{ background: bg, color }}>
        {daysSince}d stale
      </span>
    )
  }

  const getCategoryColor = (category: string) => {
    const index = categories.indexOf(category)
    const colors = ["#10b981", "#3b82f6", "#a855f7", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#84cc16"]
    return colors[index % colors.length] || "#6b7280"
  }

  const renderPieChart = (goals: Goal[]) => {
    const distribution = calculateGoalDistribution(goals, categories)
    const total = goals.length
    if (total === 0) return <div className="cg-pie-empty">No goals yet</div>

    let startAngle = 0
    const radius = 100
    const centerX = 120
    const centerY = 120

    return (
      <div className="cg-pie-wrap">
        <svg width="240" height="240" viewBox="0 0 240 240">
          {categories.map((category) => {
            const count = distribution[category] || 0
            if (count === 0) return null
            const percentage = (count / total) * 100
            const angle = (percentage / 100) * 360
            const endAngle = startAngle + angle
            const x1 = centerX + radius * Math.cos((Math.PI * startAngle) / 180)
            const y1 = centerY + radius * Math.sin((Math.PI * startAngle) / 180)
            const x2 = centerX + radius * Math.cos((Math.PI * endAngle) / 180)
            const y2 = centerY + radius * Math.sin((Math.PI * endAngle) / 180)
            const largeArc = angle > 180 ? 1 : 0
            const path = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`
            const slice = <path key={category} d={path} fill={getCategoryColor(category)} stroke="white" strokeWidth="2" />
            startAngle = endAngle
            return slice
          })}
          <circle cx={centerX} cy={centerY} r="40" fill="var(--surf)" />
          <text x={centerX} y={centerY} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: "20px", fontWeight: 700, fill: "#f0f0f0" }}>{total}</text>
          <text x={centerX} y={centerY + 25} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: "var(--text-caption)", fill: "#555555" }}>Total</text>
        </svg>
        <div className="cg-pie-legend">
          {categories.map((category) => {
            const count = distribution[category] || 0
            const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : "0.0"
            const truncatedCategory = category.length > 30 ? category.substring(0, 30) + "..." : category
            return (
              <div key={category} className="cg-pie-legend-item" title={category}>
                <div className="cg-pie-legend-dot" style={{ backgroundColor: getCategoryColor(category) }} />
                <span className="cg-pie-legend-label">{truncatedCategory}</span>
                <span className="cg-pie-legend-pct">({percentage}%)</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="page-topbar">
        <span className="page-topbar-title">Career Goals</span>
      </div>

      <div className="cg-page">

        {/* Starting Point & Destination */}
        <div className="cg-section-card">
          <div className="cg-section-header">
            <div className="cg-section-title-row">
              <Target />
              Starting Point & Destination
            </div>
            <p className="cg-section-desc">
              Reflect on your current role, responsibilities, and capabilities.
              Be honest about your strengths, areas for improvement, and what motivates you at work.
              Describe your long-term aspiration or next career milestone.
            </p>
          </div>
          <div className="cg-section-body">
            <div className="grid grid-cols-2 gap-6">
              <div className="grid gap-2">
                <Label>Where you are now</Label>
                <MarkdownTextarea value={whereYouAre} onValueChange={setWhereYouAre} placeholder="Example: I am currently a Lead / Engineering Manager, responsible for delivery, technical direction, and people management. I am effective at keeping work moving and resolving issues as they come up, but I am still too involved in day-to-day execution. I often step in to unblock or make decisions myself, which limits how much space I create for others to lead and reduces my time for more strategic work." rows={8} className="text-sm" />
              </div>
              <div className="grid gap-2">
                <Label>Where you want to go</Label>
                <MarkdownTextarea value={whereYouWantToGo} onValueChange={setWhereYouWantToGo} placeholder="Example: My goal in 12 months is to move into a more senior leadership role where my impact comes from setting direction rather than solving every problem myself. I aim to delegate more effectively and focus on longer-term technical and organisational decisions." rows={8} className="text-sm" />
              </div>
            </div>
          </div>
        </div>

        {/* Gap Analysis */}
        <div className="cg-section-card">
          <div className="cg-section-header cg-section-header--between">
            <div style={{ flex: 1 }}>
              <div className="cg-section-title-row">
                <TrendingUp />
                Gap Analysis
              </div>
              <p className="cg-section-desc">Identify the gaps between your current position and your desired destination. These could be technical, behavioural, or contextual.</p>
            </div>
            <button onClick={openAddGapDialog} className="cg-add-btn">+ Add Category</button>
          </div>
          <div className="cg-section-body">
            {gapAnalysis.length === 0 ? (
              <div className="cg-gap-empty">
                <TrendingUp />
                <div className="cg-gap-empty-title">No categories yet</div>
                <p className="cg-gap-empty-desc">Add your first category to start your gap analysis</p>
                <button onClick={openAddGapDialog} className="cg-add-btn">+ Add First Category</button>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="w-full border-collapse table-fixed" style={{ borderRadius: "6px", overflow: "hidden", border: "1px solid var(--border-1)" }}>
                  <thead>
                    <tr className="cg-table-head-row">
                      <th className="col-header" style={{ padding: "8px 12px", width: "20%" }}>Category</th>
                      <th className="col-header" style={{ padding: "8px 12px", width: "35%" }}>Current State</th>
                      <th className="col-header" style={{ padding: "8px 12px", width: "35%" }}>Desired State</th>
                      <th className="col-header" style={{ padding: "8px 12px", width: "10%" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gapAnalysis.map((row) => (
                      <tr key={row.id} className="cg-table-body-row">
                        <td className="cg-td cg-td--name">{row.category}</td>
                        <td className="cg-td">{row.currentState}</td>
                        <td className="cg-td">{row.desiredState}</td>
                        <td className="cg-td-actions">
                          <div className="cg-td-actions-inner">
                            <button onClick={() => openEditGapDialog(row)} className="cg-edit-btn"><Pencil /></button>
                            <button onClick={() => handleDeleteGap(row.id)} className="cg-delete-btn"><Trash2 /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Short-term Goals */}
        <div className="cg-section-card">
          <div className="cg-section-header">
            <div className="cg-section-title-row"><Zap />Short-term (0-4 months)</div>
            <p className="cg-section-desc">Focus on quick wins and foundational improvements you can achieve in the next few months.</p>
          </div>
          <div className="cg-section-body">
            <div className="cg-goals-section">
              {categories.length > 0 && <FocusTable focus={shortTermFocus} term="short_term" setter={setShortTermFocus} updateFocusDistribution={updateFocusDistribution} />}
              <div className="grid grid-cols-[60%_40%] gap-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="form-section-header">Goals</span>
                    <button onClick={() => addGoal('short_term', setShortTermGoals, shortTermGoals)} className="cg-add-goal-btn">+ Add Goal</button>
                  </div>
                  <GoalsTable goals={shortTermGoals} term="short_term" setter={setShortTermGoals} categories={categories} updateGoal={updateGoal} deleteGoal={deleteGoal} stalenessBadge={stalenessBadge} />
                </div>
                <div>
                  <div className="form-section-header">Current Focus Distribution</div>
                  {renderPieChart(shortTermGoals)}
                  <MismatchBox focus={shortTermFocus} goals={shortTermGoals} categories={categories} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mid-term Goals */}
        <div className="cg-section-card">
          <div className="cg-section-header">
            <div className="cg-section-title-row"><TrendingUp />Mid-term (4-8 months)</div>
            <p className="cg-section-desc">Focus on goals that show deeper growth and sustained progress. Build consistency and demonstrate broader impact.</p>
          </div>
          <div className="cg-section-body">
            <div className="cg-goals-section">
              {categories.length > 0 && <FocusTable focus={midTermFocus} term="mid_term" setter={setMidTermFocus} updateFocusDistribution={updateFocusDistribution} />}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="form-section-header">Goals</span>
                    <button onClick={() => addGoal('mid_term', setMidTermGoals, midTermGoals)} className="cg-add-goal-btn">+ Add Goal</button>
                  </div>
                  <GoalsTable goals={midTermGoals} term="mid_term" setter={setMidTermGoals} categories={categories} updateGoal={updateGoal} deleteGoal={deleteGoal} stalenessBadge={stalenessBadge} />
                </div>
                <div>
                  <div className="form-section-header">Current Focus Distribution</div>
                  {renderPieChart(midTermGoals)}
                  <MismatchBox focus={midTermFocus} goals={midTermGoals} categories={categories} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Long-term Goals */}
        <div className="cg-section-card">
          <div className="cg-section-header">
            <div className="cg-section-title-row"><Award />Long-term (8-12 months)</div>
            <p className="cg-section-desc">Focus on demonstrating autonomy, technical depth, and influence across teams. Shape technical direction, mentor others, and drive lasting improvements.</p>
          </div>
          <div className="cg-section-body">
            <div className="cg-goals-section">
              {categories.length > 0 && <FocusTable focus={longTermFocus} term="long_term" setter={setLongTermFocus} updateFocusDistribution={updateFocusDistribution} />}
              <div className="grid grid-cols-[60%_40%] gap-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="form-section-header">Goals</span>
                    <button onClick={() => addGoal('long_term', setLongTermGoals, longTermGoals)} className="cg-add-goal-btn">+ Add Goal</button>
                  </div>
                  <GoalsTable goals={longTermGoals} term="long_term" setter={setLongTermGoals} categories={categories} updateGoal={updateGoal} deleteGoal={deleteGoal} stalenessBadge={stalenessBadge} />
                </div>
                <div>
                  <div className="form-section-header">Current Focus Distribution</div>
                  {renderPieChart(longTermGoals)}
                  <MismatchBox focus={longTermFocus} goals={longTermGoals} categories={categories} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Achievements */}
        <div className="cg-section-card">
          <div className="cg-section-header cg-section-header--between">
            <div style={{ flex: 1 }}>
              <div className="cg-section-title-row"><Award />Extra Achievements & Learning</div>
              <p className="cg-section-desc">Record additional accomplishments, learning experiences, or initiatives outside your planned goals — certifications, courses, conferences, books, talks, or mentoring.</p>
            </div>
            <button onClick={addAchievement} className="cg-add-btn">+ Add Achievement</button>
          </div>
          <div className="cg-section-body">
            <div className="cg-table-wrap">
              <table className="cg-table">
                <thead>
                  <tr className="cg-table-head-row">
                    <th className="col-header" style={{ padding: "8px 12px" }}>Type</th>
                    <th className="col-header" style={{ padding: "8px 12px" }}>Description</th>
                    <th className="col-header" style={{ padding: "8px 12px" }}>Date</th>
                    <th className="col-header" style={{ padding: "8px 12px" }}>Key Takeaway</th>
                    <th style={{ padding: "8px 12px", width: "40px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {achievements.map((achievement) => (
                    <tr key={achievement.id} className="cg-table-body-row">
                      <td className="p-3">
                        <Select value={achievement.type} onValueChange={(value) => updateAchievementField(achievement.id, "type", value)}>
                          <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Book">Book</SelectItem>
                            <SelectItem value="Course">Course</SelectItem>
                            <SelectItem value="Certification">Certification</SelectItem>
                            <SelectItem value="Conference">Conference</SelectItem>
                            <SelectItem value="Talk">Talk</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-3">
                        <Input value={achievement.description} onChange={(e) => updateAchievementField(achievement.id, "description", e.target.value)} placeholder="e.g., Designing Data-Intensive Applications by Martin Kleppmann" className="text-sm" />
                      </td>
                      <td className="p-3">
                        <Input type="date" value={achievement.date} onChange={(e) => updateAchievementField(achievement.id, "date", e.target.value)} className="text-sm" />
                      </td>
                      <td className="p-3">
                        <Input value={achievement.keyTakeaway} onChange={(e) => updateAchievementField(achievement.id, "keyTakeaway", e.target.value)} placeholder="What did you learn or achieve?" className="text-sm" />
                      </td>
                      <td className="p-3">
                        <button onClick={() => deleteAchievementById(achievement.id)} className="cg-goal-delete-btn"><Trash2 /></button>
                      </td>
                    </tr>
                  ))}
                  {achievements.length === 0 && (
                    <tr><td colSpan={5} className="cg-goals-empty-td">No achievements yet. Click &quot;Add Achievement&quot; to create one.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Gap Analysis Dialog */}
        <Dialog open={isGapDialogOpen} onOpenChange={setIsGapDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingGap ? "Edit Category" : "Add Category"}</DialogTitle>
              <DialogDescription>
                {editingGap ? "Update the category details below." : "Create a new category to identify gaps between your current position and desired destination."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Category Name *</Label>
                <Input id="category" value={gapFormData.category} onChange={(e) => setGapFormData({ ...gapFormData, category: e.target.value })} placeholder="e.g., Technical Mastery & Delivery" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="currentState">Current State</Label>
                <Textarea id="currentState" value={gapFormData.currentState} onChange={(e) => setGapFormData({ ...gapFormData, currentState: e.target.value })} placeholder="Describe your current state in this area..." rows={3} className="text-sm" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="desiredState">Desired State</Label>
                <Textarea id="desiredState" value={gapFormData.desiredState} onChange={(e) => setGapFormData({ ...gapFormData, desiredState: e.target.value })} placeholder="Describe your desired state in this area..." rows={3} className="text-sm" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsGapDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveGap} disabled={!gapFormData.category.trim()}>{editingGap ? "Save Changes" : "Add Category"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}
