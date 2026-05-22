"use client"

import { useState, useRef, useCallback } from "react"
import { Sparkles, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { parseNaturalLanguageTask, type NaturalLanguageTaskPerson, type NaturalLanguageTaskResult } from "@/lib/services/tasks"
import { handleAIError } from "@/lib/services/ai"
import { Task, TaskPriority, TaskCategory, TASK_PRIORITIES, TASK_CATEGORIES } from "@/lib/types/task"

interface NaturalLanguageTaskInputProps {
  people: NaturalLanguageTaskPerson[]
  onConfirm: (task: Omit<Task, "id">) => void
  today?: string
}

type ParsedPreview = NaturalLanguageTaskResult & { rawInput: string }

const CONFIDENCE_CONFIG = {
  high: { icon: CheckCircle2, color: "var(--color-success, #16a34a)", label: "High confidence" },
  medium: { icon: AlertCircle, color: "var(--color-warning, #ca8a04)", label: "Review suggested" },
  low: { icon: AlertCircle, color: "var(--color-danger, #dc2626)", label: "Low confidence — please review" },
} as const

export function NaturalLanguageTaskInput({
  people,
  onConfirm,
  today = new Date().toISOString().split("T")[0],
}: NaturalLanguageTaskInputProps) {
  const [input, setInput] = useState("")
  const [isParsing, setIsParsing] = useState(false)
  const [preview, setPreview] = useState<ParsedPreview | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const handleParse = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || isParsing) return

    // Cancel any in-flight request
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setIsParsing(true)
    try {
      const result = await parseNaturalLanguageTask(trimmed, people, today, controller.signal)
      setPreview({ ...result, rawInput: trimmed })
      setIsPreviewOpen(true)
    } catch (err) {
      if ((err as Error).name === "AbortError") return
      handleAIError(err)
    } finally {
      setIsParsing(false)
    }
  }, [input, isParsing, people, today])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleParse()
    }
    if (e.key === "Escape") {
      setInput("")
    }
  }

  const handleConfirm = () => {
    if (!preview) return

    const task: Omit<Task, "id"> = {
      title: preview.title,
      priority: preview.priority as TaskPriority,
      category: preview.category as TaskCategory,
      status: "Not started",
      dueDate: preview.dueDate,
      list: preview.list,
      description: "",
    }

    onConfirm(task)
    setInput("")
    setPreview(null)
    setIsPreviewOpen(false)
  }

  const handleClose = () => {
    setIsPreviewOpen(false)
    setPreview(null)
  }

  const updatePreview = (field: keyof NaturalLanguageTaskResult, value: string) => {
    if (!preview) return
    setPreview({ ...preview, [field]: value })
  }

  const confidenceConfig = preview ? CONFIDENCE_CONFIG[preview.confidence] : null
  const ConfidenceIcon = confidenceConfig?.icon

  const assigneeName = preview?.assigneeId
    ? people.find(p => p.id === preview.assigneeId)?.name ?? null
    : null

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "var(--surface-2)",
          border: "1px solid var(--border-2)",
          borderRadius: "8px",
          padding: "6px 8px",
          maxWidth: "480px",
          width: "100%",
        }}
      >
        <Sparkles
          size={15}
          style={{ color: "var(--text-3)", flexShrink: 0 }}
          aria-hidden
        />
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe a task... (Enter to parse)"
          disabled={isParsing}
          style={{
            border: "none",
            background: "transparent",
            padding: 0,
            height: "auto",
            fontSize: "var(--text-caption)",
            color: "var(--text-1)",
            boxShadow: "none",
            outline: "none",
          }}
          aria-label="Natural language task input"
        />
        <button
          onClick={handleParse}
          disabled={!input.trim() || isParsing}
          style={{
            background: "none",
            border: "none",
            padding: "2px 4px",
            cursor: input.trim() && !isParsing ? "pointer" : "default",
            color: input.trim() && !isParsing ? "var(--text-2)" : "var(--text-4)",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
          }}
          aria-label="Parse task"
        >
          {isParsing ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <span style={{ fontSize: "var(--text-meta)" }}>⏎</span>
          )}
        </button>
      </div>

      {/* Preview dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={open => !open && handleClose()}>
        <DialogContent style={{ maxWidth: "480px" }}>
          <DialogHeader>
            <DialogTitle>Review parsed task</DialogTitle>
            <DialogDescription>
              {preview && (
                <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {ConfidenceIcon && (
                    <ConfidenceIcon
                      size={14}
                      style={{ color: confidenceConfig?.color, flexShrink: 0 }}
                      aria-hidden
                    />
                  )}
                  <span style={{ color: confidenceConfig?.color, fontSize: "var(--text-meta)" }}>
                    {confidenceConfig?.label}
                  </span>
                  <span style={{ color: "var(--text-3)", fontSize: "var(--text-meta)" }}>
                    — from: &ldquo;{preview.rawInput}&rdquo;
                  </span>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {preview && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", paddingTop: "8px" }}>
              {/* Title */}
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <Label htmlFor="nl-title">Title</Label>
                <Input
                  id="nl-title"
                  value={preview.title}
                  onChange={e => updatePreview("title", e.target.value)}
                  maxLength={80}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {/* Priority */}
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <Label htmlFor="nl-priority">Priority</Label>
                  <Select
                    value={preview.priority}
                    onValueChange={val => updatePreview("priority", val)}
                  >
                    <SelectTrigger id="nl-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_PRIORITIES.map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Category */}
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <Label htmlFor="nl-category">Category</Label>
                  <Select
                    value={preview.category}
                    onValueChange={val => updatePreview("category", val)}
                  >
                    <SelectTrigger id="nl-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_CATEGORIES.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {/* Due date */}
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <Label htmlFor="nl-due">Due date</Label>
                  <Input
                    id="nl-due"
                    type="date"
                    value={preview.dueDate ?? ""}
                    onChange={e => updatePreview("dueDate", e.target.value || "")}
                  />
                </div>

                {/* List */}
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <Label htmlFor="nl-list">List</Label>
                  <Select
                    value={preview.list}
                    onValueChange={val => updatePreview("list", val)}
                  >
                    <SelectTrigger id="nl-list">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">This week</SelectItem>
                      <SelectItem value="backlog">Backlog</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Assignee (display-only, matched from people) */}
              {assigneeName && (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <Label>Linked person</Label>
                  <div
                    style={{
                      fontSize: "var(--text-caption)",
                      color: "var(--text-2)",
                      background: "var(--surface-2)",
                      border: "1px solid var(--border-2)",
                      borderRadius: "6px",
                      padding: "6px 10px",
                    }}
                  >
                    {assigneeName}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter style={{ marginTop: "8px" }}>
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!preview?.title.trim()}
              className="btn-primary"
            >
              Create task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
