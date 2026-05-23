"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ChevronRight, ChevronLeft } from "lucide-react"
import { getTodayDate } from "@/lib/utils"
import { type Person } from "@/lib/services/people"
import { type Team } from "@/lib/services/teams"
import { LEVEL_BADGE } from "@/lib/badge-styles"

interface PersonFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  person?: Person | null
  onSave: (person: Person) => void
  availableTeams?: Team[]
}

const emptyPerson: Omit<Person, 'id' | 'createdAt'> & { id?: string; createdAt?: string } = {
  name: "",
  role: "",
  level: "",
  startDate: getTodayDate(),
  status: "active",
  teams: [],
  notes: ""
}

export function PersonFormDialog({ open, onOpenChange, person, onSave, availableTeams = [] }: PersonFormDialogProps) {
  const [formData, setFormData] = useState<Person | typeof emptyPerson>(person || emptyPerson)
  const [selectedAvailable, setSelectedAvailable] = useState<string[]>([])
  const [selectedTeams, setSelectedTeams] = useState<string[]>([])

  // Reset form data when dialog opens/closes or person changes
  useEffect(() => {
    if (open) {
      setFormData(person || emptyPerson)
      setSelectedAvailable([])
      setSelectedTeams([])
    }
  }, [open, person])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData as Person)
    onOpenChange(false)
  }

  const isEditing = !!person

  const availableTeamsList = availableTeams.filter(team =>
    !formData.teams.includes(team.name)
  )

  const personTeamsList = availableTeams.filter(team =>
    formData.teams.includes(team.name)
  )

  const handleAddToTeams = () => {
    setFormData({
      ...formData,
      teams: [...formData.teams, ...selectedAvailable]
    })
    setSelectedAvailable([])
  }

  const handleRemoveFromTeams = () => {
    setFormData({
      ...formData,
      teams: formData.teams.filter(team => !selectedTeams.includes(team))
    })
    setSelectedTeams([])
  }

  const toggleAvailableSelection = (teamName: string) => {
    setSelectedAvailable(prev =>
      prev.includes(teamName)
        ? prev.filter(name => name !== teamName)
        : [...prev, teamName]
    )
  }

  const toggleTeamSelection = (teamName: string) => {
    setSelectedTeams(prev =>
      prev.includes(teamName)
        ? prev.filter(name => name !== teamName)
        : [...prev, teamName]
    )
  }

  const handleDoubleClickAvailable = (teamName: string) => {
    setFormData({
      ...formData,
      teams: [...formData.teams, teamName]
    })
    setSelectedAvailable(prev => prev.filter(name => name !== teamName))
  }

  const handleDoubleClickTeam = (teamName: string) => {
    setFormData({
      ...formData,
      teams: formData.teams.filter(team => team !== teamName)
    })
    setSelectedTeams(prev => prev.filter(name => name !== teamName))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1100px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? person?.name : "Add New Team Member"}</DialogTitle>
            <DialogDescription>
              {isEditing ? `Update details below.` : "Add a new team member to your organization."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-6 py-4">
            {/* Left Column - Form Fields */}
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Sarah Miller"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Role / Title</Label>
                <Input
                  id="role"
                  value={formData.role || ''}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  placeholder="e.g. Senior Software Engineer"
                />
              </div>
              <div className="grid gap-2">
                <Label>Level / Seniority</Label>
                <div className="level-btn-row">
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
                        className="level-btn"
                        style={{
                          background: isSelected ? bg : "var(--surf-2)",
                          color: isSelected ? color : "var(--text-3)",
                          border: `1px solid ${isSelected ? color + "40" : "var(--border-2)"}`,
                        }}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
                <Input
                  id="level"
                  value={formData.level || ''}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                  placeholder="Or enter custom level..."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate || ''}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Teams</Label>
                <div className="flex gap-3 items-center">
                  {/* Available Teams */}
                  <div className="dual-list-col">
                    <label className="dual-list-label">Available Teams</label>
                    <div className="dual-list-box dual-list-box--sm">
                      {availableTeamsList.length > 0 ? (
                        availableTeamsList.map((team) => {
                          const isSelected = selectedAvailable.includes(team.name)
                          return (
                            <div
                              key={team.id}
                              onClick={() => toggleAvailableSelection(team.name)}
                              onDoubleClick={() => handleDoubleClickAvailable(team.name)}
                              className="dual-list-item"
                              style={{
                                color: isSelected ? "#111" : "var(--text-2)",
                                borderLeft: isSelected ? "2px solid #00f058" : "2px solid transparent",
                              }}
                            >
                              {team.name}
                            </div>
                          )
                        })
                      ) : (
                        <div className="dual-list-empty">All teams assigned</div>
                      )}
                    </div>
                  </div>

                  {/* Arrow Buttons */}
                  <div className="dual-list-arrows">
                    <button
                      type="button"
                      onClick={handleAddToTeams}
                      disabled={selectedAvailable.length === 0}
                      className="dual-list-arrow-btn"
                    >
                      <ChevronRight />
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveFromTeams}
                      disabled={selectedTeams.length === 0}
                      className="dual-list-arrow-btn"
                    >
                      <ChevronLeft />
                    </button>
                  </div>

                  {/* Person Teams */}
                  <div className="dual-list-col">
                    <label className="dual-list-label">{formData.name ? `${formData.name}'s Teams` : "Person's Teams"} ({personTeamsList.length})</label>
                    <div className="dual-list-box dual-list-box--sm">
                      {personTeamsList.length > 0 ? (
                        personTeamsList.map((team) => {
                          const isSelected = selectedTeams.includes(team.name)
                          return (
                            <div
                              key={team.id}
                              onClick={() => toggleTeamSelection(team.name)}
                              onDoubleClick={() => handleDoubleClickTeam(team.name)}
                              className="dual-list-item"
                              style={{
                                color: isSelected ? "#111" : "var(--text-2)",
                                borderLeft: isSelected ? "2px solid #00f058" : "2px solid transparent",
                              }}
                            >
                              {team.name}
                            </div>
                          )
                        })
                      ) : (
                        <div className="dual-list-empty">No teams yet</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Notes */}
            <div className="flex flex-col">
              <Label htmlFor="notes" className="mb-2">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional notes..."
                className="flex-1 resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{isEditing ? "Save Changes" : "Add Team Member"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
