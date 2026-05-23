"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MarkdownTextarea } from "@/components/ui/markdown-textarea"
import { ChevronRight, ChevronLeft, ArrowLeft, ChevronDown, Plus } from "lucide-react"
import { MeetingFormDialog } from "@/components/meeting-form-dialog"
import { AIButton, AIGeneratedBadge } from "@/components/ui/ai-button"
import { useAIConfig } from "@/lib/hooks/use-ai-config"
import { callAI, handleAIError } from "@/lib/services/ai"
import { ONE_ON_ONE_PREP_SYSTEM, buildOneonOnePrepPrompt } from "@/lib/ai/prompts"
import { getPeople, updatePerson, type Person } from "@/lib/services/people"
import { getTeams, type Team } from "@/lib/services/teams"
import { getMeetingsForPerson, createMeeting, type MeetingType, type RecurrenceType } from "@/lib/services/meetings"
import { LEVEL_BADGE } from "@/lib/badge-styles"
import { EvidenceSection } from "@/components/evidence/evidence-section"
import { SentimentTrendChart } from "@/components/evidence/sentiment-trend-chart"
import { CompetencySection } from "@/components/competency/competency-section"
import { FollowUpList } from "@/components/follow-ups/follow-up-list"
import { FollowUpForm } from "@/components/follow-ups/follow-up-form"
import { getFollowUpsForPerson, type FollowUp } from "@/lib/services/follow-ups"
import { usePersonSignals } from "@/lib/hooks/use-person-signals"
import { scoreToColor, scoreToBg } from "@/lib/signals/types"
import { isNewHire, NEW_HIRE_WINDOW_DAYS, daysBetween } from "@/lib/signals/compute"
import { AlertCircle, AlertTriangle, Info, Plus as PlusIcon } from "lucide-react"

interface TreeNode {
  type: string
  meetings: ExtendedMeeting[]
}

interface ExtendedMeeting {
  id: string
  title: string
  type: string
  date: string
  attendees: string[]
  personName?: string
  teamName?: string
  recurrence?: string
  nextMeetingDate?: string
  actionItems?: string
  notes?: string
  personId?: string
  teamId?: string
}


export default function PersonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [personId, setPersonId] = useState<string | null>(null)
  const [formData, setFormData] = useState<Person | null>(null)
  const [allTeams, setAllTeams] = useState<Team[]>([])
  const [allPeopleNames, setAllPeopleNames] = useState<string[]>([])
  const [allPeopleWithIds, setAllPeopleWithIds] = useState<Array<{ id: string; name: string }>>([])
  const [selectedAvailable, setSelectedAvailable] = useState<string[]>([])
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([])

  const [meetings, setMeetings] = useState<ExtendedMeeting[]>([])
  const [selectedMeeting, setSelectedMeeting] = useState<ExtendedMeeting | null>(null)
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set(["1:1"]))
  const [isAddMeetingDialogOpen, setIsAddMeetingDialogOpen] = useState(false)
  const [leftPanelWidth, setLeftPanelWidth] = useState(280)
  const [isResizing, setIsResizing] = useState(false)

  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [addingFollowUp, setAddingFollowUp] = useState(false)

  const [prepBrief, setPrepBrief] = useState<string | null>(null)
  const [generatingPrep, setGeneratingPrep] = useState(false)
  const [showPrepBadge, setShowPrepBadge] = useState(false)
  const aiConfig = useAIConfig()

  const { signals, score } = usePersonSignals(personId ?? '')

  useEffect(() => {
    params.then(({ id }) => setPersonId(id))
  }, [params])

  useEffect(() => {
    if (!personId) return
    Promise.all([
      getPeople(),
      getTeams(),
      getMeetingsForPerson(personId),
      getFollowUpsForPerson(personId),
    ]).then(([people, teams, backendMeetings, followUps]) => {
      const person = people.find(p => p.id === personId)
      if (person) setFormData(person)
      setAllPeopleNames(people.map(p => p.name))
      setAllPeopleWithIds(people.map(p => ({ id: p.id, name: p.name })))
      setAllTeams(teams)
      setMeetings(backendMeetings.map(m => ({
        id: m.id, title: m.title, type: m.meetingType, date: m.meetingDate,
        attendees: m.attendees,
        personName: m.personName || undefined, teamName: m.teamName || undefined,
        recurrence: m.recurrence || undefined, nextMeetingDate: m.nextMeetingDate || undefined,
        actionItems: m.actionItems || undefined, notes: m.notes || undefined,
        personId: m.personId || undefined, teamId: m.teamId || undefined,
      })))
      setFollowUps(followUps)
    }).catch(console.error)
  }, [personId])

  const tree = useMemo(() => {
    if (!formData) return {}
    const treeStructure: { [type: string]: TreeNode } = {}
    meetings.forEach((meeting) => {
      if (!treeStructure[meeting.type]) treeStructure[meeting.type] = { type: meeting.type, meetings: [] }
      treeStructure[meeting.type].meetings.push(meeting)
    })
    Object.values(treeStructure).forEach((node) => {
      node.meetings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    })
    return treeStructure
  }, [formData, meetings])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      const section = document.getElementById('meetings-section')
      if (!section) return
      const newWidth = e.clientX - section.getBoundingClientRect().left
      if (newWidth >= 200 && newWidth <= 500) setLeftPanelWidth(newWidth)
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

  if (!formData) {
    return (
      <div className="person-not-found">
        <p>Person not found</p>
      </div>
    )
  }

  const handleSave = async () => {
    if (!formData?.id) return
    try {
      await updatePerson(formData.id, formData)
      router.push("/people")
    } catch (error) {
      console.error('Failed to save person:', error)
    }
  }

  const handleCancel = () => router.push("/people")

  const availableTeamsList = allTeams.filter(team => !formData.teams.includes(team.name))
  const assignedTeamsList = allTeams.filter(team => formData.teams.includes(team.name))

  const handleAddToTeams = () => {
    const teamsToAdd = allTeams.filter(team => selectedAvailable.includes(team.id)).map(team => team.name)
    setFormData({ ...formData, teams: [...formData.teams, ...teamsToAdd] })
    setSelectedAvailable([])
  }

  const handleRemoveFromTeams = () => {
    const teamsToRemove = allTeams.filter(team => selectedTeamMembers.includes(team.id)).map(team => team.name)
    setFormData({ ...formData, teams: formData.teams.filter(t => !teamsToRemove.includes(t)) })
    setSelectedTeamMembers([])
  }

  const toggleAvailableSelection = (teamId: string) =>
    setSelectedAvailable(prev => prev.includes(teamId) ? prev.filter(id => id !== teamId) : [...prev, teamId])

  const toggleTeamMemberSelection = (teamId: string) =>
    setSelectedTeamMembers(prev => prev.includes(teamId) ? prev.filter(id => id !== teamId) : [...prev, teamId])

  const handleDoubleClickAvailable = (teamId: string) => {
    const team = allTeams.find(t => t.id === teamId)
    if (team) { setFormData({ ...formData, teams: [...formData.teams, team.name] }); setSelectedAvailable(prev => prev.filter(id => id !== teamId)) }
  }

  const handleDoubleClickTeamMember = (teamId: string) => {
    const team = allTeams.find(t => t.id === teamId)
    if (team) { setFormData({ ...formData, teams: formData.teams.filter(t => t !== team.name) }); setSelectedTeamMembers(prev => prev.filter(id => id !== teamId)) }
  }

  const toggleType = (type: string) => {
    const s = new Set(expandedTypes)
    s.has(type) ? s.delete(type) : s.add(type)
    setExpandedTypes(s)
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  const handleAddMeeting = async (newMeeting: any) => {
    try {
      const resolvedPersonId = newMeeting.type === "1:1" ? (newMeeting.personId || personId) : null
      const resolvedTeamId = newMeeting.type !== "1:1" && newMeeting.type !== "Other" ? (newMeeting.teamId || null) : null
      const backendMeeting = await createMeeting({
        title: newMeeting.title, meetingType: newMeeting.type as MeetingType,
        meetingDate: newMeeting.date, nextMeetingDate: newMeeting.nextMeetingDate || null,
        recurrence: (newMeeting.recurrence as RecurrenceType) || null,
        actionItems: newMeeting.actionItems || null, notes: newMeeting.notes || null,
        personId: resolvedPersonId, teamId: resolvedTeamId,
      })
      const meeting: ExtendedMeeting = {
        id: backendMeeting.id, title: backendMeeting.title, type: backendMeeting.meetingType,
        date: backendMeeting.meetingDate, attendees: backendMeeting.attendees,
        personName: backendMeeting.personName || undefined, teamName: backendMeeting.teamName || undefined,
        recurrence: backendMeeting.recurrence || undefined, nextMeetingDate: backendMeeting.nextMeetingDate || undefined,
        actionItems: backendMeeting.actionItems || undefined, notes: backendMeeting.notes || undefined,
        personId: backendMeeting.personId || undefined, teamId: backendMeeting.teamId || undefined,
      }
      setMeetings([...meetings, meeting])
      setSelectedMeeting(meeting)
    } catch (error) {
      console.error('Failed to create meeting:', error)
      alert('Failed to save meeting. Please try again.')
    }
  }

  const handleUpdateMeeting = (updatedMeeting: ExtendedMeeting) => {
    if (updatedMeeting.nextMeetingDate && updatedMeeting.date) {
      if (new Date(updatedMeeting.nextMeetingDate) <= new Date(updatedMeeting.date)) {
        alert("Next meeting date must be after the meeting date")
        return
      }
    }
    setMeetings(meetings.map(m => m.id === updatedMeeting.id ? updatedMeeting : m))
    setSelectedMeeting(updatedMeeting)
  }

  const handleGeneratePrep = async () => {
    if (!formData || !personId) return
    setGeneratingPrep(true)
    try {
      const recentMeetings = [...meetings]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 3)
        .map(m => ({ title: m.title, meetingDate: m.date, notes: m.notes ?? null, actionItems: m.actionItems ?? null }))
      const openFollowUps = followUps
        .filter(f => f.status === 'open')
        .slice(0, 5)
        .map(f => ({ title: f.title, createdAt: f.createdAt }))
      const competencyGaps: Array<{ areaName: string; assessedLevel: string; expectedLevel: string }> = []
      const result = await callAI({
        systemPrompt: ONE_ON_ONE_PREP_SYSTEM,
        userPrompt: buildOneonOnePrepPrompt({
          name: formData.name,
          role: formData.role,
          level: formData.level,
          recentMeetings,
          openFollowUps,
          recentEvidence: [],
          competencyGaps,
        }),
        maxTokens: 600,
        temperature: 0.3,
      })
      setPrepBrief(result.content)
      setShowPrepBadge(true)
    } catch (err) {
      handleAIError(err)
    } finally {
      setGeneratingPrep(false)
    }
  }

  return (
    <div className="person-page">
      {/* Header */}
      <div className="person-header">
        <button className="person-back-btn" onClick={handleCancel}>
          <ArrowLeft /> Back to People
        </button>
        <div className="person-title-row">
          <div>
            <h1>{formData.name}</h1>
            <p className="person-role-sub">{formData.role}</p>
          </div>
          {/* Attention indicator */}
          {signals.length > 0 && (
            <div className="person-signals-col">
              <span style={{
                fontSize: "var(--text-caption)",
                fontWeight: 600,
                color: scoreToColor(score),
                background: scoreToBg(score),
                border: `1px solid ${scoreToColor(score)}40`,
                borderRadius: "4px",
                padding: "3px 8px",
                whiteSpace: "nowrap",
              }}>
                {signals.length} thing{signals.length === 1 ? '' : 's'} to action
              </span>
              {signals.map((s, i) => (
                <div key={i} className="person-signal-row">
                  {s.severity === "critical"
                    ? <AlertCircle className="person-signal-icon" style={{ color: "#ff6b6b" }} />
                    : s.severity === "warning"
                    ? <AlertTriangle className="person-signal-icon" style={{ color: "#ffa94d" }} />
                    : <Info className="person-signal-icon" style={{ color: "var(--text-3)" }} />
                  }
                  <span className="person-signal-msg">{s.message}</span>
                  {s.meta?.isNewHire === true && (
                    <span className="person-newhire-badge">New hire</span>
                  )}
                </div>
              ))}
            </div>
          )}
          {/* Onboarding progress bar — visible for first 90 days */}
          {formData.startDate && isNewHire(formData.startDate, new Date()) && (() => {
            const daysIn = daysBetween(new Date(formData.startDate + 'T00:00:00'), new Date())
            const pct = Math.min(100, Math.round((daysIn / NEW_HIRE_WINDOW_DAYS) * 100))
            return (
              <div className="person-onboarding-wrap">
                <div className="person-onboarding-header">
                  <span className="person-onboarding-label">Onboarding</span>
                  <span className="person-onboarding-days">Day {daysIn} / {NEW_HIRE_WINDOW_DAYS}</span>
                </div>
                <div className="person-onboarding-bar-track">
                  <div className="person-onboarding-bar-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })()}
        </div>
      </div>

      {/* Profile card */}
      <div className="person-profile-card">
        <div className="person-profile-grid">
          {/* Left column */}
          <div className="person-profile-left">
            <div className="person-profile-field">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Sarah Miller" required />
            </div>
            <div className="person-profile-field">
              <Label htmlFor="role">Role *</Label>
              <Input id="role" value={formData.role ?? ''} onChange={(e) => setFormData({ ...formData, role: e.target.value })} placeholder="e.g. Senior Software Engineer" required />
            </div>
            <div className="person-profile-field">
              <Label>Seniority Level</Label>
              <div className="person-level-btns">
                {(Object.keys(LEVEL_BADGE) as Array<keyof typeof LEVEL_BADGE>).map((label) => {
                  const { bg, color } = LEVEL_BADGE[label]
                  const isOther = label === "Other"
                  const isSelected = isOther
                    ? (formData.level !== null && formData.level !== "" && !["Junior", "Mid", "Senior", "Staff", "Principal"].includes(formData.level ?? ""))
                    : formData.level === label
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setFormData({ ...formData, level: isOther ? "" : label })}
                      style={{
                        padding: "3px 10px", borderRadius: "4px", fontSize: "var(--text-label)", fontWeight: 500,
                        fontFamily: "var(--font-sans)", background: isSelected ? bg : "var(--surf-2)",
                        color: isSelected ? color : "var(--text-3)", border: `1px solid ${isSelected ? color + "40" : "var(--border-2)"}`,
                        cursor: "pointer",
                      }}
                    >{label}</button>
                  )
                })}
              </div>
              <Input id="level" value={formData.level ?? ''} onChange={(e) => setFormData({ ...formData, level: e.target.value })} placeholder="Or type custom level" />
            </div>
            <div className="person-profile-field">
              <Label htmlFor="startDate">Start Date</Label>
              <Input id="startDate" type="date" value={formData.startDate ?? ''} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
            </div>

            {/* Teams dual-list */}
            <div className="person-profile-field">
              <Label>Teams</Label>
              <div className="dual-list-row">
                <div className="dual-list-col">
                  <label className="dual-list-label">Available Teams</label>
                  <div className="dual-list-box">
                    {availableTeamsList.length > 0 ? availableTeamsList.map((team) => (
                      <div key={team.id}
                        onClick={() => toggleAvailableSelection(team.id!)}
                        onDoubleClick={() => handleDoubleClickAvailable(team.id!)}
                        className="dual-list-item"
                        style={{
                          color: selectedAvailable.includes(team.id!) ? "#111" : "var(--text-2)",
                          borderLeft: selectedAvailable.includes(team.id!) ? "2px solid #00f058" : "2px solid transparent",
                        }}
                      >
                        {team.name}
                      </div>
                    )) : (
                      <div className="dual-list-empty">All teams assigned</div>
                    )}
                  </div>
                </div>
                <div className="dual-list-arrows">
                  <button type="button" onClick={handleAddToTeams} disabled={selectedAvailable.length === 0} className="dual-list-arrow-btn">
                    <ChevronRight />
                  </button>
                  <button type="button" onClick={handleRemoveFromTeams} disabled={selectedTeamMembers.length === 0} className="dual-list-arrow-btn">
                    <ChevronLeft />
                  </button>
                </div>
                <div className="dual-list-col">
                  <label className="dual-list-label">Assigned Teams ({assignedTeamsList.length})</label>
                  <div className="dual-list-box">
                    {assignedTeamsList.length > 0 ? assignedTeamsList.map((team) => (
                      <div key={team.id}
                        onClick={() => toggleTeamMemberSelection(team.id!)}
                        onDoubleClick={() => handleDoubleClickTeamMember(team.id!)}
                        className="dual-list-item"
                        style={{
                          color: selectedTeamMembers.includes(team.id!) ? "#111" : "var(--text-2)",
                          borderLeft: selectedTeamMembers.includes(team.id!) ? "2px solid #00f058" : "2px solid transparent",
                        }}
                      >
                        {team.name}
                      </div>
                    )) : (
                      <div className="dual-list-empty">No teams assigned</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right column — notes */}
          <div className="person-profile-right">
            <Label style={{ marginBottom: "8px" }}>Notes</Label>
            <div style={{ flex: 1 }}>
              <MarkdownTextarea value={formData.notes || ""} onValueChange={(value) => setFormData({ ...formData, notes: value })} placeholder="Any additional notes about this person..." className="h-full resize-none" />
            </div>
          </div>
        </div>

        <div className="person-profile-actions">
          <Button type="button" variant="outline" onClick={handleCancel}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </div>

      {/* Meetings section */}
      <div className="person-meetings-card">
        <div className="person-meetings-header">
          <div>
            <h2>Meetings</h2>
            <p className="person-meetings-title-sub">All meetings involving {formData.name}</p>
          </div>
          <button className="person-meetings-log-btn" onClick={() => setIsAddMeetingDialogOpen(true)}>
            <Plus /> Log meeting
          </button>
        </div>

        <div id="meetings-section" className="person-meetings-body">
          {/* Left panel */}
          <div className="person-meetings-left" style={{ width: `${leftPanelWidth}px` }}>
            <div className="person-meetings-left-inner">
              {Object.keys(tree).length === 0 ? (
                <div className="person-meetings-left-empty">
                  <p style={{ marginBottom: "16px" }}>No meetings logged yet</p>
                  <button onClick={() => setIsAddMeetingDialogOpen(true)} className="person-meetings-left-empty-btn">
                    <Plus /> Log First Meeting
                  </button>
                </div>
              ) : (
                Object.entries(tree).map(([type, node]) => (
                  <div key={type}>
                    <button onClick={() => toggleType(type)} className="person-tree-type-btn">
                      {expandedTypes.has(type) ? <ChevronDown /> : <ChevronRight />}
                      {type} ({node.meetings.length})
                    </button>
                    {expandedTypes.has(type) && (
                      <div className="person-tree-meetings">
                        {node.meetings.map((meeting) => {
                          const isActive = selectedMeeting?.id === meeting.id
                          return (
                            <button key={meeting.id} onClick={() => setSelectedMeeting(meeting)}
                              className="person-tree-meeting-btn"
                              style={{
                                background: isActive ? "var(--surf-3)" : "none",
                                borderLeft: `2px solid ${isActive ? "#00f058" : "transparent"}`,
                                color: isActive ? "#00f058" : "var(--text-3)",
                              }}
                              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "var(--surf-3)" }}
                              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "none" }}
                            >
                              {formatDate(meeting.date)}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Resizable divider */}
          <div
            className="person-meetings-divider"
            onMouseDown={(e) => { e.preventDefault(); setIsResizing(true) }}
          />

          {/* Right panel */}
          <div className="person-meetings-right">
            {selectedMeeting ? (
              <div className="person-meeting-detail">
                {/* 1:1 Prep Brief */}
                {selectedMeeting.type === "1:1" && (
                  <div className="person-prep-box">
                    <div className="person-prep-header" style={{ marginBottom: prepBrief ? "12px" : 0 }}>
                      <span className="person-prep-label">1:1 Prep</span>
                      <div className="person-prep-actions">
                        {showPrepBadge && prepBrief && <AIGeneratedBadge onDismiss={() => setShowPrepBadge(false)} />}
                        <AIButton
                          configured={aiConfig.configured}
                          loading={aiConfig.loading}
                          generating={generatingPrep}
                          onClick={handleGeneratePrep}
                          label={prepBrief ? "Regenerate" : "Generate prep brief"}
                          tooltip={aiConfig.tooltip}
                          showSetupLink={true}
                        />
                      </div>
                    </div>
                    {prepBrief && (
                      <div className="person-prep-content">{prepBrief}</div>
                    )}
                  </div>
                )}
                <div className="person-meeting-2col">
                  <div className="person-meeting-field">
                    <Label>Date</Label>
                    <Input type="date" value={selectedMeeting.date} onChange={(e) => handleUpdateMeeting({ ...selectedMeeting, date: e.target.value })} />
                  </div>
                  {selectedMeeting.type === "1:1" && selectedMeeting.recurrence && selectedMeeting.recurrence !== "none" && selectedMeeting.nextMeetingDate && (
                    <div className="person-meeting-field">
                      <Label>Next Meeting</Label>
                      <Input type="date" value={selectedMeeting.nextMeetingDate} onChange={(e) => handleUpdateMeeting({ ...selectedMeeting, nextMeetingDate: e.target.value })} />
                    </div>
                  )}
                </div>
                <div className="person-meeting-2col">
                  <div className="person-meeting-field">
                    <Label>Title</Label>
                    <Input value={selectedMeeting.title} onChange={(e) => handleUpdateMeeting({ ...selectedMeeting, title: e.target.value })} placeholder="Meeting title" />
                  </div>
                  <div className="person-meeting-field">
                    <Label>Attendees</Label>
                    <Input value={selectedMeeting.attendees.join(", ")} onChange={(e) => handleUpdateMeeting({ ...selectedMeeting, attendees: e.target.value.split(",").map(a => a.trim()).filter(a => a.length > 0) })} placeholder="Names separated by commas" />
                  </div>
                </div>
                <div className="person-meeting-field">
                  <Label>Action Items</Label>
                  <MarkdownTextarea value={selectedMeeting.actionItems || ""} onValueChange={(value) => handleUpdateMeeting({ ...selectedMeeting, actionItems: value })} placeholder={"- Action item 1\n- Action item 2"} rows={4} />
                </div>
                <div className="person-meeting-field">
                  <Label>Meeting Notes</Label>
                  <MarkdownTextarea value={selectedMeeting.notes || ""} onValueChange={(value) => handleUpdateMeeting({ ...selectedMeeting, notes: value })} placeholder="Meeting notes, discussion points, decisions..." rows={8} />
                </div>
              </div>
            ) : (
              <div className="person-meetings-right-empty">
                <p>Select a meeting to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Follow-ups section */}
      <div className="person-followups-card">
        <div className="person-followups-header">
          <h2 className="person-followups-title">Follow-ups</h2>
          <button className="person-followup-add-btn" onClick={() => setAddingFollowUp(true)}>
            <PlusIcon /> Add follow-up
          </button>
        </div>
        <FollowUpList
          followUps={followUps}
          onChanged={() => getFollowUpsForPerson(personId!).then(setFollowUps).catch(console.error)}
        />
      </div>

      {/* Sentiment Trend */}
      <div className="person-section-mt">
        <SentimentTrendChart personId={personId!} days={60} />
      </div>

      {/* Evidence section */}
      <div className="person-section-mt">
        <EvidenceSection personId={personId!} personName={formData.name} allPeople={allPeopleWithIds} />
      </div>

      {/* Competencies section */}
      <CompetencySection personId={personId!} personLevel={formData.level ?? null} personName={formData.name} />

      {addingFollowUp && personId && (
        <FollowUpForm
          personId={personId}
          personName={formData.name}
          sourceType="manual"
          onSaved={() => {
            setAddingFollowUp(false)
            getFollowUpsForPerson(personId).then(setFollowUps).catch(console.error)
          }}
          onCancel={() => setAddingFollowUp(false)}
        />
      )}

      <MeetingFormDialog
        open={isAddMeetingDialogOpen}
        onOpenChange={setIsAddMeetingDialogOpen}
        onSave={handleAddMeeting}
        availablePeople={allPeopleNames}
        availableTeams={allTeams.map(t => t.name)}
        defaultPerson={formData.name}
        peopleWithIds={allPeopleWithIds}
        teamsWithIds={allTeams.map(t => ({ id: t.id, name: t.name }))}
      />
    </div>
  )
}
