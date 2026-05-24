"use client"

import { useState, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MarkdownTextarea } from "@/components/ui/markdown-textarea"
import {
  GripVertical, Plus, Trash2, ChevronDown, ChevronRight, Archive, RotateCcw
} from "lucide-react"
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent
} from "@dnd-kit/core"
import {
  SortableContext, sortableKeyboardCoordinates, useSortable,
  verticalListSortingStrategy, arrayMove
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  getActiveFramework, getFrameworks, createFramework, updateFramework,
  getAreasForFramework, createArea, updateArea, deleteArea, reorderAreas,
  getLevelsForArea, upsertLevel,
  FRAMEWORK_TEMPLATES, applyTemplate,
  LEVELS,
  type CompetencyFramework, type CompetencyArea, type CompetencyLevel,
} from "@/lib/services/competency"

// ─── Sortable area row ────────────────────────────────────────────────────────

interface SortableAreaProps {
  area: CompetencyArea
  levels: CompetencyLevel[]
  expanded: boolean
  onToggle: () => void
  onNameChange: (name: string) => void
  onNameBlur: () => void
  onDescriptionChange: (desc: string) => void
  onDescriptionBlur: () => void
  onLevelChange: (level: string, expectations: string) => void
  onLevelBlur: (level: string) => void
  onDelete: () => void
}

function SortableArea({
  area, levels, expanded, onToggle,
  onNameChange, onNameBlur, onDescriptionChange, onDescriptionBlur,
  onLevelChange, onLevelBlur, onDelete,
}: SortableAreaProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: area.id })

  const dndStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const levelMap = Object.fromEntries(levels.map(l => [l.level, l.expectations]))

  return (
    <div ref={setNodeRef} style={dndStyle} className="fw-area-card">
      {/* Area header row */}
      <div className="fw-area-header">
        <button
          {...attributes}
          {...listeners}
          className="fw-drag-btn"
          aria-label="Drag to reorder"
        >
          <GripVertical style={{ width: "14px", height: "14px" }} />
        </button>
        <button onClick={onToggle} className="fw-toggle-btn">
          {expanded
            ? <ChevronDown style={{ width: "14px", height: "14px" }} />
            : <ChevronRight style={{ width: "14px", height: "14px" }} />}
        </button>
        <input
          value={area.name}
          onChange={e => onNameChange(e.target.value)}
          onBlur={onNameBlur}
          className="fw-area-name-input"
          placeholder="Area name"
        />
        <button
          onClick={onDelete}
          className="fw-delete-btn"
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "#f87171")}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "var(--text-3)")}
          aria-label="Delete area"
        >
          <Trash2 style={{ width: "13px", height: "13px" }} />
        </button>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="fw-area-body">
          {/* Description */}
          <div className="fw-area-desc-wrap">
            <Label style={{ marginBottom: "4px", display: "block" }}>Description</Label>
            <Input
              value={area.description ?? ""}
              onChange={e => onDescriptionChange(e.target.value)}
              onBlur={onDescriptionBlur}
              placeholder="What does this competency cover?"
            />
          </div>

          {/* Level expectations grid */}
          <div className="fw-area-levels">
            <Label>Level Expectations</Label>
            {LEVELS.map(level => (
              <div key={level} className="fw-area-level-field">
                <label className="fw-area-level-label">
                  {level}
                </label>
                <div onBlur={() => onLevelBlur(level)}>
                  <MarkdownTextarea
                    value={levelMap[level] ?? ""}
                    onValueChange={val => onLevelChange(level, val)}
                    placeholder={`What does ${level} look like for ${area.name}?`}
                    rows={3}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

type AreaLevels = Record<string, CompetencyLevel[]>
type AreaDraft = CompetencyArea & { _nameLocal: string; _descLocal: string }

export default function FrameworkPage() {
  const [framework, setFramework] = useState<CompetencyFramework | null>(null)
  const [allFrameworks, setAllFrameworks] = useState<CompetencyFramework[]>([])
  const [areas, setAreas] = useState<AreaDraft[]>([])
  const [areaLevels, setAreaLevels] = useState<AreaLevels>({})
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [setupMode, setSetupMode] = useState(false)
  const [newFrameworkName, setNewFrameworkName] = useState("")
  const [saving, setSaving] = useState<Record<string, boolean>>({})

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const loadFramework = useCallback(async () => {
    setLoading(true)
    try {
      const [active, all] = await Promise.all([getActiveFramework(), getFrameworks()])
      setAllFrameworks(all)
      if (!active) { setSetupMode(true); setLoading(false); return }
      setFramework(active)
      const rawAreas = await getAreasForFramework(active.id)
      const drafts: AreaDraft[] = rawAreas.map(a => ({ ...a, _nameLocal: a.name, _descLocal: a.description ?? "" }))
      setAreas(drafts)
      const levMap: AreaLevels = {}
      await Promise.all(rawAreas.map(async a => {
        levMap[a.id] = await getLevelsForArea(a.id)
      }))
      setAreaLevels(levMap)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadFramework() }, [loadFramework])

  // ── Setup wizard ──────────────────────────────────────────────────────────

  const handleCreateBlank = async () => {
    if (!newFrameworkName.trim()) return
    const fw = await createFramework({ name: newFrameworkName.trim() })
    setFramework(fw)
    setAllFrameworks(prev => [...prev, fw])
    setSetupMode(false)
    setAreas([])
    setAreaLevels({})
  }

  const handleApplyTemplate = async (templateIdx: number) => {
    const name = newFrameworkName.trim() || FRAMEWORK_TEMPLATES[templateIdx].name
    const fw = await createFramework({ name })
    await applyTemplate(fw.id, FRAMEWORK_TEMPLATES[templateIdx])
    setFramework(fw)
    setSetupMode(false)
    await loadFramework()
  }

  // ── Framework header ──────────────────────────────────────────────────────

  const handleArchive = async () => {
    if (!framework) return
    const updated = await updateFramework(framework.id, { status: framework.status === 'active' ? 'archived' : 'active' })
    setFramework(updated)
  }

  const handleFrameworkNameBlur = async () => {
    if (!framework) return
    await updateFramework(framework.id, { name: framework.name })
  }

  // ── Area actions ──────────────────────────────────────────────────────────

  const handleAddArea = async () => {
    if (!framework) return
    const area = await createArea({ frameworkId: framework.id, name: "New Area", sortOrder: areas.length })
    const draft: AreaDraft = { ...area, _nameLocal: area.name, _descLocal: "" }
    setAreas(prev => [...prev, draft])
    setAreaLevels(prev => ({ ...prev, [area.id]: [] }))
    setExpandedAreas(prev => new Set([...prev, area.id]))
  }

  const handleDeleteArea = async (id: string) => {
    if (!confirm("Delete this competency area? Existing assessments will retain their data.")) return
    await deleteArea(id)
    setAreas(prev => prev.filter(a => a.id !== id))
    setAreaLevels(prev => { const n = { ...prev }; delete n[id]; return n })
  }

  const handleAreaNameBlur = async (area: AreaDraft) => {
    if (area._nameLocal === area.name) return
    const updated = await updateArea(area.id, { name: area._nameLocal })
    setAreas(prev => prev.map(a => a.id === area.id ? { ...a, name: updated.name, _nameLocal: updated.name } : a))
  }

  const handleAreaDescBlur = async (area: AreaDraft) => {
    if (area._descLocal === (area.description ?? "")) return
    await updateArea(area.id, { description: area._descLocal })
    setAreas(prev => prev.map(a => a.id === area.id ? { ...a, description: area._descLocal } : a))
  }

  const handleLevelBlur = async (areaId: string, level: string, expectations: string) => {
    if (!expectations.trim()) return
    setSaving(prev => ({ ...prev, [`${areaId}-${level}`]: true }))
    try {
      const saved = await upsertLevel(areaId, level, expectations)
      setAreaLevels(prev => {
        const existing = prev[areaId] ?? []
        const updated = existing.some(l => l.level === level)
          ? existing.map(l => l.level === level ? saved : l)
          : [...existing, saved]
        return { ...prev, [areaId]: updated }
      })
    } finally {
      setSaving(prev => ({ ...prev, [`${areaId}-${level}`]: false }))
    }
  }

  const handleLevelLocalChange = (areaId: string, level: string, expectations: string) => {
    setAreaLevels(prev => {
      const existing = prev[areaId] ?? []
      const hasLevel = existing.some(l => l.level === level)
      const updated = hasLevel
        ? existing.map(l => l.level === level ? { ...l, expectations } : l)
        : [...existing, { id: `draft-${areaId}-${level}`, areaId, level, expectations, createdAt: '', updatedAt: '' }]
      return { ...prev, [areaId]: updated }
    })
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = areas.findIndex(a => a.id === active.id)
    const newIdx = areas.findIndex(a => a.id === over.id)
    const reordered = arrayMove(areas, oldIdx, newIdx)
    setAreas(reordered)
    await reorderAreas(reordered.map(a => a.id))
  }

  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="fw-loading"><p>Loading…</p></div>
  }

  if (setupMode) {
    return (
      <div className="fw-setup">
        <h1 style={{ marginBottom: "4px" }}>Career Framework</h1>
        <p style={{ marginBottom: "32px" }}>Define what "good" looks like at each level. Use a template to get started, or build from scratch.</p>

        <div className="fw-setup-card">
          <Label style={{ display: "block", marginBottom: "8px" }}>Framework name</Label>
          <Input
            value={newFrameworkName}
            onChange={e => setNewFrameworkName(e.target.value)}
            placeholder="e.g. Backend Engineering Ladder"
            style={{ maxWidth: "360px", marginBottom: "20px" }}
          />

          <p className="fw-setup-templates-label">Start from a template:</p>
          <div className="fw-setup-templates">
            {FRAMEWORK_TEMPLATES.map((t, i) => (
              <button
                key={i}
                onClick={() => handleApplyTemplate(i)}
                className="fw-template-btn"
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = "#00f05860")}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = "var(--border-2)")}
              >
                <span className="fw-template-name">{t.name}</span>
                <span className="fw-template-count">
                  {t.areas.length} competency areas
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={handleCreateBlank}
            disabled={!newFrameworkName.trim()}
            className="fw-blank-btn"
            style={{ opacity: newFrameworkName.trim() ? 1 : 0.4, cursor: newFrameworkName.trim() ? "pointer" : "not-allowed" }}
          >
            Start blank
          </button>
        </div>

        {allFrameworks.filter(f => f.status === 'archived').length > 0 && (
          <div>
            <p className="fw-archived-label">Archived frameworks:</p>
            {allFrameworks.filter(f => f.status === 'archived').map(f => (
              <button
                key={f.id}
                onClick={async () => { await updateFramework(f.id, { status: 'active' }); await loadFramework() }}
                className="fw-restore-btn"
              >
                <RotateCcw style={{ width: "11px", height: "11px" }} /> Restore "{f.name}"
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (!framework) return null

  return (
    <div className="fw-page">
      {/* Header */}
      <div className="fw-header">
        <div className="fw-header-row">
          <input
            value={framework.name}
            onChange={e => setFramework({ ...framework, name: e.target.value })}
            onBlur={handleFrameworkNameBlur}
            className="fw-name-input"
          />
          <span
            className="fw-status-badge"
            style={{
              background: framework.status === 'active' ? "#0d2015" : "#222",
              color: framework.status === 'active' ? "#4ade80" : "#888",
              border: `1px solid ${framework.status === 'active' ? "#4ade8040" : "#44444440"}`,
            }}
          >
            {framework.status === 'active' ? 'Active' : 'Archived'}
          </span>
          <button onClick={handleArchive} className="fw-archive-btn">
            {framework.status === 'active'
              ? <><Archive style={{ width: "11px", height: "11px" }} /> Archive</>
              : <><RotateCcw style={{ width: "11px", height: "11px" }} /> Restore</>}
          </button>
        </div>
        <p className="fw-header-sub">
          {areas.length} competency area{areas.length !== 1 ? 's' : ''}. Changes auto-save on blur.
        </p>
      </div>

      {/* Competency areas */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={areas.map(a => a.id)} strategy={verticalListSortingStrategy}>
          {areas.map(area => (
            <SortableArea
              key={area.id}
              area={area}
              levels={areaLevels[area.id] ?? []}
              expanded={expandedAreas.has(area.id)}
              onToggle={() => setExpandedAreas(prev => {
                const s = new Set(prev)
                s.has(area.id) ? s.delete(area.id) : s.add(area.id)
                return s
              })}
              onNameChange={name => setAreas(prev => prev.map(a => a.id === area.id ? { ...a, _nameLocal: name } : a))}
              onNameBlur={() => handleAreaNameBlur(area)}
              onDescriptionChange={desc => setAreas(prev => prev.map(a => a.id === area.id ? { ...a, _descLocal: desc } : a))}
              onDescriptionBlur={() => handleAreaDescBlur(area)}
              onLevelChange={(level, exp) => handleLevelLocalChange(area.id, level, exp)}
              onLevelBlur={(level) => {
                const exp = (areaLevels[area.id] ?? []).find(l => l.level === level)?.expectations ?? ""
                if (exp) handleLevelBlur(area.id, level, exp)
              }}
              onDelete={() => handleDeleteArea(area.id)}
            />
          ))}
        </SortableContext>
      </DndContext>

      {areas.length === 0 && (
        <div className="fw-empty">
          <p>No competency areas yet.</p>
        </div>
      )}

      {Object.values(saving).some(Boolean) && (
        <p className="fw-saving">Saving…</p>
      )}

      <button
        onClick={handleAddArea}
        className="fw-add-area-btn"
        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = "#00f05860")}
        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = "var(--border-2)")}
      >
        <Plus style={{ width: "13px", height: "13px" }} /> Add competency area
      </button>
    </div>
  )
}
