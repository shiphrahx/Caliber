"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MarkdownTextarea } from "@/components/ui/markdown-textarea"
import { ChevronRight, ChevronLeft, ArrowLeft, ChevronDown, Plus } from "lucide-react"
import { MeetingFormDialog } from "@/components/meeting-form-dialog"
import { getPeople, updatePerson, type Person } from "@/lib/services/people"
import { getTeams, type Team } from "@/lib/services/teams"
import { getMeetingsForPerson, createMeeting, type Meeting as BackendMeeting, type MeetingType, type RecurrenceType } from "@/lib/services/meetings"

interface TreeNode {
  type: string
  meetings: ExtendedMeeting[]
}

const seniorityLevels = ["Junior", "Mid", "Senior", "Staff", "Principal"]

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

const getLevelBadgeClass = (level: string) => {
  switch (level) {
    case "Junior":
      return "!bg-green-100 !text-green-700 !border-green-300 hover:!bg-green-200"
    case "Mid":
      return "!bg-yellow-100 !text-yellow-700 !border-yellow-300 hover:!bg-yellow-200"
    case "Senior":
      return "!bg-pink-100 !text-pink-700 !border-pink-300 hover:!bg-pink-200"
    case "Staff":
      return "!bg-purple-100 !text-purple-700 !border-purple-300 hover:!bg-purple-200"
    case "Principal":
      return "!bg-blue-100 !text-blue-700 !border-blue-300 hover:!bg-blue-200"
    default:
      return "!bg-gray-100 !text-gray-700 !border-gray-300 hover:!bg-gray-200"
  }
}

const getLevelHoverClass = (level: string) => {
  switch (level) {
    case "Junior":
      return "hover:!bg-green-50"
    case "Mid":
      return "hover:!bg-yellow-50"
    case "Senior":
      return "hover:!bg-pink-50"
    case "Staff":
      return "hover:!bg-purple-50"
    case "Principal":
      return "hover:!bg-blue-50"
    default:
      return "hover:!bg-gray-50"
  }
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

  // Meeting states
  const [meetings, setMeetings] = useState<ExtendedMeeting[]>([])
  const [selectedMeeting, setSelectedMeeting] = useState<ExtendedMeeting | null>(null)
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set(["1:1"]))
  const [isAddMeetingDialogOpen, setIsAddMeetingDialogOpen] = useState(false)
  const [leftPanelWidth, setLeftPanelWidth] = useState(280)
  const [isResizing, setIsResizing] = useState(false)

  useEffect(() => {
    params.then(({ id }) => {
      setPersonId(id)
    })
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
        id: m.id,
        title: m.title,
        type: m.meetingType,
        date: m.meetingDate,
        attendees: m.attendees,
        personName: m.personName || undefined,
        teamName: m.teamName || undefined,
        recurrence: m.recurrence || undefined,
        nextMeetingDate: m.nextMeetingDate || undefined,
        actionItems: m.actionItems || undefined,
        notes: m.notes || undefined,
        personId: m.personId || undefined,
        teamId: m.teamId || undefined,
      })))
    }).catch(console.error)
  }, [personId])

  // Meeting helper functions and tree organization - MUST be before early return
  const tree = useMemo(() => {
    if (!formData) return {}

    // Organize meetings into tree structure
    const treeStructure: { [type: string]: TreeNode } = {}

    meetings.forEach((meeting) => {
      if (!treeStructure[meeting.type]) {
        treeStructure[meeting.type] = {
          type: meeting.type,
          meetings: [],
        }
      }
      treeStructure[meeting.type].meetings.push(meeting)
    })

    // Sort meetings by date (most recent first)
    Object.values(treeStructure).forEach((node) => {
      node.meetings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    })

    return treeStructure
  }, [formData, meetings])

  // Mouse resize handling - MUST be before early return
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return

      const meetingsSection = document.getElementById('meetings-section')
      if (!meetingsSection) return

      const sectionRect = meetingsSection.getBoundingClientRect()
      const newWidth = e.clientX - sectionRect.left

      if (newWidth >= 200 && newWidth <= 500) {
        setLeftPanelWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

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
  }, [isResizing])

  const getPersonMeetings = (): ExtendedMeeting[] => {
    return Object.values(tree).flatMap(node => node.meetings)
  }

  if (!formData) {
    return (
      <div className="flex items-center justify-center h-full">
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

  const handleCancel = () => {
    router.push("/people")
  }

  const availableTeamsList = allTeams.filter(team =>
    !formData.teams.includes(team.name)
  )

  const assignedTeamsList = allTeams.filter(team =>
    formData.teams.includes(team.name)
  )

  const handleAddToTeams = () => {
    const teamsToAdd = allTeams
      .filter(team => selectedAvailable.includes(team.id))
      .map(team => team.name)
    setFormData({ ...formData, teams: [...formData.teams, ...teamsToAdd] })
    setSelectedAvailable([])
  }

  const handleRemoveFromTeams = () => {
    const teamsToRemove = allTeams
      .filter(team => selectedTeamMembers.includes(team.id))
      .map(team => team.name)
    setFormData({ ...formData, teams: formData.teams.filter(t => !teamsToRemove.includes(t)) })
    setSelectedTeamMembers([])
  }

  const toggleAvailableSelection = (teamId: string) => {
    setSelectedAvailable(prev =>
      prev.includes(teamId) ? prev.filter(id => id !== teamId) : [...prev, teamId]
    )
  }

  const toggleTeamMemberSelection = (teamId: string) => {
    setSelectedTeamMembers(prev =>
      prev.includes(teamId) ? prev.filter(id => id !== teamId) : [...prev, teamId]
    )
  }

  const handleDoubleClickAvailable = (teamId: string) => {
    const team = allTeams.find(t => t.id === teamId)
    if (team) {
      setFormData({ ...formData, teams: [...formData.teams, team.name] })
      setSelectedAvailable(prev => prev.filter(id => id !== teamId))
    }
  }

  const handleDoubleClickTeamMember = (teamId: string) => {
    const team = allTeams.find(t => t.id === teamId)
    if (team) {
      setFormData({ ...formData, teams: formData.teams.filter(t => t !== team.name) })
      setSelectedTeamMembers(prev => prev.filter(id => id !== teamId))
    }
  }

  const toggleType = (type: string) => {
    const newExpanded = new Set(expandedTypes)
    if (newExpanded.has(type)) {
      newExpanded.delete(type)
    } else {
      newExpanded.add(type)
    }
    setExpandedTypes(newExpanded)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const handleAddMeeting = async (newMeeting: any) => {
    try {
      // For 1:1 meetings on this person's page, always use the page's personId as fallback
      const resolvedPersonId = newMeeting.type === "1:1"
        ? (newMeeting.personId || personId)
        : null
      const resolvedTeamId = newMeeting.type !== "1:1" && newMeeting.type !== "Other"
        ? (newMeeting.teamId || null)
        : null

      const backendMeeting = await createMeeting({
        title: newMeeting.title,
        meetingType: newMeeting.type as MeetingType,
        meetingDate: newMeeting.date,
        nextMeetingDate: newMeeting.nextMeetingDate || null,
        recurrence: (newMeeting.recurrence as RecurrenceType) || null,
        actionItems: newMeeting.actionItems || null,
        notes: newMeeting.notes || null,
        personId: resolvedPersonId,
        teamId: resolvedTeamId,
      })
      const meeting: ExtendedMeeting = {
        id: backendMeeting.id,
        title: backendMeeting.title,
        type: backendMeeting.meetingType,
        date: backendMeeting.meetingDate,
        attendees: backendMeeting.attendees,
        personName: backendMeeting.personName || undefined,
        teamName: backendMeeting.teamName || undefined,
        recurrence: backendMeeting.recurrence || undefined,
        nextMeetingDate: backendMeeting.nextMeetingDate || undefined,
        actionItems: backendMeeting.actionItems || undefined,
        notes: backendMeeting.notes || undefined,
        personId: backendMeeting.personId || undefined,
        teamId: backendMeeting.teamId || undefined,
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
      const meetingDate = new Date(updatedMeeting.date)
      const nextMeetingDate = new Date(updatedMeeting.nextMeetingDate)
      if (nextMeetingDate <= meetingDate) {
        alert("Next meeting date must be after the meeting date")
        return
      }
    }

    setMeetings(meetings.map(m => m.id === updatedMeeting.id ? updatedMeeting : m))
    setSelectedMeeting(updatedMeeting)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={handleCancel}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to People
        </Button>
        <h1 className="text-2xl text-gray-100 font-bold">{formData.name}</h1>
        <p className="text-sm text-gray-400">{formData.role}</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Left Column - Form Fields */}
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Sarah Miller"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Role *</Label>
                <Input
                  id="role"
                  value={formData.role ?? ''}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  placeholder="e.g. Senior Software Engineer"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="level">Seniority Level *</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  <Button
                    type="button" variant="outline" size="sm"
                    onClick={() => setFormData({ ...formData, level: "Junior" })}
                    className={formData.level === "Junior" ? "!bg-green-100 !text-green-700 !border-green-300 hover:!bg-green-200" : "hover:!bg-green-100 hover:!text-green-700 hover:!border-green-300"}
                  >Junior</Button>
                  <Button
                    type="button" variant="outline" size="sm"
                    onClick={() => setFormData({ ...formData, level: "Mid" })}
                    className={formData.level === "Mid" ? "!bg-yellow-100 !text-yellow-700 !border-yellow-300 hover:!bg-yellow-200" : "hover:!bg-yellow-100 hover:!text-yellow-700 hover:!border-yellow-300"}
                  >Mid</Button>
                  <Button
                    type="button" variant="outline" size="sm"
                    onClick={() => setFormData({ ...formData, level: "Senior" })}
                    className={formData.level === "Senior" ? "!bg-pink-100 !text-pink-700 !border-pink-300 hover:!bg-pink-200" : "hover:!bg-pink-100 hover:!text-pink-700 hover:!border-pink-300"}
                  >Senior</Button>
                  <Button
                    type="button" variant="outline" size="sm"
                    onClick={() => setFormData({ ...formData, level: "Staff" })}
                    className={formData.level === "Staff" ? "!bg-blue-100 !text-blue-700 !border-blue-300 hover:!bg-blue-200" : "hover:!bg-blue-100 hover:!text-blue-700 hover:!border-blue-300"}
                  >Staff</Button>
                  <Button
                    type="button" variant="outline" size="sm"
                    onClick={() => setFormData({ ...formData, level: "Principal" })}
                    className={formData.level === "Principal" ? "!bg-purple-100 !text-purple-700 !border-purple-300 hover:!bg-purple-200" : "hover:!bg-purple-100 hover:!text-purple-700 hover:!border-purple-300"}
                  >Principal</Button>
                  <Button
                    type="button" variant="outline" size="sm"
                    onClick={() => setFormData({ ...formData, level: "Other" })}
                    className={formData.level !== null && formData.level !== '' && !["Junior", "Mid", "Senior", "Staff", "Principal"].includes(formData.level) ? "!bg-gray-100 !text-gray-700 !border-gray-300 hover:!bg-gray-200" : "hover:!bg-gray-100 hover:!text-gray-700 hover:!border-gray-300"}
                  >Other</Button>
                </div>
                <Input
                  id="level"
                  value={formData.level ?? ''}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                  placeholder="Or type custom level"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate ?? ''}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label>Teams</Label>
                <div className="flex gap-3 items-center">
                  {/* Available Teams */}
                  <div className="flex-1">
                    <Label className="text-gray-400 mb-1">Available Teams</Label>
                    <div className="border border-[#383838] rounded-md h-48 overflow-y-auto bg-[#262626]">
                      {availableTeamsList.length > 0 ? (
                        availableTeamsList.map((team) => (
                          <div
                            key={team.id}
                            onClick={() => toggleAvailableSelection(team.id!)}
                            onDoubleClick={() => handleDoubleClickAvailable(team.id!)}
                            className={`px-3 py-2 text-sm cursor-pointer dual-list-item select-none text-gray-200 ${
                              selectedAvailable.includes(team.id!) ? 'bg-primary-50 bg-primary-dark-900/30 bg-primary-dark-900/30 border-l-2 border-primary-600 border-primary-dark-600 border-primary-dark-400' : ''
                            }`}
                          >
                            {team.name}
                          </div>
                        ))
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">
                          All teams assigned
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Arrow Buttons */}
                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleAddToTeams}
                      disabled={selectedAvailable.length === 0}
                      className="h-8 w-8"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleRemoveFromTeams}
                      disabled={selectedTeamMembers.length === 0}
                      className="h-8 w-8"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Assigned Teams */}
                  <div className="flex-1">
                    <Label className="text-gray-400 mb-1">Assigned Teams ({assignedTeamsList.length})</Label>
                    <div className="border border-[#383838] rounded-md h-48 overflow-y-auto bg-[#262626]">
                      {assignedTeamsList.length > 0 ? (
                        assignedTeamsList.map((team) => (
                          <div
                            key={team.id}
                            onClick={() => toggleTeamMemberSelection(team.id!)}
                            onDoubleClick={() => handleDoubleClickTeamMember(team.id!)}
                            className={`px-3 py-2 text-sm cursor-pointer dual-list-item select-none text-gray-200 ${
                              selectedTeamMembers.includes(team.id!) ? 'bg-primary-50 bg-primary-dark-900/30 bg-primary-dark-900/30 border-l-2 border-primary-600 border-primary-dark-600 border-primary-dark-400' : ''
                            }`}
                          >
                            {team.name}
                          </div>
                        ))
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">
                          No teams assigned
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Notes */}
            <div className="flex flex-col">
              <Label className="mb-2">Notes</Label>
              <div className="flex-1">
                <MarkdownTextarea
                  value={formData.notes || ""}
                  onValueChange={(value) => setFormData({ ...formData, notes: value })}
                  placeholder="Any additional notes about this person..."
                  className="h-full resize-none text-sm"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </CardContent>
      </Card>

      {/* Meetings Section */}
      <Card className="mt-6">
        <CardContent className="p-6">
          <div className="mb-4">
            <h2 className="text-sm text-gray-100 font-semibold">Meetings</h2>
            <p className="text-xs text-gray-400 mt-1">All meetings involving {formData.name}</p>
          </div>

          <div id="meetings-section" className="flex border h-[900px] border-[#383838] rounded-lg overflow-hidden">
            {/* Left Panel - Tree View */}
            <div
              className="border-[#383838] bg-[#262626] overflow-y-auto flex-shrink-0"
              style={{ width: `${leftPanelWidth}px` }}
            >
              <div className="p-4 border-[#383838] bg-[#1c1c1c]">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm text-gray-100 font-semibold">Meeting History</h3>
                  <Button onClick={() => setIsAddMeetingDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Log
                  </Button>
                </div>
                <p className="text-gray-400 mt-1">
                  {getPersonMeetings().length} {getPersonMeetings().length === 1 ? 'meeting' : 'meetings'}
                </p>
              </div>

              <div className="p-2">
                {Object.keys(tree).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <p className="text-gray-400 mb-4">No meetings logged yet</p>
                    <Button onClick={() => setIsAddMeetingDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-1" />
                      Log First Meeting
                    </Button>
                  </div>
                ) : (
                  Object.entries(tree).map(([type, node]) => (
                    <div key={type} className="mb-1">
                      {/* Meeting Type */}
                      <button
                        onClick={() => toggleType(type)}
                        className="flex hover:bg-[#2a2a2a] rounded items-center gap-2 w-full px-2 py-1.5 text-gray-100 font-medium"
                      >
                        {expandedTypes.has(type) ? (
                          <ChevronDown className="h-4 w-4 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 flex-shrink-0" />
                        )}
                        {type} ({node.meetings.length})
                      </button>

                      {/* Meetings */}
                      {expandedTypes.has(type) && (
                        <div className="ml-4">
                          {node.meetings.map((meeting) => (
                            <button
                              key={meeting.id}
                              onClick={() => setSelectedMeeting(meeting)}
                              className={`block w-full text-left px-2 py-1.5 text-xs rounded ${
                                selectedMeeting?.id === meeting.id
                                  ? "bg-primary-50 bg-primary-dark-900/30 bg-primary-dark-900/30 text-primary-700 text-primary-dark-400 text-primary-dark-400 font-medium"
                                  : "text-gray-300 hover:bg-[#2a2a2a]"
                              }`}
                            >
                              {formatDate(meeting.date)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Resizable Divider */}
            <div
              className={`w-1 bg-gray-200 bg-[#383838] hover:bg-primary-400 hover:bg-primary-dark-400 cursor-col-resize flex-shrink-0 ${
                isResizing ? 'bg-primary-500' : ''
              }`}
              onMouseDown={handleMouseDown}
            />

            {/* Right Panel - Meeting Details */}
            <div className="flex-1 overflow-y-auto bg-[#1c1c1c]">
              {selectedMeeting ? (
                <div className="p-6">
                  <div className="space-y-4">
                    {/* Date and Next Meeting Date */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-1">
                        <Label className="text-gray-300 font-medium">Date</Label>
                        <Input
                          type="date"
                          value={selectedMeeting.date}
                          onChange={(e) => handleUpdateMeeting({ ...selectedMeeting, date: e.target.value })}
                        />
                      </div>
                      {selectedMeeting.type === "1:1" && selectedMeeting.recurrence && selectedMeeting.recurrence !== "none" && selectedMeeting.nextMeetingDate && (
                        <div className="grid gap-1">
                          <Label className="text-gray-300 font-medium">Next Meeting</Label>
                          <Input
                            type="date"
                            value={selectedMeeting.nextMeetingDate}
                            onChange={(e) => handleUpdateMeeting({ ...selectedMeeting, nextMeetingDate: e.target.value })}
                          />
                        </div>
                      )}
                    </div>

                    {/* Title and Attendees */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-1">
                        <Label className="text-gray-300 font-medium">Title</Label>
                        <Input
                          value={selectedMeeting.title}
                          onChange={(e) => handleUpdateMeeting({ ...selectedMeeting, title: e.target.value })}
                          placeholder="Meeting title"
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-gray-300 font-medium">Attendees</Label>
                        <Input
                          value={selectedMeeting.attendees.join(", ")}
                          onChange={(e) => handleUpdateMeeting({
                            ...selectedMeeting,
                            attendees: e.target.value.split(",").map(a => a.trim()).filter(a => a.length > 0)
                          })}
                          placeholder="Enter names separated by commas"
                        />
                      </div>
                    </div>

                    {/* Action Items */}
                    <div>
                      <Label className="text-gray-300 font-medium">Action Items</Label>
                      <MarkdownTextarea
                        value={selectedMeeting.actionItems || ""}
                        onValueChange={(value) => handleUpdateMeeting({ ...selectedMeeting, actionItems: value })}
                        placeholder={"- Action item 1\n- Action item 2"}
                        rows={4}
                        className="mt-1 text-sm"
                      />
                    </div>

                    {/* Meeting Notes */}
                    <div>
                      <Label className="text-gray-300 font-medium">Meeting Notes</Label>
                      <MarkdownTextarea
                        value={selectedMeeting.notes || ""}
                        onValueChange={(value) => handleUpdateMeeting({ ...selectedMeeting, notes: value })}
                        placeholder="Meeting notes, discussion points, decisions..."
                        rows={8}
                        className="mt-1 text-sm"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <p className="text-gray-400 mb-2">Select a meeting to view details</p>
                    <p className="text-gray-500">or log a new meeting</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Meeting Form Dialog */}
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
