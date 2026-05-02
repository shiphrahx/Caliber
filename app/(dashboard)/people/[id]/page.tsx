"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MarkdownTextarea } from "@/components/ui/markdown-textarea"
import { ChevronRight, ChevronLeft, ArrowLeft, ChevronDown, Plus } from "lucide-react"
import { MeetingFormDialog } from "@/components/meeting-form-dialog"
import { getPeople, updatePerson, type Person } from "@/lib/services/people"
import { getTeams, type Team } from "@/lib/services/teams"
import { getMeetingsForPerson, createMeeting, type MeetingType, type RecurrenceType } from "@/lib/services/meetings"
import { LEVEL_BADGE } from "@/lib/badge-styles"

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

  useEffect(() => {
    params.then(({ id }) => setPersonId(id))
  }, [params])

  useEffect(() => {
    if (!personId) return
    getPeople().then(people => {
      const person = people.find(p => p.id === personId)
      if (person) setFormData(person)
      setAllPeopleNames(people.map(p => p.name))
      setAllPeopleWithIds(people.map(p => ({ id: p.id, name: p.name })))
    }).catch(console.error)
    getTeams().then(setAllTeams).catch(console.error)
    getMeetingsForPerson(personId).then(backendMeetings => {
      setMeetings(backendMeetings.map(m => ({
        id: m.id, title: m.title, type: m.meetingType, date: m.meetingDate,
        attendees: m.attendees,
        personName: m.personName || undefined, teamName: m.teamName || undefined,
        recurrence: m.recurrence || undefined, nextMeetingDate: m.nextMeetingDate || undefined,
        actionItems: m.actionItems || undefined, notes: m.notes || undefined,
        personId: m.personId || undefined, teamId: m.teamId || undefined,
      })))
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
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

  const dualListStyle = { border: "1px solid var(--border-2)", borderRadius: "4px", height: "192px", overflowY: "auto" as const, background: "var(--surf-2)" }
  const dualLabelStyle = { fontSize: "var(--text-label)", color: "var(--text-3)", display: "block", marginBottom: "4px" }

  return (
    <div style={{ padding: "32px" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <button
          onClick={handleCancel}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: "var(--text-2)", cursor: "pointer", fontSize: "var(--text-label)", marginBottom: "16px", padding: "4px 0" }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--text-1)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--text-2)")}
        >
          <ArrowLeft style={{ width: "14px", height: "14px" }} /> Back to People
        </button>
        <h1>{formData.name}</h1>
        <p style={{ marginTop: "2px" }}>{formData.role}</p>
      </div>

      {/* Profile card */}
      <div style={{ background: "var(--surf)", border: "1px solid var(--border-1)", borderRadius: "8px", padding: "24px", marginBottom: "24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          {/* Left column */}
          <div style={{ display: "grid", gap: "16px" }}>
            <div style={{ display: "grid", gap: "6px" }}>
              <Label htmlFor="name">Name *</Label>
              <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Sarah Miller" required />
            </div>
            <div style={{ display: "grid", gap: "6px" }}>
              <Label htmlFor="role">Role *</Label>
              <Input id="role" value={formData.role ?? ''} onChange={(e) => setFormData({ ...formData, role: e.target.value })} placeholder="e.g. Senior Software Engineer" required />
            </div>
            <div style={{ display: "grid", gap: "6px" }}>
              <Label>Seniority Level</Label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
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
            <div style={{ display: "grid", gap: "6px" }}>
              <Label htmlFor="startDate">Start Date</Label>
              <Input id="startDate" type="date" value={formData.startDate ?? ''} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} />
            </div>

            {/* Teams dual-list */}
            <div style={{ display: "grid", gap: "6px" }}>
              <Label>Teams</Label>
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <label style={dualLabelStyle}>Available Teams</label>
                  <div style={dualListStyle}>
                    {availableTeamsList.length > 0 ? availableTeamsList.map((team) => (
                      <div key={team.id} onClick={() => toggleAvailableSelection(team.id!)} onDoubleClick={() => handleDoubleClickAvailable(team.id!)} className="dual-list-item"
                        style={{ padding: "6px 12px", fontSize: "var(--text-label)", cursor: "pointer", userSelect: "none", color: selectedAvailable.includes(team.id!) ? "#111" : "var(--text-2)", borderLeft: selectedAvailable.includes(team.id!) ? "2px solid #00f058" : "2px solid transparent" }}>
                        {team.name}
                      </div>
                    )) : (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: "var(--text-label)", color: "var(--text-3)" }}>All teams assigned</div>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <button type="button" onClick={handleAddToTeams} disabled={selectedAvailable.length === 0}
                    style={{ width: "32px", height: "32px", borderRadius: "4px", border: "1px solid var(--border-2)", background: "var(--surf-2)", color: "var(--text-2)", cursor: selectedAvailable.length === 0 ? "not-allowed" : "pointer", opacity: selectedAvailable.length === 0 ? 0.4 : 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <ChevronRight style={{ width: "16px", height: "16px" }} />
                  </button>
                  <button type="button" onClick={handleRemoveFromTeams} disabled={selectedTeamMembers.length === 0}
                    style={{ width: "32px", height: "32px", borderRadius: "4px", border: "1px solid var(--border-2)", background: "var(--surf-2)", color: "var(--text-2)", cursor: selectedTeamMembers.length === 0 ? "not-allowed" : "pointer", opacity: selectedTeamMembers.length === 0 ? 0.4 : 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <ChevronLeft style={{ width: "16px", height: "16px" }} />
                  </button>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={dualLabelStyle}>Assigned Teams ({assignedTeamsList.length})</label>
                  <div style={dualListStyle}>
                    {assignedTeamsList.length > 0 ? assignedTeamsList.map((team) => (
                      <div key={team.id} onClick={() => toggleTeamMemberSelection(team.id!)} onDoubleClick={() => handleDoubleClickTeamMember(team.id!)} className="dual-list-item"
                        style={{ padding: "6px 12px", fontSize: "var(--text-label)", cursor: "pointer", userSelect: "none", color: selectedTeamMembers.includes(team.id!) ? "#111" : "var(--text-2)", borderLeft: selectedTeamMembers.includes(team.id!) ? "2px solid #00f058" : "2px solid transparent" }}>
                        {team.name}
                      </div>
                    )) : (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: "var(--text-label)", color: "var(--text-3)" }}>No teams assigned</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right column — notes */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <Label style={{ marginBottom: "8px" }}>Notes</Label>
            <div style={{ flex: 1 }}>
              <MarkdownTextarea value={formData.notes || ""} onValueChange={(value) => setFormData({ ...formData, notes: value })} placeholder="Any additional notes about this person..." className="h-full resize-none" />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "24px" }}>
          <Button type="button" variant="outline" onClick={handleCancel}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </div>

      {/* Meetings section */}
      <div style={{ background: "var(--surf)", border: "1px solid var(--border-1)", borderRadius: "8px", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2>Meetings</h2>
            <p style={{ marginTop: "2px" }}>All meetings involving {formData.name}</p>
          </div>
          <button
            onClick={() => setIsAddMeetingDialogOpen(true)}
            style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "linear-gradient(90deg, #00ffe5 0%, #00f058 100%)", border: "none", color: "#0a1a0a", padding: "4px 10px", borderRadius: "4px", fontSize: "var(--text-caption)", fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}
          >
            <Plus style={{ width: "11px", height: "11px" }} /> Log meeting
          </button>
        </div>

        <div id="meetings-section" style={{ display: "flex", height: "900px", overflow: "hidden" }}>
          {/* Left panel */}
          <div style={{ width: `${leftPanelWidth}px`, flexShrink: 0, background: "var(--surf-2)", borderRight: "1px solid var(--border-1)", overflowY: "auto" }}>
            <div style={{ padding: "8px 0" }}>
              {Object.keys(tree).length === 0 ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 16px", textAlign: "center" }}>
                  <p style={{ marginBottom: "16px" }}>No meetings logged yet</p>
                  <button onClick={() => setIsAddMeetingDialogOpen(true)}
                    style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "linear-gradient(90deg, #00ffe5 0%, #00f058 100%)", border: "none", color: "#0a1a0a", padding: "4px 10px", borderRadius: "4px", fontSize: "var(--text-caption)", fontWeight: 600, cursor: "pointer" }}>
                    <Plus style={{ width: "11px", height: "11px" }} /> Log First Meeting
                  </button>
                </div>
              ) : (
                Object.entries(tree).map(([type, node]) => (
                  <div key={type}>
                    <button onClick={() => toggleType(type)}
                      style={{ display: "flex", alignItems: "center", gap: "6px", width: "100%", padding: "6px 12px", background: "none", border: "none", cursor: "pointer", fontSize: "var(--text-meta)", fontWeight: 500, color: "var(--text-2)", textAlign: "left" }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "var(--surf-3)")}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "none")}
                    >
                      {expandedTypes.has(type) ? <ChevronDown style={{ width: "12px", height: "12px" }} /> : <ChevronRight style={{ width: "12px", height: "12px" }} />}
                      {type} ({node.meetings.length})
                    </button>
                    {expandedTypes.has(type) && (
                      <div style={{ paddingLeft: "20px" }}>
                        {node.meetings.map((meeting) => {
                          const isActive = selectedMeeting?.id === meeting.id
                          return (
                            <button key={meeting.id} onClick={() => setSelectedMeeting(meeting)}
                              style={{ display: "block", width: "100%", padding: "5px 12px", background: isActive ? "var(--surf-3)" : "none", borderTop: "none", borderRight: "none", borderBottom: "none", borderLeft: `2px solid ${isActive ? "#00f058" : "transparent"}`, cursor: "pointer", fontSize: "var(--text-caption)", color: isActive ? "#00f058" : "var(--text-3)", textAlign: "left" }}
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
          <div style={{ width: "4px", background: "var(--border-1)", cursor: "col-resize", flexShrink: 0 }}
            onMouseDown={(e) => { e.preventDefault(); setIsResizing(true) }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "var(--border-2)")}
            onMouseLeave={e => { if (!isResizing) (e.currentTarget as HTMLElement).style.background = "var(--border-1)" }}
          />

          {/* Right panel */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
            {selectedMeeting ? (
              <div style={{ display: "grid", gap: "16px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div style={{ display: "grid", gap: "4px" }}>
                    <Label>Date</Label>
                    <Input type="date" value={selectedMeeting.date} onChange={(e) => handleUpdateMeeting({ ...selectedMeeting, date: e.target.value })} />
                  </div>
                  {selectedMeeting.type === "1:1" && selectedMeeting.recurrence && selectedMeeting.recurrence !== "none" && selectedMeeting.nextMeetingDate && (
                    <div style={{ display: "grid", gap: "4px" }}>
                      <Label>Next Meeting</Label>
                      <Input type="date" value={selectedMeeting.nextMeetingDate} onChange={(e) => handleUpdateMeeting({ ...selectedMeeting, nextMeetingDate: e.target.value })} />
                    </div>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div style={{ display: "grid", gap: "4px" }}>
                    <Label>Title</Label>
                    <Input value={selectedMeeting.title} onChange={(e) => handleUpdateMeeting({ ...selectedMeeting, title: e.target.value })} placeholder="Meeting title" />
                  </div>
                  <div style={{ display: "grid", gap: "4px" }}>
                    <Label>Attendees</Label>
                    <Input value={selectedMeeting.attendees.join(", ")} onChange={(e) => handleUpdateMeeting({ ...selectedMeeting, attendees: e.target.value.split(",").map(a => a.trim()).filter(a => a.length > 0) })} placeholder="Names separated by commas" />
                  </div>
                </div>
                <div style={{ display: "grid", gap: "4px" }}>
                  <Label>Action Items</Label>
                  <MarkdownTextarea value={selectedMeeting.actionItems || ""} onValueChange={(value) => handleUpdateMeeting({ ...selectedMeeting, actionItems: value })} placeholder={"- Action item 1\n- Action item 2"} rows={4} />
                </div>
                <div style={{ display: "grid", gap: "4px" }}>
                  <Label>Meeting Notes</Label>
                  <MarkdownTextarea value={selectedMeeting.notes || ""} onValueChange={(value) => handleUpdateMeeting({ ...selectedMeeting, notes: value })} placeholder="Meeting notes, discussion points, decisions..." rows={8} />
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center" }}>
                <p>Select a meeting to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>

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
