"use client"

import { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MarkdownTextarea } from "@/components/ui/markdown-textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { marked } from "marked"
import DOMPurify from "isomorphic-dompurify"
import { RefreshCw } from "lucide-react"
import { getTodayDate } from "@/lib/utils"
import { type Meeting as BaseMeeting } from "@/lib/mock-data"
import { useTemplates } from "@/lib/hooks/use-templates"
import { regenerateMeetingTldr, type Meeting as ServiceMeeting } from "@/lib/services/meetings"

// Extended Meeting interface for forms that includes additional fields
interface Meeting extends Omit<BaseMeeting, 'id' | 'time' | 'status'> {
  id?: string
  actionItems?: string
  personName?: string
  teamName?: string
  recurrence?: string
  nextMeetingDate?: string
  personId?: string
  teamId?: string
}

interface MeetingFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  meeting?: Meeting | null
  onSave: (meeting: Meeting) => void
  availablePeople?: string[]
  availableTeams?: string[]
  defaultPerson?: string
  defaultType?: string
  defaultPersonId?: string
  peopleWithIds?: Array<{ id: string; name: string }>
  teamsWithIds?: Array<{ id: string; name: string }>
  /** Service-layer meeting object for TL;DR operations (needed for regeneration) */
  serviceMeeting?: ServiceMeeting | null
}

const calculateNextMeetingDate = (lastMeetingDate: string, recurrence: string): string => {
  const date = new Date(lastMeetingDate)

  switch (recurrence) {
    case "weekly":
      date.setDate(date.getDate() + 7)
      break
    case "fortnightly":
      date.setDate(date.getDate() + 14)
      break
    case "monthly":
      date.setMonth(date.getMonth() + 1)
      break
    case "custom":
      date.setMonth(date.getMonth() + 3)
      break
    default:
      return ""
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const emptyMeeting: Meeting = {
  title: "",
  type: "1:1",
  date: getTodayDate(),
  attendees: [],
  actionItems: "",
  notes: "",
  recurrence: "weekly",
  nextMeetingDate: ""
}

const meetingTypes = [
  "1:1",
  "Team Sync",
  "Retro",
  "Planning",
  "Review",
  "Standup",
  "Other"
]

const recurrenceOptions = [
  { value: "none", label: "No recurrence" },
  { value: "weekly", label: "Weekly" },
  { value: "fortnightly", label: "Fortnightly" },
  { value: "monthly", label: "Monthly" },
  { value: "custom", label: "Custom" },
]

export function MeetingFormDialog({ open, onOpenChange, meeting, onSave, availablePeople = [], availableTeams = [], defaultPerson, defaultType, defaultPersonId, peopleWithIds = [], teamsWithIds = [], serviceMeeting }: MeetingFormDialogProps) {
  const { templates } = useTemplates()
  const [formData, setFormData] = useState<Meeting>(meeting || emptyMeeting)
  const [personInput, setPersonInput] = useState("")
  const [filteredPeople, setFilteredPeople] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [teamInput, setTeamInput] = useState("")
  const [filteredTeams, setFilteredTeams] = useState<string[]>([])
  const [showTeamSuggestions, setShowTeamSuggestions] = useState(false)
  const [validationError, setValidationError] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  const [tldrText, setTldrText] = useState<string | null>(serviceMeeting?.tldr ?? null)
  const [tldrLoading, setTldrLoading] = useState(false)

  // Sync TL;DR when serviceMeeting changes
  useEffect(() => {
    setTldrText(serviceMeeting?.tldr ?? null)
  }, [serviceMeeting?.tldr])

  const handleRegenerateTldr = useCallback(async () => {
    if (!serviceMeeting) return
    setTldrLoading(true)
    setTldrText(null)
    try {
      await regenerateMeetingTldr(serviceMeeting)
      // Poll for the result (fire-and-forget async update takes a moment)
      const supabase = (await import('@/lib/supabase/client')).createClient()
      const { data } = await supabase
        .from('meetings')
        .select('tldr')
        .eq('id', serviceMeeting.id)
        .single()
      setTldrText((data as { tldr: string | null } | null)?.tldr ?? null)
    } catch {
      // ignore
    } finally {
      setTldrLoading(false)
    }
  }, [serviceMeeting])

  // Reset form data when dialog opens/closes or meeting changes
  useEffect(() => {
    if (open) {
      const initialData = meeting || emptyMeeting

      // If defaultPerson/defaultType/defaultPersonId provided and not editing, pre-populate
      if ((defaultPerson || defaultPersonId) && !meeting) {
        const personData = defaultPersonId
          ? peopleWithIds.find(p => p.id === defaultPersonId)
          : peopleWithIds.find(p => p.name === defaultPerson)
        const resolvedName = personData?.name ?? defaultPerson ?? ''
        const resolvedType = defaultType || initialData.type
        setFormData({
          ...initialData,
          type: resolvedType as Meeting['type'],
          attendees: resolvedName ? [resolvedName] : initialData.attendees,
          personName: resolvedName || undefined,
          personId: personData?.id,
          title: resolvedName ? `${resolvedType} with ${resolvedName}` : initialData.title,
        })
        setPersonInput(resolvedName)
      } else {
        setFormData(initialData)
        setPersonInput(initialData.personName || "")
      }

      setTeamInput(initialData.attendees?.[0] || "")
      setValidationError("")

      // Calculate next meeting date if recurrence is set
      if (initialData.recurrence && initialData.recurrence !== "none") {
        const nextDate = calculateNextMeetingDate(initialData.date, initialData.recurrence)
        setFormData(prev => ({ ...prev, nextMeetingDate: nextDate }))
      }
    }
  }, [open, meeting, defaultPerson, defaultType, defaultPersonId, peopleWithIds])

  // Update next meeting date when date or recurrence changes
  useEffect(() => {
    if (formData.recurrence && formData.recurrence !== "none" && formData.date) {
      const nextDate = calculateNextMeetingDate(formData.date, formData.recurrence)
      setFormData(prev => ({ ...prev, nextMeetingDate: nextDate }))
    } else {
      setFormData(prev => ({ ...prev, nextMeetingDate: "" }))
    }
  }, [formData.date, formData.recurrence])

  // Filter people as user types (trigger after 2+ characters)
  useEffect(() => {
    if (formData.type === "1:1" && personInput.length >= 2) {
      const filtered = availablePeople.filter(person =>
        person.toLowerCase().includes(personInput.toLowerCase())
      )
      setFilteredPeople(filtered)
      const exactMatch = availablePeople.some(person => person.toLowerCase() === personInput.toLowerCase())
      setShowSuggestions(filtered.length > 0 && !exactMatch)
    } else {
      setFilteredPeople([])
      setShowSuggestions(false)
    }
  }, [personInput, availablePeople, formData.type])

  // Filter teams as user types
  useEffect(() => {
    const teamBasedTypes = ["Team Sync", "Retro", "Planning", "Review", "Standup"]
    if (teamInput && teamBasedTypes.includes(formData.type)) {
      const filtered = availableTeams.filter(team =>
        team.toLowerCase().includes(teamInput.toLowerCase())
      )
      setFilteredTeams(filtered)
      setShowTeamSuggestions(filtered.length > 0 && teamInput.length > 0)
    } else {
      setShowTeamSuggestions(false)
    }
  }, [teamInput, availableTeams, formData.type])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError("")

    // Validate next meeting date is after meeting date
    if (formData.nextMeetingDate && formData.date) {
      const meetingDate = new Date(formData.date)
      const nextMeetingDate = new Date(formData.nextMeetingDate)
      if (nextMeetingDate <= meetingDate) {
        setValidationError("Next meeting date must be after the meeting date")
        return
      }
    }

    // For 1:1 meetings, set personName and attendees
    if (formData.type === "1:1") {
      const personData = peopleWithIds.find(p => p.name.toLowerCase() === personInput.toLowerCase())
      const meetingData = {
        ...formData,
        personName: personInput,
        personId: personData?.id || formData.personId,
        attendees: [personInput],
        title: `1:1 with ${personInput}`
      }
      onSave(meetingData)
    } else if (["Team Sync", "Retro", "Planning", "Review", "Standup"].includes(formData.type)) {
      // For team-based meetings
      const teamData = teamsWithIds.find(t => t.name.toLowerCase() === teamInput.toLowerCase())
      const meetingData = {
        ...formData,
        teamName: teamInput,
        teamId: teamData?.id || formData.teamId,
        attendees: [teamInput],
        title: formData.title || `${formData.type} - ${teamInput}`
      }
      onSave(meetingData)
    } else {
      onSave(formData)
    }

    onOpenChange(false)
  }

  const handlePersonSelect = (person: string) => {
    const personData = peopleWithIds.find(p => p.name === person)
    setPersonInput(person)
    setFormData({
      ...formData,
      personName: person,
      personId: personData?.id,
      attendees: [person]
    })
    setShowSuggestions(false)
  }

  const handleTeamSelect = (team: string) => {
    const teamData = teamsWithIds.find(t => t.name === team)
    setTeamInput(team)
    setFormData({
      ...formData,
      teamName: team,
      teamId: teamData?.id,
      attendees: [team]
    })
    setShowTeamSuggestions(false)
  }

  const isEditing = !!meeting
  const is1on1 = formData.type === "1:1"
  const isTeamBased = ["Team Sync", "Retro", "Planning", "Review", "Standup"].includes(formData.type)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1100px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? meeting?.title : "Log Meeting"}</DialogTitle>
            <DialogDescription>
              {isEditing ? `Update meeting details and notes.` : "Add meeting details and notes."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-6 py-4 px-1">
            {/* Left Column - Form Fields */}
            <div className="grid gap-3 pr-1 overflow-y-auto max-h-[calc(90vh-200px)] content-start">
              {/* Conditional Fields based on Meeting Type */}
              {is1on1 ? (
                <>
                  {/* Meeting Type and Date side by side */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="type">Meeting Type *</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) => {
                          const teamBased = ["Team Sync", "Retro", "Planning", "Review", "Standup"]
                          const newTitle = value === "1:1"
                            ? (personInput ? `1:1 with ${personInput}` : "")
                            : teamBased.includes(value)
                            ? (teamInput ? `${value} - ${teamInput}` : "")
                            : ""
                          setFormData({ ...formData, type: value, title: newTitle })
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select meeting type" />
                        </SelectTrigger>
                        <SelectContent>
                          {meetingTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Date Field for 1:1 */}
                    <div className="grid gap-2">
                      <Label htmlFor="date">Date *</Label>
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  {/* Person Field for 1:1 */}
                  <div className="grid gap-2">
                    <Label htmlFor="person">Person *</Label>
                    <p className="text-[13px] text-muted-foreground">
                      Select from your team or type a new name
                    </p>
                    <div className="relative">
                      <Input
                        id="person"
                        value={personInput}
                        onChange={(e) => setPersonInput(e.target.value)}
                        onFocus={() => setShowSuggestions(filteredPeople.length > 0)}
                        placeholder="Start typing a name..."
                        required
                      />
                      {showSuggestions && (
                        <div className="meeting-suggestion-dropdown">
                          {filteredPeople.map((person, index) => (
                            <div key={index} onClick={() => handlePersonSelect(person)} className="meeting-suggestion-item">
                              {person}
                            </div>
                          ))}
                        </div>
                      )}
                      {personInput.length >= 2 && availablePeople.length > 0 && filteredPeople.length === 0 && !showSuggestions && (
                        <div className="meeting-new-person-badge">
                          <span className="meeting-new-person-label">New person</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recurrence and Next Meeting - Side by Side */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="recurrence">Recurrence</Label>
                      <Select
                        value={formData.recurrence || "none"}
                        onValueChange={(value) => setFormData({ ...formData, recurrence: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select recurrence" />
                        </SelectTrigger>
                        <SelectContent>
                          {recurrenceOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.recurrence && formData.recurrence !== "none" && (
                      <div className="grid gap-2">
                        <Label htmlFor="nextMeetingDate">Next Meeting</Label>
                        <Input
                          id="nextMeetingDate"
                          type="date"
                          value={formData.nextMeetingDate || ""}
                          onChange={(e) => setFormData({ ...formData, nextMeetingDate: e.target.value })}
                        />
                      </div>
                    )}
                  </div>
                </>
              ) : isTeamBased ? (
                <>
                  {/* Meeting Type and Date side by side */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="type">Meeting Type *</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) => {
                          const teamBased = ["Team Sync", "Retro", "Planning", "Review", "Standup"]
                          const newTitle = value === "1:1"
                            ? (personInput ? `1:1 with ${personInput}` : "")
                            : teamBased.includes(value)
                            ? (teamInput ? `${value} - ${teamInput}` : "")
                            : ""
                          setFormData({ ...formData, type: value, title: newTitle })
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select meeting type" />
                        </SelectTrigger>
                        <SelectContent>
                          {meetingTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Date Field for team-based meetings */}
                    <div className="grid gap-2">
                      <Label htmlFor="date">Date *</Label>
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  {/* Team Field for team-based meetings */}
                  <div className="grid gap-2">
                    <Label htmlFor="team">Team *</Label>
                    <div className="relative">
                      <Input
                        id="team"
                        value={teamInput}
                        onChange={(e) => setTeamInput(e.target.value)}
                        onFocus={() => setShowTeamSuggestions(filteredTeams.length > 0)}
                        placeholder="Start typing a team name..."
                        required
                      />
                      {showTeamSuggestions && (
                        <div className="meeting-suggestion-dropdown">
                          {filteredTeams.map((team, index) => (
                            <div key={index} onClick={() => handleTeamSelect(team)} className="meeting-suggestion-item">
                              {team}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-[13px] text-muted-foreground">
                      Select from your teams or type a new name
                    </p>
                  </div>

                  {/* Recurrence and Next Meeting - Side by Side */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="recurrence">Recurrence</Label>
                      <Select
                        value={formData.recurrence || "none"}
                        onValueChange={(value) => setFormData({ ...formData, recurrence: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select recurrence" />
                        </SelectTrigger>
                        <SelectContent>
                          {recurrenceOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.recurrence && formData.recurrence !== "none" && (
                      <div className="grid gap-2">
                        <Label htmlFor="nextMeetingDate">Next Meeting</Label>
                        <Input
                          id="nextMeetingDate"
                          type="date"
                          value={formData.nextMeetingDate || ""}
                          onChange={(e) => setFormData({ ...formData, nextMeetingDate: e.target.value })}
                        />
                      </div>
                    )}
                  </div>

                  {/* Meeting Title */}
                  <div className="grid gap-2">
                    <Label htmlFor="title">Meeting Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder={`e.g. ${formData.type} - ${teamInput || "Team Name"}`}
                    />
                    <p className="text-muted-foreground">
                      Leave blank to auto-generate from type and team
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {/* Meeting Type and Date side by side */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="type">Meeting Type *</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) => {
                          const teamBased = ["Team Sync", "Retro", "Planning", "Review", "Standup"]
                          const newTitle = value === "1:1"
                            ? (personInput ? `1:1 with ${personInput}` : "")
                            : teamBased.includes(value)
                            ? (teamInput ? `${value} - ${teamInput}` : "")
                            : ""
                          setFormData({ ...formData, type: value, title: newTitle })
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select meeting type" />
                        </SelectTrigger>
                        <SelectContent>
                          {meetingTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Date Field for other meetings */}
                    <div className="grid gap-2">
                      <Label htmlFor="date">Date *</Label>
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  {/* Meeting Title for other meetings */}
                  <div className="grid gap-2">
                    <Label htmlFor="title">Meeting Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. All Hands Q4 2024"
                      required
                    />
                  </div>

                  {/* Attendees for other meetings */}
                  <div className="grid gap-2">
                    <Label htmlFor="attendees">Attendees</Label>
                    <Input
                      id="attendees"
                      value={formData.attendees.join(", ")}
                      onChange={(e) => setFormData({
                        ...formData,
                        attendees: e.target.value.split(",").map(a => a.trim()).filter(a => a.length > 0)
                      })}
                      placeholder="Enter names separated by commas"
                    />
                    <p className="text-muted-foreground">
                      Separate multiple attendees with commas
                    </p>
                  </div>
                </>
              )}

              {/* Action Items */}
              <div className="grid gap-2">
                <Label>Action Items</Label>
                <MarkdownTextarea
                  value={formData.actionItems}
                  onValueChange={(value) => setFormData({ ...formData, actionItems: value })}
                  placeholder={"- Action item 1\n- Action item 2\n- Action item 3"}
                  rows={6}
                  className="text-sm"
                />
              </div>
            </div>

            {/* Right Column - Templates and Notes */}
            <div className="flex flex-col pl-1 gap-4 max-h-[calc(90vh-200px)]">
              {/* Template Selection - Only for 1:1 meetings */}
              {is1on1 && (
                <div className="grid gap-2">
                  <Label>Templates</Label>
                  <p className="text-[13px] text-muted-foreground">
                    Select a template to load pre-formatted notes
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => {
                          setSelectedTemplate(template.id)
                          const html = DOMPurify.sanitize(marked.parse(template.notes) as string)
                          setFormData(prev => ({ ...prev, notes: html }))
                        }}
                        className="meeting-template-btn"
                        style={{
                          background: selectedTemplate === template.id ? "var(--surf-3)" : "var(--surf-2)",
                          color: selectedTemplate === template.id ? "var(--text-1)" : "var(--text-2)",
                          border: `1px solid ${selectedTemplate === template.id ? "var(--border-3)" : "var(--border-2)"}`,
                        }}
                      >
                        {template.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes Section */}
              <div className="flex flex-col flex-1 min-h-0">
                <Label className="mb-2">Notes</Label>
                <MarkdownTextarea
                  value={formData.notes}
                  onValueChange={(value) => setFormData({ ...formData, notes: value })}
                  placeholder="Meeting notes, discussion points, decisions..."
                  className="h-full text-sm"
                />
              </div>

              {/* TL;DR — shown when editing an existing meeting */}
              {isEditing && serviceMeeting && (
                <div className="meeting-tldr-box">
                  <div className="meeting-tldr-header">
                    <span className="meeting-tldr-title">AI Summary</span>
                    <button
                      type="button"
                      onClick={handleRegenerateTldr}
                      disabled={tldrLoading}
                      className="meeting-tldr-regen-btn"
                      title="Regenerate summary"
                    >
                      <RefreshCw size={11} style={{ animation: tldrLoading ? "spin 1s linear infinite" : "none" }} />
                      Regenerate
                    </button>
                  </div>
                  {tldrLoading ? (
                    <p className="meeting-tldr-pending">Generating summary…</p>
                  ) : tldrText ? (
                    <p className="meeting-tldr-text">{tldrText}</p>
                  ) : (
                    <p className="meeting-tldr-pending">
                      No summary yet. Save meeting notes (&gt;100 chars) to generate one.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
          {validationError && (
            <div className="px-6 pb-2">
              <p className="text-red-600">{validationError}</p>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{isEditing ? "Save Changes" : "Save Meeting"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
