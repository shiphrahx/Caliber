"use client"

import { useState, useCallback } from "react"
import { Copy, Check, RefreshCw, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { callAI, handleAIError } from "@/lib/services/ai"
import {
  FOLLOW_UP_DRAFT_SYSTEM,
  buildFollowUpDraftPrompt,
  type FollowUpDraftTone,
  type FollowUpDraftArgs,
} from "@/lib/ai/prompts"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FollowUpDraftModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  meetingArgs: Omit<FollowUpDraftArgs, "tone">
}

// ─── Tone options ─────────────────────────────────────────────────────────────

const TONE_OPTIONS: Array<{ value: FollowUpDraftTone; label: string; description: string }> = [
  { value: "formal",  label: "Formal",  description: "Professional, full sentences" },
  { value: "casual",  label: "Casual",  description: "Warm, conversational" },
  { value: "slack",   label: "Slack",   description: "Short, bullet-point friendly" },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function FollowUpDraftModal({ open, onOpenChange, meetingArgs }: FollowUpDraftModalProps) {
  const [tone, setTone]         = useState<FollowUpDraftTone>("casual")
  const [draft, setDraft]       = useState("")
  const [loading, setLoading]   = useState(false)
  const [copied, setCopied]     = useState(false)
  const [hasGenerated, setHasGenerated] = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const generate = useCallback(async (selectedTone: FollowUpDraftTone) => {
    setLoading(true)
    setError(null)
    try {
      const result = await callAI({
        systemPrompt: FOLLOW_UP_DRAFT_SYSTEM,
        userPrompt: buildFollowUpDraftPrompt({ ...meetingArgs, tone: selectedTone }),
        maxTokens: 400,
        temperature: 0.7,
      })
      setDraft(result.content.trim())
      setHasGenerated(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate draft"
      setError(msg)
      handleAIError(err)
    } finally {
      setLoading(false)
    }
  }, [meetingArgs])

  const handleToneChange = (newTone: FollowUpDraftTone) => {
    setTone(newTone)
    if (hasGenerated) {
      // Auto-regenerate when tone changes after first generation
      generate(newTone)
    }
  }

  const handleGenerate = () => generate(tone)

  const handleCopy = async () => {
    if (!draft) return
    try {
      await navigator.clipboard.writeText(draft)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for environments without clipboard API
      const el = document.createElement("textarea")
      el.value = draft
      document.body.appendChild(el)
      el.select()
      document.execCommand("copy")
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      // Reset state when closing so next open is fresh
      setDraft("")
      setHasGenerated(false)
      setError(null)
      setCopied(false)
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[580px]">
        <DialogHeader>
          <DialogTitle>Draft follow-up message</DialogTitle>
          <DialogDescription>
            {meetingArgs.personName
              ? `Draft a follow-up for ${meetingArgs.personName} based on your meeting notes and action items.`
              : "Draft a follow-up message based on your meeting notes and action items."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Tone selector */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Tone</p>
            <div className="flex gap-2">
              {TONE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleToneChange(opt.value)}
                  title={opt.description}
                  className={`tone-btn ${tone === opt.value ? "tone-btn--active" : "tone-btn--inactive"}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[13px] text-muted-foreground">
              {TONE_OPTIONS.find((o) => o.value === tone)?.description}
            </p>
          </div>

          {/* Draft area */}
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Drafting message…</p>
            </div>
          ) : error ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-destructive">{error}</p>
              <Button type="button" variant="outline" size="sm" onClick={handleGenerate}>
                Try again
              </Button>
            </div>
          ) : !hasGenerated ? (
            <div className="flex flex-col items-center justify-center gap-3 py-8 rounded-md border border-dashed border-border">
              <p className="text-sm text-muted-foreground text-center">
                {meetingArgs.notes || meetingArgs.actionItems
                  ? "Click generate to draft a follow-up based on your meeting."
                  : "No notes or action items — the draft will be a general meeting summary."}
              </p>
              <Button type="button" onClick={handleGenerate} disabled={loading}>
                Generate draft
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Draft</p>
                <p className="text-[13px] text-muted-foreground">Edit before sending</p>
              </div>
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={8}
                className="resize-none text-sm font-mono"
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <div className="flex gap-2">
            {hasGenerated && !loading && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                disabled={loading}
                className="gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Regenerate
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Close
            </Button>
            {hasGenerated && !loading && draft && (
              <Button type="button" onClick={handleCopy} className="gap-1.5">
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy to clipboard
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
