"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import DOMPurify from "isomorphic-dompurify"
import { Input } from "@/components/ui/input"
import { ChevronRight, ChevronDown, ChevronsRight, ChevronsDown, BookOpen, ListChecks } from "lucide-react"
import { LogEvidenceModal } from "@/components/evidence/log-evidence-modal"
import { FollowUpForm } from "@/components/follow-ups/follow-up-form"
import { MeetingFormDialog } from "@/components/meeting-form-dialog"
import { FollowUpDraftModal } from "@/components/follow-up-draft-modal"
import { AIButton } from "@/components/ui/ai-button"
import { useAIConfig } from "@/lib/hooks/use-ai-config"
import { callAI, handleAIError } from "@/lib/services/ai"
import { ACTION_ITEM_EXTRACTION_SYSTEM, buildActionItemPrompt } from "@/lib/ai/prompts"
import { toast } from "sonner"
import {
  getMeetings,
  createMeeting,
  updateMeeting,
  type MeetingType,
  type RecurrenceType,
} from "@/lib/services/meetings"
import { getPeople } from "@/lib/services/people"
import { getTeams } from "@/lib/services/teams"
import { createTask } from "@/lib/services/tasks"

interface Meeting {
  id: string
  title: string
  type: string
  date: string
  attendees: string[]
  actionItems?: string
  notes?: string
  tldr?: string | null
  personName?: string
  teamName?: string
  recurrence?: string
  nextMeetingDate?: string
  personId?: string
  teamId?: string
}

interface TreeNode {
  type: string
  people?: { [personName: string]: Meeting[] }
  teams?: { [teamName: string]: Meeting[] }
  meetings?: Meeting[]
}

function parseActionItems(html: string): string[] {
  if (!html) return []
  const liMatches = html.match(/<li[^>]*>([\s\S]*?)<\/li>/gi) ?? []
  return liMatches.map((li) => li.replace(/<[^>]+>/g, "").trim()).filter((text) => text.length > 0)
}

export default function MeetingsPage() {
  const searchParams = useSearchParams()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [people, setPeople] = useState<string[]>([])
  const [teams, setTeams] = useState<string[]>([])
  const [peopleWithIds, setPeopleWithIds] = useState<Array<{ id: string; name: string }>>([])
  const [teamsWithIds, setTeamsWithIds] = useState<Array<{ id: string; name: string }>>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newMeetingDefaults, setNewMeetingDefaults] = useState<{ type?: string; personId?: string }>({})
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)
  const searchParamsHandled = useRef(false)
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set(["1:1"]))
  const [expandedPeople, setExpandedPeople] = useState<Set<string>>(new Set())
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set())
  const [leftPanelWidth, setLeftPanelWidth] = useState(220)
  const [isResizing, setIsResizing] = useState(false)
  const [logEvidenceOpen, setLogEvidenceOpen] = useState(false)
  const [trackFollowUpOpen, setTrackFollowUpOpen] = useState(false)
  const [extractingActions, setExtractingActions] = useState(false)
  const [followUpDraftOpen, setFollowUpDraftOpen] = useState(false)
  const [followUpDraftMeeting, setFollowUpDraftMeeting] = useState<Meeting | null>(null)
  const [showFollowUpBanner, setShowFollowUpBanner] = useState(false)
  const aiConfig = useAIConfig()

  useEffect(() => {
    const loadData = async () => {
      try {
        const [meetingsData, peopleData, teamsData] = await Promise.all([
          getMeetings(),
          getPeople(),
          getTeams(),
        ])

        const uiMeetings: Meeting[] = meetingsData.map((m) => ({
          id: m.id,
          title: m.title,
          type: m.meetingType,
          date: m.meetingDate,
          attendees: m.attendees,
          actionItems: m.actionItems || undefined,
          notes: m.notes || undefined,
          tldr: m.tldr,
          personName: m.personName || undefined,
          teamName: m.teamName || undefined,
          recurrence: m.recurrence || undefined,
          nextMeetingDate: m.nextMeetingDate || undefined,
          personId: m.personId || undefined,
          teamId: m.teamId || undefined,
        }))

        setMeetings(uiMeetings)

        const activePeople = peopleData.filter(p => p.status === 'active')
        const activeTeams = teamsData.filter(t => t.status === 'active')

        setPeople(activePeople.map(p => p.name))
        setTeams(activeTeams.map(t => t.name))
        setPeopleWithIds(activePeople.map(p => ({ id: p.id, name: p.name })))
        setTeamsWithIds(activeTeams.map(t => ({ id: t.id, name: t.name })))

        if (uiMeetings.length > 0) setSelectedMeeting(uiMeetings[0])

        if (!searchParamsHandled.current && searchParams.get('new') === '1') {
          searchParamsHandled.current = true
          const type = searchParams.get('type') || undefined
          const personId = searchParams.get('personId') || undefined
          setNewMeetingDefaults({ type, personId })
          setIsAddDialogOpen(true)
        }
      } catch (error) {
        console.error('Failed to load data:', error)
        toast.error('Failed to load meetings')
      }
    }
    loadData()
  }, [searchParams])

  const organizeTree = (): { [type: string]: TreeNode } => {
    const tree: { [type: string]: TreeNode } = {}
    const teamBasedTypes = ["Team Sync", "Retro", "Planning", "Review", "Standup"]

    meetings.forEach((meeting) => {
      const isTeamBased = teamBasedTypes.includes(meeting.type)

      if (!tree[meeting.type]) {
        tree[meeting.type] = {
          type: meeting.type,
          people: meeting.type === "1:1" ? {} : undefined,
          teams: isTeamBased ? {} : undefined,
          meetings: !meeting.type.includes("1:1") && !isTeamBased ? [] : undefined,
        }
      }

      if (meeting.type === "1:1") {
        const key = meeting.personName || meeting.attendees[0] || "Unknown"
        if (!tree[meeting.type].people![key]) tree[meeting.type].people![key] = []
        tree[meeting.type].people![key].push(meeting)
      } else if (isTeamBased) {
        const key = meeting.teamName || meeting.attendees[0] || "Unknown"
        if (!tree[meeting.type].teams![key]) tree[meeting.type].teams![key] = []
        tree[meeting.type].teams![key].push(meeting)
      } else {
        if (!tree[meeting.type].meetings) tree[meeting.type].meetings = []
        tree[meeting.type].meetings!.push(meeting)
      }
    })

    Object.values(tree).forEach((node) => {
      if (node.people) Object.values(node.people).forEach((ms) => ms.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))
      if (node.teams) Object.values(node.teams).forEach((ms) => ms.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))
      if (node.meetings) node.meetings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    })

    return tree
  }

  const tree = organizeTree()

  const toggleType = (type: string) => {
    const s = new Set(expandedTypes)
    s.has(type) ? s.delete(type) : s.add(type)
    setExpandedTypes(s)
  }
  const togglePerson = (name: string) => {
    const s = new Set(expandedPeople)
    s.has(name) ? s.delete(name) : s.add(name)
    setExpandedPeople(s)
  }
  const toggleTeam = (name: string) => {
    const s = new Set(expandedTeams)
    s.has(name) ? s.delete(name) : s.add(name)
    setExpandedTeams(s)
  }

  const expandAll = () => {
    const allPeople: string[] = []
    const allTeams: string[] = []
    Object.values(tree).forEach(node => {
      if (node.people) allPeople.push(...Object.keys(node.people))
      if (node.teams) allTeams.push(...Object.keys(node.teams))
    })
    setExpandedTypes(new Set(Object.keys(tree)))
    setExpandedPeople(new Set(allPeople))
    setExpandedTeams(new Set(allTeams))
  }
  const collapseAll = () => {
    setExpandedTypes(new Set())
    setExpandedPeople(new Set())
    setExpandedTeams(new Set())
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  const handleAddMeeting = async (newMeeting: Omit<Meeting, "id">) => {
    try {
      const backendMeeting = await createMeeting({
        title: newMeeting.title,
        meetingType: newMeeting.type as MeetingType,
        meetingDate: newMeeting.date,
        nextMeetingDate: newMeeting.nextMeetingDate || null,
        recurrence: (newMeeting.recurrence as RecurrenceType) || null,
        actionItems: newMeeting.actionItems || null,
        notes: newMeeting.notes || null,
        personId: newMeeting.personId || null,
        teamId: newMeeting.teamId || null,
      })

      const uiMeeting: Meeting = {
        id: backendMeeting.id,
        title: backendMeeting.title,
        type: backendMeeting.meetingType,
        date: backendMeeting.meetingDate,
        attendees: backendMeeting.attendees,
        actionItems: backendMeeting.actionItems || undefined,
        notes: backendMeeting.notes || undefined,
        tldr: backendMeeting.tldr,
        personName: backendMeeting.personName || undefined,
        teamName: backendMeeting.teamName || undefined,
        recurrence: backendMeeting.recurrence || undefined,
        nextMeetingDate: backendMeeting.nextMeetingDate || undefined,
        personId: backendMeeting.personId || undefined,
        teamId: backendMeeting.teamId || undefined,
      }

      setMeetings([uiMeeting, ...meetings])
      setSelectedMeeting(uiMeeting)

      if (aiConfig.configured && (uiMeeting.notes || uiMeeting.actionItems)) {
        setFollowUpDraftMeeting(uiMeeting)
        setShowFollowUpBanner(true)
      }

      const actionItemTexts = parseActionItems(newMeeting.actionItems || "")
      if (actionItemTexts.length > 0) {
        const dueDate = newMeeting.nextMeetingDate || null
        await Promise.all(
          actionItemTexts.map((title) =>
            createTask({ title, dueDate, priority: "Medium", category: "Task", status: "Not started", list: dueDate ? "week" : "backlog" })
          )
        )
      }
    } catch (error) {
      console.error('Failed to create meeting:', error)
      toast.error('Failed to create meeting')
      alert('Failed to create meeting. Please try again.')
    }
  }

  const handleUpdateMeeting = async (updatedMeeting: Meeting) => {
    if (updatedMeeting.nextMeetingDate && updatedMeeting.date) {
      if (new Date(updatedMeeting.nextMeetingDate) <= new Date(updatedMeeting.date)) {
        alert("Next meeting date must be after the meeting date")
        return
      }
    }

    try {
      const backendMeeting = await updateMeeting(updatedMeeting.id, {
        title: updatedMeeting.title,
        meetingType: updatedMeeting.type as MeetingType,
        meetingDate: updatedMeeting.date,
        nextMeetingDate: updatedMeeting.nextMeetingDate || null,
        recurrence: (updatedMeeting.recurrence as RecurrenceType) || null,
        actionItems: updatedMeeting.actionItems || null,
        notes: updatedMeeting.notes || null,
        personId: updatedMeeting.personId || null,
        teamId: updatedMeeting.teamId || null,
      })

      const uiMeeting: Meeting = {
        id: backendMeeting.id,
        title: backendMeeting.title,
        type: backendMeeting.meetingType,
        date: backendMeeting.meetingDate,
        attendees: backendMeeting.attendees,
        actionItems: backendMeeting.actionItems || undefined,
        notes: backendMeeting.notes || undefined,
        tldr: backendMeeting.tldr,
        personName: backendMeeting.personName || undefined,
        teamName: backendMeeting.teamName || undefined,
        recurrence: backendMeeting.recurrence || undefined,
        nextMeetingDate: backendMeeting.nextMeetingDate || undefined,
        personId: backendMeeting.personId || undefined,
        teamId: backendMeeting.teamId || undefined,
      }

      setMeetings(meetings.map(m => m.id === uiMeeting.id ? uiMeeting : m))
      setSelectedMeeting(uiMeeting)
    } catch (error) {
      console.error('Failed to update meeting:', error)
      toast.error('Failed to update meeting')
      alert('Failed to update meeting. Please try again.')
    }
  }

  const handleExtractActions = async () => {
    if (!selectedMeeting) return
    setExtractingActions(true)
    try {
      const notes = (selectedMeeting.notes ?? '').replace(/<[^>]+>/g, ' ')
      const actionItems = (selectedMeeting.actionItems ?? '').replace(/<[^>]+>/g, ' ')
      const result = await callAI({
        systemPrompt: ACTION_ITEM_EXTRACTION_SYSTEM,
        userPrompt: buildActionItemPrompt({
          meetingTitle: selectedMeeting.title,
          meetingType: selectedMeeting.type,
          attendees: selectedMeeting.attendees,
          notes,
          actionItems,
        }),
        maxTokens: 800,
        temperature: 0.2,
      })
      let parsed: { action_items: Array<{ title: string; assignee: string; due_date_hint: string | null }>; follow_ups: Array<{ title: string; person: string; due_date_hint: string | null }> }
      try {
        const jsonMatch = result.content.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
          toast.error('Could not parse AI response. Try again.')
          return
        }
        parsed = JSON.parse(jsonMatch[0])
      } catch {
        toast.error('Could not parse AI response. Try again.')
        return
      }
      const tasks = parsed.action_items ?? []
      const followUps = parsed.follow_ups ?? []
      let created = 0
      for (const item of tasks) {
        await createTask({
          title: item.title,
          description: `Extracted from: ${selectedMeeting.title} · Assignee: ${item.assignee}${item.due_date_hint ? ' · Due: ' + item.due_date_hint : ''}`,
          priority: 'Medium',
          category: 'Task',
          status: 'Not started',
          list: 'week',
          dueDate: null,
        })
        created++
      }
      const total = tasks.length + followUps.length
      if (total === 0) {
        toast.info('No action items found in notes.')
      } else {
        toast.success(`Created ${created} task${created !== 1 ? 's' : ''}${followUps.length > 0 ? ` + ${followUps.length} follow-up${followUps.length !== 1 ? 's' : ''} identified` : ''}.`)
      }
    } catch (err) {
      handleAIError(err)
    } finally {
      setExtractingActions(false)
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      const mainContainer = document.querySelector('main')
      if (!mainContainer) return
      const containerRect = mainContainer.getBoundingClientRect()
      const newWidth = e.clientX - containerRect.left
      if (newWidth >= 160 && newWidth <= 400) setLeftPanelWidth(newWidth)
    }
    const handleMouseUp = () => setIsResizing(false)

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }
    return undefined
  }, [isResizing])

  return (
    <div className="mtg-page">
      {/* Top bar */}
      <div className="page-topbar">
        <span className="page-topbar-title">Meetings</span>
        <button className="btn-primary" onClick={() => setIsAddDialogOpen(true)}>
          + Log meeting
        </button>
      </div>

      {/* Split panel */}
      <div className="mtg-split">
        {/* Left panel */}
        <div className="mtg-left" style={{ width: `${leftPanelWidth}px` }}>
          {/* Panel header */}
          <div className="mtg-left-header">
            <span className="mtg-left-header-title">All meetings</span>
            <div className="mtg-left-header-btns">
              <button onClick={expandAll} title="Expand all" className="mtg-expand-btn">
                <ChevronsDown style={{ width: "11px", height: "11px" }} />
              </button>
              <button onClick={collapseAll} title="Collapse all" className="mtg-expand-btn">
                <ChevronsRight style={{ width: "11px", height: "11px" }} />
              </button>
            </div>
          </div>

          {/* Tree */}
          <div className="mtg-tree">
            {Object.entries(tree).map(([type, node]) => (
              <div key={type}>
                {/* L1 — meeting type */}
                <button
                  onClick={() => toggleType(type)}
                  className="mtg-tree-l1-btn"
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "var(--surf-2)")}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "none")}
                >
                  {expandedTypes.has(type)
                    ? <ChevronDown style={{ width: "9px", height: "9px" }} />
                    : <ChevronRight style={{ width: "9px", height: "9px" }} />
                  }
                  {type}
                </button>

                {expandedTypes.has(type) && (
                  <div>
                    {/* 1:1 — grouped by person */}
                    {node.people && Object.entries(node.people).map(([personName, personMeetings]) => (
                      <div key={personName}>
                        <button
                          onClick={() => togglePerson(personName)}
                          className="mtg-tree-l2-btn"
                          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "var(--surf-2)")}
                          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "none")}
                        >
                          {expandedPeople.has(personName)
                            ? <ChevronDown style={{ width: "8px", height: "8px" }} />
                            : <ChevronRight style={{ width: "8px", height: "8px" }} />
                          }
                          {personName}
                        </button>
                        {expandedPeople.has(personName) && personMeetings.map((meeting) => {
                          const isActive = selectedMeeting?.id === meeting.id
                          return (
                            <button
                              key={meeting.id}
                              onClick={() => setSelectedMeeting(meeting)}
                              className="mtg-tree-l3-btn"
                              style={{
                                background: isActive ? "var(--surf-3)" : "none",
                                borderLeft: `2px solid ${isActive ? "#00f058" : "transparent"}`,
                              }}
                              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "var(--surf-2)" }}
                              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "none" }}
                            >
                              <span className="mtg-tree-l3-date" style={{ color: isActive ? "#00f058" : "var(--tree-l2-color)" }}>
                                {formatDate(meeting.date)}
                              </span>
                              {meeting.title && (
                                <span className="mtg-tree-l3-title">{meeting.title}</span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    ))}

                    {/* Team-based — grouped by team */}
                    {node.teams && Object.entries(node.teams).map(([teamName, teamMeetings]) => (
                      <div key={teamName}>
                        <button
                          onClick={() => toggleTeam(teamName)}
                          className="mtg-tree-l2-btn"
                          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "var(--surf-2)")}
                          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "none")}
                        >
                          {expandedTeams.has(teamName)
                            ? <ChevronDown style={{ width: "8px", height: "8px" }} />
                            : <ChevronRight style={{ width: "8px", height: "8px" }} />
                          }
                          {teamName}
                        </button>
                        {expandedTeams.has(teamName) && teamMeetings.map((meeting) => {
                          const isActive = selectedMeeting?.id === meeting.id
                          return (
                            <button
                              key={meeting.id}
                              onClick={() => setSelectedMeeting(meeting)}
                              className="mtg-tree-l3-btn"
                              style={{
                                background: isActive ? "var(--surf-3)" : "none",
                                borderLeft: `2px solid ${isActive ? "#00f058" : "transparent"}`,
                              }}
                              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "var(--surf-2)" }}
                              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "none" }}
                            >
                              <span className="mtg-tree-l3-date" style={{ color: isActive ? "#00f058" : "var(--tree-l2-color)" }}>
                                {formatDate(meeting.date)}
                              </span>
                              {meeting.title && (
                                <span className="mtg-tree-l3-title">{meeting.title}</span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    ))}

                    {/* Other meetings — flat list */}
                    {node.meetings && node.meetings.map((meeting) => {
                      const isActive = selectedMeeting?.id === meeting.id
                      return (
                        <button
                          key={meeting.id}
                          onClick={() => setSelectedMeeting(meeting)}
                          className="mtg-tree-flat-btn"
                          style={{
                            background: isActive ? "var(--surf-3)" : "none",
                            borderLeft: `2px solid ${isActive ? "#00f058" : "transparent"}`,
                          }}
                          onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "var(--surf-2)" }}
                          onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "none" }}
                        >
                          <span className="mtg-tree-flat-date" style={{ color: isActive ? "#00f058" : "var(--text-2)" }}>
                            {formatDate(meeting.date)}
                          </span>
                          {meeting.title && (
                            <span className="mtg-tree-flat-title">{meeting.title}</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Resizable divider */}
        <div
          className="mtg-divider"
          style={{ background: isResizing ? "var(--accent)" : undefined }}
          onMouseDown={handleMouseDown}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "var(--border-2)")}
          onMouseLeave={e => { if (!isResizing) (e.currentTarget as HTMLElement).style.background = "var(--border-1)" }}
        />

        {/* Right panel — meeting detail */}
        <div className="mtg-right">
          {selectedMeeting ? (
            <div>
              {/* Follow-up draft banner */}
              {showFollowUpBanner && followUpDraftMeeting?.id === selectedMeeting.id && (
                <div className="mtg-fu-banner">
                  <p className="mtg-fu-banner-text">Meeting saved. Draft a follow-up message?</p>
                  <div className="mtg-fu-banner-btns">
                    <button onClick={() => setFollowUpDraftOpen(true)} className="mtg-fu-draft-btn">
                      Draft message
                    </button>
                    <button onClick={() => setShowFollowUpBanner(false)} className="mtg-fu-dismiss-btn">
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {/* Title */}
              <h1 className="mtg-title-mb">{selectedMeeting.title}</h1>

              {/* Meta line */}
              <div className="mtg-meta-row">
                <p>
                  {formatDate(selectedMeeting.date)}
                  {selectedMeeting.nextMeetingDate && ` · next ${formatDate(selectedMeeting.nextMeetingDate)}`}
                  {selectedMeeting.attendees.length > 0 && ` · ${selectedMeeting.attendees.join(", ")}`}
                </p>
                {selectedMeeting.personId && (
                  <div className="mtg-meta-btns">
                    <button
                      onClick={() => setLogEvidenceOpen(true)}
                      className="mtg-action-btn"
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "var(--text-1)")}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "var(--text-2)")}
                    >
                      <BookOpen style={{ width: "11px", height: "11px" }} /> Log as Evidence
                    </button>
                    <button
                      onClick={() => setTrackFollowUpOpen(true)}
                      className="mtg-action-btn"
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "var(--text-1)")}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "var(--text-2)")}
                    >
                      <ListChecks style={{ width: "11px", height: "11px" }} /> Track as Follow-up
                    </button>
                  </div>
                )}
              </div>

              {/* TL;DR */}
              {selectedMeeting.tldr && (
                <div className="mtg-tldr-box">
                  <span className="mtg-tldr-label">AI Summary</span>
                  <p className="mtg-tldr-text">{selectedMeeting.tldr}</p>
                </div>
              )}

              {/* Meta fields grid */}
              <div className="mtg-meta-grid">
                <div>
                  <div className="form-label">Date</div>
                  <div className="mtg-field-input-wrap">
                    <Input
                      type="date"
                      value={selectedMeeting.date}
                      onChange={(e) => handleUpdateMeeting({ ...selectedMeeting, date: e.target.value })}
                      className="mtg-field-input"
                    />
                  </div>
                </div>
                {selectedMeeting.type === "1:1" && selectedMeeting.recurrence && selectedMeeting.recurrence !== "none" && selectedMeeting.nextMeetingDate && (
                  <div>
                    <div className="form-label">Next Meeting</div>
                    <div className="mtg-field-input-wrap">
                      <Input
                        type="date"
                        value={selectedMeeting.nextMeetingDate}
                        onChange={(e) => handleUpdateMeeting({ ...selectedMeeting, nextMeetingDate: e.target.value })}
                        className="mtg-field-input"
                      />
                    </div>
                  </div>
                )}
                <div>
                  <div className="form-label">Title</div>
                  <div className="mtg-field-input-wrap">
                    <Input
                      value={selectedMeeting.title}
                      onChange={(e) => handleUpdateMeeting({ ...selectedMeeting, title: e.target.value })}
                      placeholder="Meeting title"
                      className="mtg-field-input"
                    />
                  </div>
                </div>
                <div>
                  <div className="form-label">Attendees</div>
                  <div className="mtg-field-input-wrap">
                    <Input
                      value={selectedMeeting.attendees.join(", ")}
                      onChange={(e) => handleUpdateMeeting({
                        ...selectedMeeting,
                        attendees: e.target.value.split(",").map(a => a.trim()).filter(a => a.length > 0)
                      })}
                      placeholder="Names separated by commas"
                      className="mtg-field-input"
                    />
                  </div>
                </div>
              </div>

              {/* Action items */}
              <div className="mtg-actions-section">
                <div className="mtg-actions-header">
                  <div className="form-section-header" style={{ marginBottom: 0 }}>Action items</div>
                  <AIButton
                    configured={aiConfig.configured}
                    loading={aiConfig.loading}
                    generating={extractingActions}
                    onClick={handleExtractActions}
                    label="Extract from notes"
                    tooltip={aiConfig.tooltip}
                    showSetupLink={false}
                  />
                </div>
                <div className="mtg-actions-list">
                  {parseActionItems(selectedMeeting.actionItems || "").length > 0 ? (
                    parseActionItems(selectedMeeting.actionItems || "").map((item, idx) => (
                      <div key={idx} className="mtg-action-item">
                        <div className="mtg-action-item-dot" />
                        <span className="mtg-action-item-text">{item}</span>
                      </div>
                    ))
                  ) : (
                    <div className="mtg-actions-empty">
                      <span className="mtg-actions-empty-text">No action items</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Meeting notes */}
              <div>
                <div className="form-section-header">Meeting notes</div>
                <div className="mtg-notes-editor">
                  {/* Toolbar */}
                  <div className="mtg-notes-toolbar">
                    {["B", "I", "H1", "H2", "H3", "≡", "</>", "⊞"].map((label) => (
                      <button key={label} className="mtg-notes-toolbar-btn"
                        onMouseEnter={e => (e.currentTarget.style.color = "var(--text-1)")}
                        onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {/* Body */}
                  <div className="mtg-notes-body">
                    {selectedMeeting.notes ? (
                      <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedMeeting.notes) }} />
                    ) : (
                      <span className="mtg-notes-empty">Meeting notes, discussion points, decisions...</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mtg-right-empty">
              <p className="mtg-right-empty-text">Select a meeting to view details</p>
            </div>
          )}
        </div>
      </div>

      <MeetingFormDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSave={handleAddMeeting}
        availablePeople={people}
        availableTeams={teams}
        peopleWithIds={peopleWithIds}
        teamsWithIds={teamsWithIds}
        defaultType={newMeetingDefaults.type}
        defaultPersonId={newMeetingDefaults.personId}
      />

      {selectedMeeting?.personId && (
        <LogEvidenceModal
          open={logEvidenceOpen}
          onOpenChange={setLogEvidenceOpen}
          meetingId={selectedMeeting.id}
          meetingTitle={selectedMeeting.title}
          meetingDate={selectedMeeting.date}
          personId={selectedMeeting.personId}
          personName={selectedMeeting.personName}
          availablePeople={peopleWithIds}
        />
      )}
      {trackFollowUpOpen && selectedMeeting?.personId && (
        <FollowUpForm
          personId={selectedMeeting.personId}
          personName={selectedMeeting.personName ?? 'this person'}
          sourceType="meeting"
          sourceId={selectedMeeting.id}
          onSaved={() => setTrackFollowUpOpen(false)}
          onCancel={() => setTrackFollowUpOpen(false)}
        />
      )}

      {followUpDraftMeeting && (
        <FollowUpDraftModal
          open={followUpDraftOpen}
          onOpenChange={(open) => {
            setFollowUpDraftOpen(open)
            if (!open) setShowFollowUpBanner(false)
          }}
          meetingArgs={{
            personName: followUpDraftMeeting.personName ?? followUpDraftMeeting.attendees[0] ?? '',
            meetingTitle: followUpDraftMeeting.title,
            meetingDate: followUpDraftMeeting.date,
            notes: followUpDraftMeeting.notes ?? null,
            actionItems: followUpDraftMeeting.actionItems ?? null,
            followUps: [],
          }}
        />
      )}
    </div>
  )
}
