"use client"

import { useState, useEffect, useCallback, useRef } from "react"
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
}

interface AchievementRow {
  id: string
  type: "Book" | "Course" | "Certification" | "Conference" | "Talk" | "Other"
  description: string
  date: string
  keyTakeaway: string
}

const goalStatuses = ["Not started", "In progress", "Completed"]

export default function CareerGoalsPage() {
  const focusDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Starting Point & Destination
  const [whereYouAre, setWhereYouAre] = useState("")
  const [whereYouWantToGo, setWhereYouWantToGo] = useState("")

  // Gap Analysis
  const [gapAnalysis, setGapAnalysis] = useState<GapAnalysisRow[]>([])
  const [isGapDialogOpen, setIsGapDialogOpen] = useState(false)
  const [editingGap, setEditingGap] = useState<GapAnalysisRow | null>(null)
  const [gapFormData, setGapFormData] = useState({
    category: "",
    currentState: "",
    desiredState: "",
  })

  // Derive categories from gap analysis
  const categories = gapAnalysis.map(row => row.category)
  const categoryMap = new Map(gapAnalysis.map(row => [row.category, row.id]))

  // Short-term (0-4 months)
  const [shortTermFocus, setShortTermFocus] = useState<FocusDistribution[]>([])
  const [shortTermGoals, setShortTermGoals] = useState<Goal[]>([])

  // Mid-term (4-8 months)
  const [midTermFocus, setMidTermFocus] = useState<FocusDistribution[]>([])
  const [midTermGoals, setMidTermGoals] = useState<Goal[]>([])

  // Long-term (8-12 months)
  const [longTermFocus, setLongTermFocus] = useState<FocusDistribution[]>([])
  const [longTermGoals, setLongTermGoals] = useState<Goal[]>([])

  // Achievements
  const [achievements, setAchievements] = useState<AchievementRow[]>([])

  // Loading state
  const [isLoading, setIsLoading] = useState(true)

  // Load all data on mount
  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    try {
      setIsLoading(true)

      // Load profile
      const profile = await getCareerGoalsProfile()
      if (profile) {
        setWhereYouAre(profile.whereYouAre)
        setWhereYouWantToGo(profile.whereYouWantToGo)
      }

      // Load gap analysis categories
      const categories = await getGapAnalysisCategories()
      setGapAnalysis(categories.map(cat => ({
        id: cat.id,
        category: cat.category,
        currentState: cat.currentState,
        desiredState: cat.desiredState,
      })))

      // Load focus distributions for all periods
      const [shortFocus, midFocus, longFocus] = await Promise.all([
        getFocusDistributions('short_term'),
        getFocusDistributions('mid_term'),
        getFocusDistributions('long_term'),
      ])

      setShortTermFocus(shortFocus.map(f => ({
        category: f.category,
        categoryId: f.categoryId,
        focusPercent: f.focusPercent,
        why: f.why,
      })))
      setMidTermFocus(midFocus.map(f => ({
        category: f.category,
        categoryId: f.categoryId,
        focusPercent: f.focusPercent,
        why: f.why,
      })))
      setLongTermFocus(longFocus.map(f => ({
        category: f.category,
        categoryId: f.categoryId,
        focusPercent: f.focusPercent,
        why: f.why,
      })))

      // Load goals for all periods
      const [shortGoals, midGoals, longGoals] = await Promise.all([
        getCareerGoals('short_term'),
        getCareerGoals('mid_term'),
        getCareerGoals('long_term'),
      ])

      setShortTermGoals(shortGoals.map(g => ({
        id: g.id,
        goal: g.goal,
        type: g.type,
        category: g.category,
        categoryId: g.categoryId,
        status: g.status,
      })))
      setMidTermGoals(midGoals.map(g => ({
        id: g.id,
        goal: g.goal,
        type: g.type,
        category: g.category,
        categoryId: g.categoryId,
        status: g.status,
      })))
      setLongTermGoals(longGoals.map(g => ({
        id: g.id,
        goal: g.goal,
        type: g.type,
        category: g.category,
        categoryId: g.categoryId,
        status: g.status,
      })))

      // Load achievements
      const achievementsData = await getAchievements()
      setAchievements(achievementsData.map(a => ({
        id: a.id,
        type: a.type,
        description: a.description,
        date: a.achievementDate,
        keyTakeaway: a.keyTakeaway,
      })))
    } catch (error) {
      console.error('Failed to load career goals data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Debounced profile update
  const handleProfileUpdate = useCallback(async () => {
    try {
      await upsertCareerGoalsProfile({
        whereYouAre,
        whereYouWantToGo,
      })
    } catch (error) {
      console.error('Failed to update profile:', error)
    }
  }, [whereYouAre, whereYouWantToGo])

  // Debounce profile updates (update database 1 second after user stops typing)
  useEffect(() => {
    if (!isLoading && (whereYouAre || whereYouWantToGo)) {
      const timer = setTimeout(() => {
        handleProfileUpdate()
      }, 1000)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [whereYouAre, whereYouWantToGo, isLoading, handleProfileUpdate])

  // Sync focus distributions when gap analysis changes
  useEffect(() => {
    if (isLoading) return

    const updateFocusDistributions = (
      currentFocus: FocusDistribution[],
      setter: React.Dispatch<React.SetStateAction<FocusDistribution[]>>
    ) => {
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
  }, [gapAnalysis, isLoading])

  // Gap Analysis Functions
  const openAddGapDialog = () => {
    setGapFormData({
      category: "",
      currentState: "",
      desiredState: "",
    })
    setEditingGap(null)
    setIsGapDialogOpen(true)
  }

  const openEditGapDialog = (gap: GapAnalysisRow) => {
    setGapFormData({
      category: gap.category,
      currentState: gap.currentState,
      desiredState: gap.desiredState,
    })
    setEditingGap(gap)
    setIsGapDialogOpen(true)
  }

  const handleSaveGap = async () => {
    if (!gapFormData.category.trim()) return

    try {
      if (editingGap) {
        // Update existing
        await updateGapAnalysisCategory(editingGap.id, gapFormData)
      } else {
        // Add new
        await createGapAnalysisCategory({
          ...gapFormData,
          displayOrder: gapAnalysis.length,
        })
      }

      // Reload all data to get updated categories and related data
      await loadAllData()
      setIsGapDialogOpen(false)
    } catch (error) {
      console.error('Failed to save gap category:', error)
    }
  }

  const handleDeleteGap = async (id: string) => {
    try {
      await deleteGapAnalysisCategory(id)
      // Reload data to update UI
      await loadAllData()
    } catch (error) {
      console.error('Failed to delete gap category:', error)
    }
  }

  const updateFocusDistribution = (
    timePeriod: 'short_term' | 'mid_term' | 'long_term',
    setter: React.Dispatch<React.SetStateAction<FocusDistribution[]>>,
    category: string,
    field: keyof FocusDistribution,
    value: string | number
  ) => {
    // Update local state immediately for a responsive UI
    setter(prev => prev.map(item =>
      item.category === category ? { ...item, [field]: value } : item
    ))

    // Debounce the database write — cancel any pending write for this session
    if (focusDebounceRef.current) clearTimeout(focusDebounceRef.current)

    const categoryId = categoryMap.get(category)
    if (!categoryId) return

    const focusItem = (timePeriod === 'short_term' ? shortTermFocus :
                       timePeriod === 'mid_term' ? midTermFocus : longTermFocus)
                      .find(f => f.category === category)

    if (focusItem) {
      focusDebounceRef.current = setTimeout(async () => {
        try {
          await upsertFocusDistribution({
            timePeriod,
            categoryId,
            focusPercent: field === 'focusPercent' ? Number(value) : focusItem.focusPercent,
            why: field === 'why' ? String(value) : focusItem.why,
          })
        } catch (error) {
          console.error('Failed to update focus distribution:', error)
        }
      }, 400)
    }
  }

  const addGoal = async (
    timePeriod: 'short_term' | 'mid_term' | 'long_term',
    setter: React.Dispatch<React.SetStateAction<Goal[]>>,
    goals: Goal[]
  ) => {
    if (categories.length === 0) {
      alert("Please add at least one category in the Gap Analysis section first.")
      return
    }

    const categoryId = categoryMap.get(categories[0])
    if (!categoryId) return

    try {
      const newGoal = await createCareerGoal({
        timePeriod,
        goal: "",
        type: "Core",
        categoryId,
        status: "Not started",
        displayOrder: goals.length,
      })

      setter([...goals, {
        id: newGoal.id,
        goal: newGoal.goal,
        type: newGoal.type,
        category: newGoal.category,
        categoryId: newGoal.categoryId,
        status: newGoal.status,
      }])
    } catch (error) {
      console.error('Failed to create goal:', error)
    }
  }

  const updateGoal = async (
    setter: React.Dispatch<React.SetStateAction<Goal[]>>,
    goals: Goal[],
    id: string,
    field: keyof Goal,
    value: string
  ) => {
    // Update local state immediately
    setter(goals.map(goal =>
      goal.id === id ? { ...goal, [field]: value } : goal
    ))

    // Update database
    try {
      const updates: any = {}
      if (field === 'goal') updates.goal = value
      if (field === 'type') updates.type = value as 'Core' | 'Stretch'
      if (field === 'status') updates.status = value as 'Not started' | 'In progress' | 'Completed'
      if (field === 'category') {
        const categoryId = categoryMap.get(value)
        if (categoryId) updates.categoryId = categoryId
      }

      await updateCareerGoal(id, updates)
    } catch (error) {
      console.error('Failed to update goal:', error)
    }
  }

  const deleteGoal = async (setter: React.Dispatch<React.SetStateAction<Goal[]>>, goals: Goal[], id: string) => {
    try {
      await deleteCareerGoal(id)
      setter(goals.filter(goal => goal.id !== id))
    } catch (error) {
      console.error('Failed to delete goal:', error)
    }
  }

  const addAchievement = async () => {
    try {
      const newAchievement = await createAchievement({
        type: "Book",
        description: "",
        achievementDate: new Date().toISOString().split('T')[0],
        keyTakeaway: "",
      })

      setAchievements([...achievements, {
        id: newAchievement.id,
        type: newAchievement.type,
        description: newAchievement.description,
        date: newAchievement.achievementDate,
        keyTakeaway: newAchievement.keyTakeaway,
      }])
    } catch (error) {
      console.error('Failed to create achievement:', error)
    }
  }

  const updateAchievementField = async (id: string, field: keyof AchievementRow, value: string) => {
    // Update local state immediately
    setAchievements(achievements.map(achievement =>
      achievement.id === id ? { ...achievement, [field]: value } : achievement
    ))

    // Update database
    try {
      const updates: any = {}
      if (field === 'type') updates.type = value as AchievementRow['type']
      if (field === 'description') updates.description = value
      if (field === 'date') updates.achievementDate = value
      if (field === 'keyTakeaway') updates.keyTakeaway = value

      await updateAchievement(id, updates)
    } catch (error) {
      console.error('Failed to update achievement:', error)
    }
  }

  const deleteAchievementById = async (id: string) => {
    try {
      await deleteAchievement(id)
      setAchievements(achievements.filter(achievement => achievement.id !== id))
    } catch (error) {
      console.error('Failed to delete achievement:', error)
    }
  }

  const calculateGoalDistribution = (goals: Goal[]) => {
    const distribution: { [key: string]: number } = {}
    categories.forEach(cat => distribution[cat] = 0)

    goals.forEach(goal => {
      distribution[goal.category] = (distribution[goal.category] || 0) + 1
    })

    return distribution
  }

  const getCategoryColor = (category: string) => {
    const index = categories.indexOf(category)
    const colors = ["#10b981", "#3b82f6", "#a855f7", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#84cc16"]
    return colors[index % colors.length] || "#6b7280"
  }

  const renderPieChart = (goals: Goal[]) => {
    const distribution = calculateGoalDistribution(goals)
    const total = goals.length

    if (total === 0) {
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "160px", fontSize: "var(--text-caption)", color: "var(--text-3)" }}>
          No goals yet
        </div>
      )
    }

    let startAngle = 0
    const radius = 100
    const centerX = 120
    const centerY = 120

    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
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

            const slice = (
              <path
                key={category}
                d={path}
                fill={getCategoryColor(category)}
                stroke="white"
                strokeWidth="2"
              />
            )

            startAngle = endAngle
            return slice
          })}
          <circle cx={centerX} cy={centerY} r="40" fill="var(--surf)" />
          <text
            x={centerX}
            y={centerY}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ fontSize: "20px", fontWeight: 700, fill: "#f0f0f0" }}
          >
            {total}
          </text>
          <text
            x={centerX}
            y={centerY + 25}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ fontSize: "var(--text-caption)", fill: "#555555" }}
          >
            Total
          </text>
        </svg>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center", maxWidth: "300px" }}>
          {categories.map((category) => {
            const count = distribution[category] || 0
            const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : "0.0"
            const truncatedCategory = category.length > 30 ? category.substring(0, 30) + "..." : category

            return (
              <div key={category} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "var(--text-overline)" }} title={category}>
                <div
                  style={{ width: "10px", height: "10px", borderRadius: "2px", flexShrink: 0, backgroundColor: getCategoryColor(category) }}
                />
                <span style={{ color: "var(--text-2)" }}>{truncatedCategory}</span>
                <span style={{ color: "var(--text-3)" }}>({percentage}%)</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Top bar */}
      <div style={{
        height: "40px",
        padding: "0 16px",
        borderBottom: "1px solid var(--border-1)",
        background: "var(--surf)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <span style={{ fontSize: "var(--text-label)", fontWeight: 500, color: "var(--text-1)", fontFamily: "var(--font-sans)" }}>
          Career Goals
        </span>
      </div>

    <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "16px" }}>

      {/* Starting Point & Destination */}
      <div style={{ background: "var(--surf)", border: "1px solid var(--border-1)", borderRadius: "6px", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "var(--text-meta)", fontWeight: 500, color: "var(--text-1)" }}>
            <Target style={{ width: "13px", height: "13px" }} />
            Starting Point & Destination
          </div>
          <p style={{ fontSize: "var(--text-caption)", color: "var(--text-3)", marginTop: "4px", lineHeight: 1.5 }}>
            Reflect on your current role, responsibilities, and capabilities.
            Be honest about your strengths, areas for improvement, and what motivates you at work.
            Describe your long-term aspiration or next career milestone.
          </p>
        </div>
        <div style={{ padding: "16px" }}>
          <div className="grid grid-cols-2 gap-6">
            <div className="grid gap-2">
              <Label>Where you are now</Label>
              <MarkdownTextarea
                value={whereYouAre}
                onValueChange={setWhereYouAre}
                placeholder="Example: I am currently a Lead / Engineering Manager, responsible for delivery, technical direction, and people management. I am effective at keeping work moving and resolving issues as they come up, but I am still too involved in day-to-day execution. I often step in to unblock or make decisions myself, which limits how much space I create for others to lead and reduces my time for more strategic work."
                rows={8}
                className="text-sm"
              />
            </div>

            <div className="grid gap-2">
              <Label>Where you want to go</Label>
              <MarkdownTextarea
                value={whereYouWantToGo}
                onValueChange={setWhereYouWantToGo}
                placeholder="Example: My goal in 12 months is to move into a more senior leadership role where my impact comes from setting direction rather than solving every problem myself. I aim to delegate more effectively and focus on longer-term technical and organisational decisions."
                rows={8}
                className="text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Gap Analysis */}
      <div style={{ background: "var(--surf)", border: "1px solid var(--border-1)", borderRadius: "6px", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-1)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "var(--text-meta)", fontWeight: 500, color: "var(--text-1)" }}>
              <TrendingUp style={{ width: "13px", height: "13px" }} />
              Gap Analysis
            </div>
            <p style={{ fontSize: "var(--text-caption)", color: "var(--text-3)", marginTop: "4px", lineHeight: 1.5 }}>
              Identify the gaps between your current position and your desired destination.
              These could be technical, behavioural, or contextual.
            </p>
          </div>
          <button
            onClick={openAddGapDialog}
            style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "linear-gradient(90deg, #00ffe5 0%, #00f058 100%)", border: "none", color: "#0a1a0a", padding: "4px 10px", borderRadius: "4px", fontSize: "var(--text-caption)", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)", flexShrink: 0 }}
          >
            + Add Category
          </button>
        </div>
        <div style={{ padding: "16px" }}>
          {gapAnalysis.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 0", textAlign: "center", border: "1px solid var(--border-1)", borderRadius: "6px", background: "var(--surf-2)" }}>
              <TrendingUp style={{ width: "32px", height: "32px", color: "var(--text-3)", marginBottom: "12px" }} />
              <div style={{ fontSize: "var(--text-meta)", fontWeight: 500, color: "var(--text-1)", marginBottom: "4px" }}>No categories yet</div>
              <p style={{ fontSize: "var(--text-caption)", color: "var(--text-3)", marginBottom: "12px" }}>
                Add your first category to start your gap analysis
              </p>
              <button
                onClick={openAddGapDialog}
                style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "linear-gradient(90deg, #00ffe5 0%, #00f058 100%)", border: "none", color: "#0a1a0a", padding: "4px 10px", borderRadius: "4px", fontSize: "var(--text-caption)", fontWeight: 600, cursor: "pointer" }}
              >
                + Add First Category
              </button>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="w-full border-collapse table-fixed" style={{ borderRadius: "6px", overflow: "hidden", border: "1px solid var(--border-1)" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-1)", background: "var(--surf-2)" }}>
                    <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "var(--text-overline)", fontWeight: 500, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", width: "20%" }}>Category</th>
                    <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "var(--text-overline)", fontWeight: 500, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", width: "35%" }}>Current State</th>
                    <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "var(--text-overline)", fontWeight: 500, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", width: "35%" }}>Desired State</th>
                    <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "var(--text-overline)", fontWeight: 500, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", width: "10%" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {gapAnalysis.map((row) => (
                    <tr key={row.id} style={{ borderBottom: "1px solid var(--border-1)" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--surf-2)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <td style={{ padding: "10px 12px", fontSize: "var(--text-meta)", fontWeight: 500, color: "var(--text-1)", wordBreak: "break-word" }}>{row.category}</td>
                      <td style={{ padding: "10px 12px", fontSize: "var(--text-meta)", color: "var(--text-2)", wordBreak: "break-word" }}>{row.currentState}</td>
                      <td style={{ padding: "10px 12px", fontSize: "var(--text-meta)", color: "var(--text-2)", wordBreak: "break-word" }}>{row.desiredState}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
                          <button
                            onClick={() => openEditGapDialog(row)}
                            style={{ background: "none", border: "1px solid var(--border-2)", color: "var(--text-3)", borderRadius: "3px", padding: "2px 6px", cursor: "pointer" }}
                            onMouseEnter={e => (e.currentTarget.style.color = "var(--text-1)")}
                            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}
                          >
                            <Pencil style={{ width: "11px", height: "11px" }} />
                          </button>
                          <button
                            onClick={() => handleDeleteGap(row.id)}
                            style={{ background: "none", border: "1px solid var(--border-2)", color: "#f87171", borderRadius: "3px", padding: "2px 6px", cursor: "pointer" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "var(--surf-3)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "none")}
                          >
                            <Trash2 style={{ width: "11px", height: "11px" }} />
                          </button>
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

      {/* Short-term Goals (0-4 months) */}
      <div style={{ background: "var(--surf)", border: "1px solid var(--border-1)", borderRadius: "6px", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "var(--text-meta)", fontWeight: 500, color: "var(--text-1)" }}>
            <Zap style={{ width: "13px", height: "13px" }} />
            Short-term (0-4 months)
          </div>
          <p style={{ fontSize: "var(--text-caption)", color: "var(--text-3)", marginTop: "4px", lineHeight: 1.5 }}>
            Focus on quick wins and foundational improvements you can achieve in the next few months.
          </p>
        </div>
        <div style={{ padding: "16px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Desired Focus Distribution */}
            {categories.length > 0 && (
              <div>
                <div style={{ fontSize: "var(--text-overline)", fontWeight: 500, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>Desired Focus Distribution</div>
                <div style={{ overflowX: "auto", border: "1px solid var(--border-1)", borderRadius: "6px" }}>
                  <table className="w-full border-collapse table-fixed">
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border-1)", background: "var(--surf-2)" }}>
                        <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "var(--text-overline)", fontWeight: 500, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", width: "30%" }}>Category</th>
                        <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "var(--text-overline)", fontWeight: 500, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", width: "10%" }}>Focus %</th>
                        <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "var(--text-overline)", fontWeight: 500, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", width: "60%" }}>Why</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shortTermFocus.map((item) => (
                        <tr key={item.category} style={{ borderBottom: "1px solid var(--border-1)" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "var(--surf-2)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        >
                          <td style={{ padding: "8px 12px", fontSize: "var(--text-meta)", fontWeight: 500, color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "300px" }} title={item.category}>{item.category}</td>
                          <td className="p-3">
                            <Input
                              type="number"
                              value={item.focusPercent === 0 ? "" : item.focusPercent}
                              onChange={(e) => updateFocusDistribution('short_term', setShortTermFocus, item.category, "focusPercent", e.target.value === "" ? 0 : parseInt(e.target.value) || 0)}
                              onBlur={(e) => {
                                if (e.target.value === "") {
                                  updateFocusDistribution('short_term', setShortTermFocus, item.category, "focusPercent", 0)
                                }
                              }}
                              className="text-sm w-24"
                              min="0"
                              max="100"
                            />
                          </td>
                          <td className="p-3">
                            <Input
                              value={item.why}
                              onChange={(e) => updateFocusDistribution('short_term', setShortTermFocus, item.category, "why", e.target.value)}
                              placeholder="Why this focus percentage..."
                              className="text-sm"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {(() => {
                  const total = shortTermFocus.reduce((sum, item) => sum + item.focusPercent, 0)
                  if (total !== 100 && total > 0) {
                    return (
                      <div style={{ marginTop: "6px", padding: "8px 12px", background: "#1a1200", border: "1px solid #6b4c00", borderRadius: "4px", fontSize: "var(--text-caption)", color: "#c9a227" }}>
                        Warning: Total focus percentage is {total}%. It should equal 100%.
                      </div>
                    )
                  }
                  return null
                })()}
              </div>
            )}

            {/* Goals Table and Chart */}
            <div className="grid grid-cols-[60%_40%] gap-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span style={{ fontSize: "var(--text-overline)", fontWeight: 500, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Goals</span>
                  <button onClick={() => addGoal('short_term', setShortTermGoals, shortTermGoals)} style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "transparent", border: "1px solid var(--border-2)", color: "var(--text-2)", padding: "3px 8px", borderRadius: "4px", fontSize: "var(--text-caption)", cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "var(--text-1)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "var(--text-2)")}
                  >+ Add Goal</button>
                </div>
                <div style={{ overflowX: "auto", border: "1px solid var(--border-1)", borderRadius: "6px" }}>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border-1)", background: "var(--surf-2)" }}>
                        <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "var(--text-overline)", fontWeight: 500, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", width: "45%" }}>Goal</th>
                        <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "var(--text-overline)", fontWeight: 500, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", width: "12%" }}>Type</th>
                        <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "var(--text-overline)", fontWeight: 500, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", width: "18%" }}>Category</th>
                        <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "var(--text-overline)", fontWeight: 500, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", width: "15%" }}>Status</th>
                        <th style={{ padding: "8px 12px", width: "40px" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {shortTermGoals.map((goal) => (
                        <tr key={goal.id} style={{ borderBottom: "1px solid var(--border-1)" }}>
                          <td className="p-2">
                            <Textarea
                              value={goal.goal}
                              onChange={(e) => updateGoal(setShortTermGoals, shortTermGoals, goal.id, "goal", e.target.value)}
                              placeholder="Goal description..."
                              className="text-sm min-h-[60px]"
                              rows={2}
                              autoResize
                            />
                          </td>
                          <td className="p-2">
                            <BadgeSelect
                              value={goal.type}
                              onValueChange={(value) => updateGoal(setShortTermGoals, shortTermGoals, goal.id, "type", value)}
                              options={[
                                { value: "Core", label: "Core", className: "", style: { background: "#0d1420", color: "#818cf8", fontSize: "var(--text-overline)", fontFamily: "var(--font-mono)", fontWeight: 500, borderRadius: "3px", padding: "2px 7px" } },
                                { value: "Stretch", label: "Stretch", className: "", style: { background: "#1a0d0d", color: "#f87171", fontSize: "var(--text-overline)", fontFamily: "var(--font-mono)", fontWeight: 500, borderRadius: "3px", padding: "2px 7px" } },
                              ]}
                            />
                          </td>
                          <td className="p-2">
                            <BadgeSelect
                              value={goal.category}
                              onValueChange={(value) => updateGoal(setShortTermGoals, shortTermGoals, goal.id, "category", value)}
                              options={categories.map((cat) => ({
                                value: cat,
                                label: cat.length > 20 ? cat.substring(0, 20) + "..." : cat,
                                className: "",
                                style: { background: "var(--surf-3)", color: "var(--text-2)", fontSize: "var(--text-overline)", fontFamily: "var(--font-mono)", fontWeight: 500, borderRadius: "3px", padding: "2px 7px" },
                              }))}
                            />
                          </td>
                          <td className="p-2">
                            <BadgeSelect
                              value={goal.status}
                              onValueChange={(value) => updateGoal(setShortTermGoals, shortTermGoals, goal.id, "status", value)}
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
                            <button
                              onClick={() => deleteGoal(setShortTermGoals, shortTermGoals, goal.id)}
                              style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: "2px" }}
                              onMouseEnter={e => (e.currentTarget.style.background = "var(--surf-3)")}
                              onMouseLeave={e => (e.currentTarget.style.background = "none")}
                            >
                              <Trash2 style={{ width: "11px", height: "11px" }} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {shortTermGoals.length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ padding: "12px", fontSize: "var(--text-caption)", color: "var(--text-3)" }}>
                            No goals yet. Click &quot;Add Goal&quot; to create one.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <div style={{ fontSize: "var(--text-overline)", fontWeight: 500, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>Current Focus Distribution</div>
                {renderPieChart(shortTermGoals)}
                {(() => {
                  const currentDist = calculateGoalDistribution(shortTermGoals)
                  const mismatches: string[] = []

                  shortTermFocus.forEach((desired) => {
                    const currentCount = currentDist[desired.category] || 0
                    const currentPercent = shortTermGoals.length > 0
                      ? Math.round((currentCount / shortTermGoals.length) * 100)
                      : 0

                    if (desired.focusPercent > 0 && currentPercent !== desired.focusPercent) {
                      mismatches.push(`${desired.category}: ${currentPercent}% (target: ${desired.focusPercent}%)`)
                    }
                  })

                  if (mismatches.length > 0) {
                    return (
                      <div style={{ marginTop: "8px", padding: "8px 12px", background: "#1a1200", border: "1px solid #6b4c00", borderRadius: "4px", fontSize: "var(--text-caption)", color: "#c9a227" }}>
                        Note: Current focus differs from desired:
                        <ul style={{ marginTop: "4px", marginLeft: "16px", listStyleType: "disc" }}>
                          {mismatches.map((msg, i) => <li key={i}>{msg}</li>)}
                        </ul>
                      </div>
                    )
                  }
                  return null
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mid-term Goals (4-8 months) */}
      <div style={{ background: "var(--surf)", border: "1px solid var(--border-1)", borderRadius: "6px", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "var(--text-meta)", fontWeight: 500, color: "var(--text-1)" }}>
            <TrendingUp style={{ width: "13px", height: "13px" }} />
            Mid-term (4-8 months)
          </div>
          <p style={{ fontSize: "var(--text-caption)", color: "var(--text-3)", marginTop: "4px", lineHeight: 1.5 }}>
            Focus on goals that show deeper growth and sustained progress. Build consistency and demonstrate broader impact.
          </p>
        </div>
        <div style={{ padding: "16px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Desired Focus Distribution */}
            {categories.length > 0 && (
              <div>
                <div style={{ fontSize: "var(--text-overline)", fontWeight: 500, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>Desired Focus Distribution</div>
                <div style={{ overflowX: "auto", border: "1px solid var(--border-1)", borderRadius: "6px" }}>
                  <table className="w-full border-collapse table-fixed">
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border-1)", background: "var(--surf-2)" }}>
                        <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "var(--text-overline)", fontWeight: 500, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", width: "30%" }}>Category</th>
                        <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "var(--text-overline)", fontWeight: 500, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", width: "10%" }}>Focus %</th>
                        <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "var(--text-overline)", fontWeight: 500, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", width: "60%" }}>Why</th>
                      </tr>
                    </thead>
                    <tbody>
                      {midTermFocus.map((item) => (
                        <tr key={item.category} style={{ borderBottom: "1px solid var(--border-1)" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "var(--surf-2)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        >
                          <td style={{ padding: "8px 12px", fontSize: "var(--text-meta)", fontWeight: 500, color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "300px" }} title={item.category}>{item.category}</td>
                          <td className="p-3">
                            <Input
                              type="number"
                              value={item.focusPercent === 0 ? "" : item.focusPercent}
                              onChange={(e) => updateFocusDistribution('mid_term', setMidTermFocus, item.category, "focusPercent", e.target.value === "" ? 0 : parseInt(e.target.value) || 0)}
                              onBlur={(e) => {
                                if (e.target.value === "") {
                                  updateFocusDistribution('mid_term', setMidTermFocus, item.category, "focusPercent", 0)
                                }
                              }}
                              className="text-sm w-24"
                              min="0"
                              max="100"
                            />
                          </td>
                          <td className="p-3">
                            <Input
                              value={item.why}
                              onChange={(e) => updateFocusDistribution('mid_term', setMidTermFocus, item.category, "why", e.target.value)}
                              placeholder="Why this focus percentage..."
                              className="text-sm"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {(() => {
                  const total = midTermFocus.reduce((sum, item) => sum + item.focusPercent, 0)
                  if (total !== 100 && total > 0) {
                    return (
                      <div style={{ marginTop: "6px", padding: "8px 12px", background: "#1a1200", border: "1px solid #6b4c00", borderRadius: "4px", fontSize: "var(--text-caption)", color: "#c9a227" }}>
                        Warning: Total focus percentage is {total}%. It should equal 100%.
                      </div>
                    )
                  }
                  return null
                })()}
              </div>
            )}

            {/* Goals Table and Chart */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span style={{ fontSize: "var(--text-overline)", fontWeight: 500, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Goals</span>
                  <button onClick={() => addGoal('mid_term', setMidTermGoals, midTermGoals)} style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "transparent", border: "1px solid var(--border-2)", color: "var(--text-2)", padding: "3px 8px", borderRadius: "4px", fontSize: "var(--text-caption)", cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "var(--text-1)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "var(--text-2)")}
                  >+ Add Goal</button>
                </div>
                <div style={{ overflowX: "auto", border: "1px solid var(--border-1)", borderRadius: "6px" }}>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border-1)", background: "var(--surf-2)" }}>
                        <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "var(--text-overline)", fontWeight: 500, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", width: "45%" }}>Goal</th>
                        <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "var(--text-overline)", fontWeight: 500, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", width: "12%" }}>Type</th>
                        <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "var(--text-overline)", fontWeight: 500, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", width: "18%" }}>Category</th>
                        <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "var(--text-overline)", fontWeight: 500, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", width: "15%" }}>Status</th>
                        <th style={{ padding: "8px 12px", width: "40px" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {midTermGoals.map((goal) => (
                        <tr key={goal.id} style={{ borderBottom: "1px solid var(--border-1)" }}>
                          <td className="p-2">
                            <Textarea
                              value={goal.goal}
                              onChange={(e) => updateGoal(setMidTermGoals, midTermGoals, goal.id, "goal", e.target.value)}
                              placeholder="Goal description..."
                              className="text-sm min-h-[60px]"
                              rows={2}
                              autoResize
                            />
                          </td>
                          <td className="p-2">
                            <BadgeSelect
                              value={goal.type}
                              onValueChange={(value) => updateGoal(setMidTermGoals, midTermGoals, goal.id, "type", value)}
                              options={[
                                { value: "Core", label: "Core", className: "", style: { background: "#0d1420", color: "#818cf8", fontSize: "var(--text-overline)", fontFamily: "var(--font-mono)", fontWeight: 500, borderRadius: "3px", padding: "2px 7px" } },
                                { value: "Stretch", label: "Stretch", className: "", style: { background: "#1a0d0d", color: "#f87171", fontSize: "var(--text-overline)", fontFamily: "var(--font-mono)", fontWeight: 500, borderRadius: "3px", padding: "2px 7px" } },
                              ]}
                            />
                          </td>
                          <td className="p-2">
                            <BadgeSelect
                              value={goal.category}
                              onValueChange={(value) => updateGoal(setMidTermGoals, midTermGoals, goal.id, "category", value)}
                              options={categories.map((cat) => ({
                                value: cat,
                                label: cat.length > 30 ? cat.substring(0, 30) + "..." : cat,
                                className: "",
                                style: { background: "var(--surf-3)", color: "var(--text-2)", fontSize: "var(--text-overline)", fontFamily: "var(--font-mono)", fontWeight: 500, borderRadius: "3px", padding: "2px 7px" },
                              }))}
                            />
                          </td>
                          <td className="p-2">
                            <BadgeSelect
                              value={goal.status}
                              onValueChange={(value) => updateGoal(setMidTermGoals, midTermGoals, goal.id, "status", value)}
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
                            <button
                              onClick={() => deleteGoal(setMidTermGoals, midTermGoals, goal.id)}
                              style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: "2px" }}
                              onMouseEnter={e => (e.currentTarget.style.background = "var(--surf-3)")}
                              onMouseLeave={e => (e.currentTarget.style.background = "none")}
                            >
                              <Trash2 style={{ width: "11px", height: "11px" }} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {midTermGoals.length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ padding: "12px", fontSize: "var(--text-caption)", color: "var(--text-3)" }}>
                            No goals yet. Click &quot;Add Goal&quot; to create one.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <div style={{ fontSize: "var(--text-overline)", fontWeight: 500, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>Current Focus Distribution</div>
                {renderPieChart(midTermGoals)}
                {(() => {
                  const currentDist = calculateGoalDistribution(midTermGoals)
                  const mismatches: string[] = []

                  midTermFocus.forEach((desired) => {
                    const currentCount = currentDist[desired.category] || 0
                    const currentPercent = midTermGoals.length > 0
                      ? Math.round((currentCount / midTermGoals.length) * 100)
                      : 0

                    if (desired.focusPercent > 0 && currentPercent !== desired.focusPercent) {
                      mismatches.push(`${desired.category}: ${currentPercent}% (target: ${desired.focusPercent}%)`)
                    }
                  })

                  if (mismatches.length > 0) {
                    return (
                      <div style={{ marginTop: "8px", padding: "8px 12px", background: "#1a1200", border: "1px solid #6b4c00", borderRadius: "4px", fontSize: "var(--text-caption)", color: "#c9a227" }}>
                        Note: Current focus differs from desired:
                        <ul style={{ marginTop: "4px", marginLeft: "16px", listStyleType: "disc" }}>
                          {mismatches.map((msg, i) => <li key={i}>{msg}</li>)}
                        </ul>
                      </div>
                    )
                  }
                  return null
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Long-term Goals (8-12 months) */}
      <div style={{ background: "var(--surf)", border: "1px solid var(--border-1)", borderRadius: "6px", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "var(--text-meta)", fontWeight: 500, color: "var(--text-1)" }}>
            <Award style={{ width: "13px", height: "13px" }} />
            Long-term (8-12 months)
          </div>
          <p style={{ fontSize: "var(--text-caption)", color: "var(--text-3)", marginTop: "4px", lineHeight: 1.5 }}>
            Focus on demonstrating autonomy, technical depth, and influence across teams. Shape technical direction, mentor others, and drive lasting improvements.
          </p>
        </div>
        <div style={{ padding: "16px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Desired Focus Distribution */}
            {categories.length > 0 && (
              <div>
                <div style={{ fontSize: "var(--text-overline)", fontWeight: 500, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>Desired Focus Distribution</div>
                <div style={{ overflowX: "auto", border: "1px solid var(--border-1)", borderRadius: "6px" }}>
                  <table className="w-full border-collapse table-fixed">
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border-1)", background: "var(--surf-2)" }}>
                        <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "var(--text-overline)", fontWeight: 500, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", width: "30%" }}>Category</th>
                        <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "var(--text-overline)", fontWeight: 500, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", width: "10%" }}>Focus %</th>
                        <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "var(--text-overline)", fontWeight: 500, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", width: "60%" }}>Why</th>
                      </tr>
                    </thead>
                    <tbody>
                      {longTermFocus.map((item) => (
                        <tr key={item.category} style={{ borderBottom: "1px solid var(--border-1)" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "var(--surf-2)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        >
                          <td style={{ padding: "8px 12px", fontSize: "var(--text-meta)", fontWeight: 500, color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "300px" }} title={item.category}>{item.category}</td>
                          <td className="p-3">
                            <Input
                              type="number"
                              value={item.focusPercent === 0 ? "" : item.focusPercent}
                              onChange={(e) => updateFocusDistribution('long_term', setLongTermFocus, item.category, "focusPercent", e.target.value === "" ? 0 : parseInt(e.target.value) || 0)}
                              onBlur={(e) => {
                                if (e.target.value === "") {
                                  updateFocusDistribution('long_term', setLongTermFocus, item.category, "focusPercent", 0)
                                }
                              }}
                              className="text-sm w-24"
                              min="0"
                              max="100"
                            />
                          </td>
                          <td className="p-3">
                            <Input
                              value={item.why}
                              onChange={(e) => updateFocusDistribution('long_term', setLongTermFocus, item.category, "why", e.target.value)}
                              placeholder="Why this focus percentage..."
                              className="text-sm"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {(() => {
                  const total = longTermFocus.reduce((sum, item) => sum + item.focusPercent, 0)
                  if (total !== 100 && total > 0) {
                    return (
                      <div style={{ marginTop: "6px", padding: "8px 12px", background: "#1a1200", border: "1px solid #6b4c00", borderRadius: "4px", fontSize: "var(--text-caption)", color: "#c9a227" }}>
                        Warning: Total focus percentage is {total}%. It should equal 100%.
                      </div>
                    )
                  }
                  return null
                })()}
              </div>
            )}

            {/* Goals Table and Chart */}
            <div className="grid grid-cols-[60%_40%] gap-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span style={{ fontSize: "var(--text-overline)", fontWeight: 500, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Goals</span>
                  <button onClick={() => addGoal('long_term', setLongTermGoals, longTermGoals)} style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "transparent", border: "1px solid var(--border-2)", color: "var(--text-2)", padding: "3px 8px", borderRadius: "4px", fontSize: "var(--text-caption)", cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "var(--text-1)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "var(--text-2)")}
                  >+ Add Goal</button>
                </div>
                <div style={{ overflowX: "auto", border: "1px solid var(--border-1)", borderRadius: "6px" }}>
                  <table className="w-full border-collapse">
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border-1)", background: "var(--surf-2)" }}>
                        <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "var(--text-overline)", fontWeight: 500, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", width: "45%" }}>Goal</th>
                        <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "var(--text-overline)", fontWeight: 500, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", width: "12%" }}>Type</th>
                        <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "var(--text-overline)", fontWeight: 500, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", width: "18%" }}>Category</th>
                        <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "var(--text-overline)", fontWeight: 500, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", width: "15%" }}>Status</th>
                        <th style={{ padding: "8px 12px", width: "40px" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {longTermGoals.map((goal) => (
                        <tr key={goal.id} style={{ borderBottom: "1px solid var(--border-1)" }}>
                          <td className="p-2">
                            <Textarea
                              value={goal.goal}
                              onChange={(e) => updateGoal(setLongTermGoals, longTermGoals, goal.id, "goal", e.target.value)}
                              placeholder="Goal description..."
                              className="text-sm min-h-[60px]"
                              rows={2}
                              autoResize
                            />
                          </td>
                          <td className="p-2">
                            <BadgeSelect
                              value={goal.type}
                              onValueChange={(value) => updateGoal(setLongTermGoals, longTermGoals, goal.id, "type", value)}
                              options={[
                                { value: "Core", label: "Core", className: "", style: { background: "#0d1420", color: "#818cf8", fontSize: "var(--text-overline)", fontFamily: "var(--font-mono)", fontWeight: 500, borderRadius: "3px", padding: "2px 7px" } },
                                { value: "Stretch", label: "Stretch", className: "", style: { background: "#1a0d0d", color: "#f87171", fontSize: "var(--text-overline)", fontFamily: "var(--font-mono)", fontWeight: 500, borderRadius: "3px", padding: "2px 7px" } },
                              ]}
                            />
                          </td>
                          <td className="p-2">
                            <BadgeSelect
                              value={goal.category}
                              onValueChange={(value) => updateGoal(setLongTermGoals, longTermGoals, goal.id, "category", value)}
                              options={categories.map((cat) => ({
                                value: cat,
                                label: cat.length > 30 ? cat.substring(0, 30) + "..." : cat,
                                className: "",
                                style: { background: "var(--surf-3)", color: "var(--text-2)", fontSize: "var(--text-overline)", fontFamily: "var(--font-mono)", fontWeight: 500, borderRadius: "3px", padding: "2px 7px" },
                              }))}
                            />
                          </td>
                          <td className="p-2">
                            <BadgeSelect
                              value={goal.status}
                              onValueChange={(value) => updateGoal(setLongTermGoals, longTermGoals, goal.id, "status", value)}
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
                            <button
                              onClick={() => deleteGoal(setLongTermGoals, longTermGoals, goal.id)}
                              style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: "2px" }}
                              onMouseEnter={e => (e.currentTarget.style.background = "var(--surf-3)")}
                              onMouseLeave={e => (e.currentTarget.style.background = "none")}
                            >
                              <Trash2 style={{ width: "11px", height: "11px" }} />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {longTermGoals.length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ padding: "12px", fontSize: "var(--text-caption)", color: "var(--text-3)" }}>
                            No goals yet. Click &quot;Add Goal&quot; to create one.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <div style={{ fontSize: "var(--text-overline)", fontWeight: 500, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>Current Focus Distribution</div>
                {renderPieChart(longTermGoals)}
                {(() => {
                  const currentDist = calculateGoalDistribution(longTermGoals)
                  const mismatches: string[] = []

                  longTermFocus.forEach((desired) => {
                    const currentCount = currentDist[desired.category] || 0
                    const currentPercent = longTermGoals.length > 0
                      ? Math.round((currentCount / longTermGoals.length) * 100)
                      : 0

                    if (desired.focusPercent > 0 && currentPercent !== desired.focusPercent) {
                      mismatches.push(`${desired.category}: ${currentPercent}% (target: ${desired.focusPercent}%)`)
                    }
                  })

                  if (mismatches.length > 0) {
                    return (
                      <div style={{ marginTop: "8px", padding: "8px 12px", background: "#1a1200", border: "1px solid #6b4c00", borderRadius: "4px", fontSize: "var(--text-caption)", color: "#c9a227" }}>
                        Note: Current focus differs from desired:
                        <ul style={{ marginTop: "4px", marginLeft: "16px", listStyleType: "disc" }}>
                          {mismatches.map((msg, i) => <li key={i}>{msg}</li>)}
                        </ul>
                      </div>
                    )
                  }
                  return null
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Extra Achievements & Learning */}
      <div style={{ background: "var(--surf)", border: "1px solid var(--border-1)", borderRadius: "6px", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-1)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "var(--text-meta)", fontWeight: 500, color: "var(--text-1)" }}>
              <Award style={{ width: "13px", height: "13px" }} />
              Extra Achievements & Learning
            </div>
            <p style={{ fontSize: "var(--text-caption)", color: "var(--text-3)", marginTop: "4px", lineHeight: 1.5 }}>
              Record additional accomplishments, learning experiences, or initiatives outside your planned goals — certifications, courses, conferences, books, talks, or mentoring.
            </p>
          </div>
          <button
            onClick={addAchievement}
            style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "linear-gradient(90deg, #00ffe5 0%, #00f058 100%)", border: "none", color: "#0a1a0a", padding: "4px 10px", borderRadius: "4px", fontSize: "var(--text-caption)", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)", flexShrink: 0 }}
          >
            + Add Achievement
          </button>
        </div>
        <div style={{ padding: "16px" }}>
            <div style={{ overflowX: "auto", border: "1px solid var(--border-1)", borderRadius: "6px" }}>
              <table className="w-full border-collapse">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-1)", background: "var(--surf-2)" }}>
                    <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "var(--text-overline)", fontWeight: 500, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Type</th>
                    <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "var(--text-overline)", fontWeight: 500, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Description</th>
                    <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "var(--text-overline)", fontWeight: 500, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Date</th>
                    <th style={{ textAlign: "left", padding: "8px 12px", fontSize: "var(--text-overline)", fontWeight: 500, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Key Takeaway</th>
                    <th style={{ padding: "8px 12px", width: "40px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {achievements.map((achievement) => (
                    <tr key={achievement.id} style={{ borderBottom: "1px solid var(--border-1)" }}>
                      <td className="p-3">
                        <Select
                          value={achievement.type}
                          onValueChange={(value) => updateAchievementField(achievement.id, "type", value)}
                        >
                          <SelectTrigger className="text-sm">
                            <SelectValue />
                          </SelectTrigger>
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
                        <Input
                          value={achievement.description}
                          onChange={(e) => updateAchievementField(achievement.id, "description", e.target.value)}
                          placeholder="e.g., Designing Data-Intensive Applications by Martin Kleppmann"
                          className="text-sm"
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          type="date"
                          value={achievement.date}
                          onChange={(e) => updateAchievementField(achievement.id, "date", e.target.value)}
                          className="text-sm"
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          value={achievement.keyTakeaway}
                          onChange={(e) => updateAchievementField(achievement.id, "keyTakeaway", e.target.value)}
                          placeholder="What did you learn or achieve?"
                          className="text-sm"
                        />
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => deleteAchievementById(achievement.id)}
                          style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: "2px" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "var(--surf-3)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "none")}
                        >
                          <Trash2 style={{ width: "11px", height: "11px" }} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {achievements.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: "12px", fontSize: "var(--text-caption)", color: "var(--text-3)" }}>
                        No achievements yet. Click &quot;Add Achievement&quot; to create one.
                      </td>
                    </tr>
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
              {editingGap
                ? "Update the category details below."
                : "Create a new category to identify gaps between your current position and desired destination."
              }
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="category">Category Name *</Label>
              <Input
                id="category"
                value={gapFormData.category}
                onChange={(e) => setGapFormData({ ...gapFormData, category: e.target.value })}
                placeholder="e.g., Technical Mastery & Delivery"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currentState">Current State</Label>
              <Textarea
                id="currentState"
                value={gapFormData.currentState}
                onChange={(e) => setGapFormData({ ...gapFormData, currentState: e.target.value })}
                placeholder="Describe your current state in this area..."
                rows={3}
                className="text-sm"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="desiredState">Desired State</Label>
              <Textarea
                id="desiredState"
                value={gapFormData.desiredState}
                onChange={(e) => setGapFormData({ ...gapFormData, desiredState: e.target.value })}
                placeholder="Describe your desired state in this area..."
                rows={3}
                className="text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setIsGapDialogOpen(false)} style={{ background: "transparent", border: "1px solid var(--border-2)", color: "var(--text-2)", padding: "6px 12px", borderRadius: "4px", fontSize: "var(--text-meta)", cursor: "pointer" }}>
              Cancel
            </button>
            <button onClick={handleSaveGap} disabled={!gapFormData.category.trim()} style={{ background: "linear-gradient(90deg, #00ffe5 0%, #00f058 100%)", border: "none", color: "#0a1a0a", padding: "6px 12px", borderRadius: "4px", fontSize: "var(--text-meta)", fontWeight: 600, cursor: "pointer" }}>
              {editingGap ? "Save Changes" : "Add Category"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </>
  )
}
