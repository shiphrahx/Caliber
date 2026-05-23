"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { MarkdownTextarea } from "@/components/ui/markdown-textarea"
import { ChevronRight, ChevronLeft } from "lucide-react"
import { type Team } from "@/lib/services/teams"
import { type Person } from "@/lib/services/people"
import { createClient } from "@/lib/supabase/client"

interface TeamFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  team?: Team | null
  onSave: (team: Team) => void
  availablePeople?: Person[]
}

const emptyTeam: Omit<Team, 'id' | 'createdAt'> & { id?: string; createdAt?: string } = {
  name: "",
  description: "",
  status: "active",
  memberCount: 0,
  memberIds: [],
  notes: "",
  documentationUrl: ""
}

export function TeamFormDialog({ open, onOpenChange, team, onSave, availablePeople = [] }: TeamFormDialogProps) {
  const [formData, setFormData] = useState<Team | typeof emptyTeam>(team || emptyTeam)
  const [selectedAvailable, setSelectedAvailable] = useState<string[]>([])
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])

  // Reset form data when dialog opens/closes or team changes
  useEffect(() => {
    if (!open) return

    setSelectedAvailable([])
    setSelectedMembers([])

    if (!team) {
      setFormData(emptyTeam)
      return
    }

    // Always fetch the current member IDs fresh from the DB to ensure accuracy
    const supabase = createClient()
    supabase
      .from('team_memberships')
      .select('person_id')
      .eq('team_id', team.id)
      .then(({ data }) => {
        const memberIds = (data ?? []).map((m: any) => m.person_id)
        setFormData({ ...team, memberIds })
      })
  }, [open, team])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const teamData = {
      ...formData,
      memberCount: formData.memberIds?.length || 0
    } as Team
    onSave(teamData)
    onOpenChange(false)
  }

  const isEditing = !!team

  const availablePeopleList = availablePeople.filter(person =>
    person.id !== undefined && !formData.memberIds?.includes(person.id)
  )

  const teamMembersList = availablePeople.filter(person =>
    person.id !== undefined && formData.memberIds?.includes(person.id)
  )

  const handleAddToTeam = () => {
    setFormData({
      ...formData,
      memberIds: [...(formData.memberIds || []), ...selectedAvailable]
    })
    setSelectedAvailable([])
  }

  const handleRemoveFromTeam = () => {
    setFormData({
      ...formData,
      memberIds: formData.memberIds?.filter(id => !selectedMembers.includes(id)) || []
    })
    setSelectedMembers([])
  }

  const toggleAvailableSelection = (personId: string) => {
    setSelectedAvailable(prev =>
      prev.includes(personId)
        ? prev.filter(id => id !== personId)
        : [...prev, personId]
    )
  }

  const toggleMemberSelection = (personId: string) => {
    setSelectedMembers(prev =>
      prev.includes(personId)
        ? prev.filter(id => id !== personId)
        : [...prev, personId]
    )
  }

  const handleDoubleClickAvailable = (personId: string) => {
    setFormData({
      ...formData,
      memberIds: [...(formData.memberIds || []), personId]
    })
    setSelectedAvailable(prev => prev.filter(id => id !== personId))
  }

  const handleDoubleClickMember = (personId: string) => {
    setFormData({
      ...formData,
      memberIds: formData.memberIds?.filter(id => id !== personId) || []
    })
    setSelectedMembers(prev => prev.filter(id => id !== personId))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1100px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? team?.name : "Create New Team"}</DialogTitle>
            <DialogDescription>
              {isEditing ? `Update details below.` : "Add a new team to your organization."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-6 py-4">
            {/* Left Column - Form Fields */}
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Team Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Platform Engineering"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the team's focus..."
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="documentationUrl">Documentation Link</Label>
                <Input
                  id="documentationUrl"
                  value={formData.documentationUrl}
                  onChange={(e) => setFormData({ ...formData, documentationUrl: e.target.value })}
                  placeholder="e.g. Confluence, Notion, or Teams page URL"
                  type="url"
                />
              </div>
              <div className="grid gap-2">
                <Label>Team Members</Label>
                <div className="flex gap-3 items-center">
                  {/* Available People */}
                  <div className="dual-list-col">
                    <label className="dual-list-label">Available People</label>
                    <div className="dual-list-box dual-list-box--md">
                      {availablePeopleList.length > 0 ? (
                        availablePeopleList.map((person) => {
                          const isSelected = selectedAvailable.includes(person.id!)
                          return (
                            <div
                              key={person.id}
                              onClick={() => toggleAvailableSelection(person.id!)}
                              onDoubleClick={() => handleDoubleClickAvailable(person.id!)}
                              className="dual-list-item"
                              style={{
                                color: isSelected ? "#111" : "var(--text-2)",
                                borderLeft: isSelected ? "2px solid #00f058" : "2px solid transparent",
                              }}
                            >
                              {person.name}
                            </div>
                          )
                        })
                      ) : (
                        <div className="dual-list-empty">All people assigned</div>
                      )}
                    </div>
                  </div>

                  {/* Arrow Buttons */}
                  <div className="dual-list-arrows">
                    <button
                      type="button"
                      onClick={handleAddToTeam}
                      disabled={selectedAvailable.length === 0}
                      className="dual-list-arrow-btn"
                    >
                      <ChevronRight />
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveFromTeam}
                      disabled={selectedMembers.length === 0}
                      className="dual-list-arrow-btn"
                    >
                      <ChevronLeft />
                    </button>
                  </div>

                  {/* Team Members */}
                  <div className="dual-list-col">
                    <label className="dual-list-label">Team Members ({teamMembersList.length})</label>
                    <div className="dual-list-box dual-list-box--md">
                      {teamMembersList.length > 0 ? (
                        teamMembersList.map((person) => {
                          const isSelected = selectedMembers.includes(person.id!)
                          return (
                            <div
                              key={person.id}
                              onClick={() => toggleMemberSelection(person.id!)}
                              onDoubleClick={() => handleDoubleClickMember(person.id!)}
                              className="dual-list-item"
                              style={{
                                color: isSelected ? "#111" : "var(--text-2)",
                                borderLeft: isSelected ? "2px solid #00f058" : "2px solid transparent",
                              }}
                            >
                              {person.name}
                            </div>
                          )
                        })
                      ) : (
                        <div className="dual-list-empty">No members yet</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Notes */}
            <div className="flex flex-col">
              <Label className="mb-2">Notes</Label>
              <MarkdownTextarea
                value={formData.notes}
                onValueChange={(value) => setFormData({ ...formData, notes: value })}
                placeholder="Any additional notes..."
                className="flex-1 resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{isEditing ? "Save Changes" : "Create Team"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
