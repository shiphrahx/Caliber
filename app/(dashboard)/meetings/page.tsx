"use client"

import { useState, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import DOMPurify from "isomorphic-dompurify"
import { Input } from "@/components/ui/input"
import { ChevronRight, ChevronDown, ChevronsRight, ChevronsDown, BookOpen, ListChecks } from "lucide-react"
import { LogEvidenceModal } from "@/components/evidence/log-evidence-modal"
import { FollowUpForm } from "@/components/follow-ups/follow-up-form"
import { MeetingFormDialog } from "@/components/meeting-form-dialog"
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

        // Open new meeting dialog if navigated with ?new=1
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
        personName: backendMeeting.personName || undefined,
        teamName: backendMeeting.teamName || undefined,
        recurrence: backendMeeting.recurrence || undefined,
        nextMeetingDate: backendMeeting.nextMeetingDate || undefined,
        personId: backendMeeting.personId || undefined,
        teamId: backendMeeting.teamId || undefined,
      }

      setMeetings([uiMeeting, ...meetings])
      setSelectedMeeting(uiMeeting)

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
        parsed = JSON.parse(jsonMatch?.[0] ?? result.content)
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
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Top bar */}
      <div className="page-topbar">
        <span className="page-topbar-title">Meetings</span>
        <button className="btn-primary" onClick={() => setIsAddDialogOpen(true)}>
          + Log meeting
        </button>
      </div>

      {/* Split panel */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left panel */}
        <div style={{
          width: `${leftPanelWidth}px`,
          background: "var(--surf)",
          borderRight: "1px solid var(--border-1)",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
        }}>
          {/* Panel header */}
          <div style={{
            padding: "10px 12px",
            borderBottom: "1px solid var(--border-1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <span style={{ fontSize: "var(--text-meta)", fontWeight: 500, color: "var(--text-1)" }}>All meetings</span>
            <div style={{ display: "flex", gap: "2px" }}>
              <button
                onClick={expandAll}
                title="Expand all"
                style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer", padding: "2px" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--text-2)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}
              >
                <ChevronsDown style={{ width: "11px", height: "11px" }} />
              </button>
              <button
                onClick={collapseAll}
                title="Collapse all"
                style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer", padding: "2px" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--text-2)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}
              >
                <ChevronsRight style={{ width: "11px", height: "11px" }} />
              </button>
            </div>
          </div>

          {/* Tree */}
          <div style={{ padding: "4px 0" }}>
            {Object.entries(tree).map(([type, node]) => (
              <div key={type}>
                {/* Group header */}
                <button
                  onClick={() => toggleType(type)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "6px 12px",
                    fontSize: "var(--tree-l1-size)",
                    fontWeight: "var(--tree-l1-weight)" as React.CSSProperties["fontWeight"],
                    color: "var(--tree-l1-color)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    width: "100%",
                    textAlign: "left",
                  }}
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
                          style={{
                            padding: "4px 12px 2px 24px",
                            fontSize: "var(--tree-l2-size)",
                            color: "var(--tree-l2-color)",
                            fontWeight: "var(--tree-l2-weight)" as React.CSSProperties["fontWeight"],
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            width: "100%",
                            textAlign: "left",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
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
                              style={{
                                padding: "5px 12px 5px 32px",
                                cursor: "pointer",
                                display: "flex",
                                flexDirection: "column",
                                gap: "1px",
                                background: isActive ? "var(--surf-3)" : "none",
                                borderTop: "none",
                                borderRight: "none",
                                borderBottom: "none",
                                borderLeft: `2px solid ${isActive ? "#00f058" : "transparent"}`,
                                width: "100%",
                                textAlign: "left",
                              } as React.CSSProperties}
                              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "var(--surf-2)" }}
                              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "none" }}
                            >
                              <span style={{ fontSize: "var(--tree-l3-size)", fontWeight: 500, color: isActive ? "#00f058" : "var(--tree-l2-color)" }}>
                                {formatDate(meeting.date)}
                              </span>
                              {meeting.title && (
                                <span style={{ fontSize: "var(--tree-l3-size)", color: "var(--tree-l3-color)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
                                  {meeting.title}
                                </span>
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
                          style={{
                            padding: "4px 12px 2px 24px",
                            fontSize: "var(--tree-l2-size)",
                            color: "var(--tree-l2-color)",
                            fontWeight: "var(--tree-l2-weight)" as React.CSSProperties["fontWeight"],
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            width: "100%",
                            textAlign: "left",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
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
                              style={{
                                padding: "5px 12px 5px 32px",
                                cursor: "pointer",
                                display: "flex",
                                flexDirection: "column",
                                gap: "1px",
                                background: isActive ? "var(--surf-3)" : "none",
                                borderTop: "none",
                                borderRight: "none",
                                borderBottom: "none",
                                borderLeft: `2px solid ${isActive ? "#00f058" : "transparent"}`,
                                width: "100%",
                                textAlign: "left",
                              } as React.CSSProperties}
                              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "var(--surf-2)" }}
                              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "none" }}
                            >
                              <span style={{ fontSize: "var(--tree-l3-size)", fontWeight: 500, color: isActive ? "#00f058" : "var(--tree-l2-color)" }}>
                                {formatDate(meeting.date)}
                              </span>
                              {meeting.title && (
                                <span style={{ fontSize: "var(--tree-l3-size)", color: "var(--tree-l3-color)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
                                  {meeting.title}
                                </span>
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
                          style={{
                            padding: "5px 12px 5px 24px",
                            cursor: "pointer",
                            display: "flex",
                            flexDirection: "column",
                            gap: "1px",
                            background: isActive ? "var(--surf-3)" : "none",
                            borderTop: "none",
                            borderRight: "none",
                            borderBottom: "none",
                            borderLeft: `2px solid ${isActive ? "#00f058" : "transparent"}`,
                            width: "100%",
                            textAlign: "left",
                          } as React.CSSProperties}
                          onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "var(--surf-2)" }}
                          onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "none" }}
                        >
                          <span style={{ fontSize: "var(--text-meta)", color: isActive ? "#00f058" : "var(--text-2)" }}>
                            {formatDate(meeting.date)}
                          </span>
                          {meeting.title && (
                            <span style={{ fontSize: "var(--text-meta)", color: "var(--text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
                              {meeting.title}
                            </span>
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
          style={{
            width: "4px",
            background: isResizing ? "var(--accent)" : "var(--border-1)",
            cursor: "col-resize",
            flexShrink: 0,
            transition: "background 150ms",
          }}
          onMouseDown={handleMouseDown}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "var(--border-2)")}
          onMouseLeave={e => { if (!isResizing) (e.currentTarget as HTMLElement).style.background = "var(--border-1)" }}
        />

        {/* Right panel — meeting detail */}
        <div style={{ flex: 1, overflowY: "auto", padding: "22px 24px" }}>
          {selectedMeeting ? (
            <div>
              {/* Title */}
              <h1 style={{ marginBottom: "4px" }}>
                {selectedMeeting.title}
              </h1>
              {/* Meta line */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "16px" }}>
                <p>
                  {formatDate(selectedMeeting.date)}
                  {selectedMeeting.nextMeetingDate && ` · next ${formatDate(selectedMeeting.nextMeetingDate)}`}
                  {selectedMeeting.attendees.length > 0 && ` · ${selectedMeeting.attendees.join(", ")}`}
                </p>
                {selectedMeeting.personId && (
                  <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                    <button
                      onClick={() => setLogEvidenceOpen(true)}
                      style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "4px", fontSize: "var(--text-caption)", fontWeight: 600, color: "var(--text-2)", border: "1px solid var(--border-2)", background: "var(--surf-2)", cursor: "pointer", fontFamily: "var(--font-sans)" }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "var(--text-1)")}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "var(--text-2)")}
                    >
                      <BookOpen style={{ width: "11px", height: "11px" }} /> Log as Evidence
                    </button>
                    <button
                      onClick={() => setTrackFollowUpOpen(true)}
                      style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "4px", fontSize: "var(--text-caption)", fontWeight: 600, color: "var(--text-2)", border: "1px solid var(--border-2)", background: "var(--surf-2)", cursor: "pointer", fontFamily: "var(--font-sans)" }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "var(--text-1)")}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "var(--text-2)")}
                    >
                      <ListChecks style={{ width: "11px", height: "11px" }} /> Track as Follow-up
                    </button>
                  </div>
                )}
              </div>

              {/* Meta fields grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "16px" }}>
                <div>
                  <div className="form-label">Date</div>
                  <div style={{ background: "var(--surf-2)", border: "1px solid var(--border-1)", borderRadius: "5px", overflow: "hidden" }}>
                    <Input
                      type="date"
                      value={selectedMeeting.date}
                      onChange={(e) => handleUpdateMeeting({ ...selectedMeeting, date: e.target.value })}
                      style={{ fontSize: "var(--text-meta)", color: "var(--text-1)", background: "transparent", border: "none", padding: "6px 9px" }}
                    />
                  </div>
                </div>
                {selectedMeeting.type === "1:1" && selectedMeeting.recurrence && selectedMeeting.recurrence !== "none" && selectedMeeting.nextMeetingDate && (
                  <div>
                    <div className="form-label">Next Meeting</div>
                    <div style={{ background: "var(--surf-2)", border: "1px solid var(--border-1)", borderRadius: "5px", overflow: "hidden" }}>
                      <Input
                        type="date"
                        value={selectedMeeting.nextMeetingDate}
                        onChange={(e) => handleUpdateMeeting({ ...selectedMeeting, nextMeetingDate: e.target.value })}
                        style={{ fontSize: "var(--text-meta)", color: "var(--text-1)", background: "transparent", border: "none", padding: "6px 9px" }}
                      />
                    </div>
                  </div>
                )}
                <div>
                  <div className="form-label">Title</div>
                  <div style={{ background: "var(--surf-2)", border: "1px solid var(--border-1)", borderRadius: "5px", overflow: "hidden" }}>
                    <Input
                      value={selectedMeeting.title}
                      onChange={(e) => handleUpdateMeeting({ ...selectedMeeting, title: e.target.value })}
                      placeholder="Meeting title"
                      style={{ fontSize: "var(--text-meta)", color: "var(--text-1)", background: "transparent", border: "none", padding: "6px 9px" }}
                    />
                  </div>
                </div>
                <div>
                  <div className="form-label">Attendees</div>
                  <div style={{ background: "var(--surf-2)", border: "1px solid var(--border-1)", borderRadius: "5px", overflow: "hidden" }}>
                    <Input
                      value={selectedMeeting.attendees.join(", ")}
                      onChange={(e) => handleUpdateMeeting({
                        ...selectedMeeting,
                        attendees: e.target.value.split(",").map(a => a.trim()).filter(a => a.length > 0)
                      })}
                      placeholder="Names separated by commas"
                      style={{ fontSize: "var(--text-meta)", color: "var(--text-1)", background: "transparent", border: "none", padding: "6px 9px" }}
                    />
                  </div>
                </div>
              </div>

              {/* Action items */}
              <div style={{ marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
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
                <div style={{
                  background: "var(--surf-2)",
                  border: "1px solid var(--border-1)",
                  borderRadius: "6px",
                  overflow: "hidden",
                }}>
                  {parseActionItems(selectedMeeting.actionItems || "").length > 0 ? (
                    parseActionItems(selectedMeeting.actionItems || "").map((item, idx, arr) => (
                      <div key={idx} style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "7px 12px",
                        borderBottom: idx < arr.length - 1 ? "1px solid var(--border-1)" : "none",
                      }}>
                        <div style={{
                          width: "13px",
                          height: "13px",
                          borderRadius: "50%",
                          border: "1.5px solid var(--border-3)",
                          flexShrink: 0,
                        }} />
                        <span style={{ fontSize: "var(--text-label)", color: "var(--text-2)" }}>{item}</span>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: "7px 12px" }}>
                      <span style={{ fontSize: "var(--text-meta)", color: "var(--text-3)" }}>No action items</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Meeting notes */}
              <div>
                <div className="form-section-header">Meeting notes</div>
                <div style={{
                  background: "var(--surf-2)",
                  border: "1px solid var(--border-1)",
                  borderRadius: "6px",
                  overflow: "hidden",
                }}>
                  {/* Toolbar */}
                  <div style={{ display: "flex", gap: "2px", padding: "6px 8px", borderBottom: "1px solid var(--border-1)" }}>
                    {["B", "I", "H1", "H2", "H3", "≡", "</>", "⊞"].map((label) => (
                      <button key={label} style={{
                        background: "transparent",
                        border: "1px solid var(--border-2)",
                        color: "var(--text-3)",
                        borderRadius: "3px",
                        padding: "2px 7px",
                        fontSize: "var(--text-caption)",
                        cursor: "pointer",
                        fontFamily: "var(--font-sans)",
                      }}
                        onMouseEnter={e => (e.currentTarget.style.color = "var(--text-1)")}
                        onMouseLeave={e => (e.currentTarget.style.color = "var(--text-3)")}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {/* Body */}
                  <div style={{ padding: "12px 14px", fontSize: "var(--text-label)", color: "var(--text-2)", lineHeight: 1.75 }}>
                    {selectedMeeting.notes ? (
                      <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(selectedMeeting.notes) }} />
                    ) : (
                      <span style={{ color: "var(--text-3)" }}>Meeting notes, discussion points, decisions...</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
              <p style={{ color: "var(--text-3)" }}>Select a meeting to view details</p>
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
    </div>
  )
}
