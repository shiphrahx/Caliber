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
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {([
                    { label: "Junior",    bg: "#0d1420", color: "#818cf8" },
                    { label: "Mid",       bg: "#0a1a2e", color: "#5b9bd5" },
                    { label: "Senior",    bg: "#0f1a0a", color: "#4ade80" },
                    { label: "Staff",     bg: "#1a1200", color: "#c9a227" },
                    { label: "Principal", bg: "#1e0d00", color: "#e07030" },
                    { label: "Other",     bg: "#222222", color: "#888888" },
                  ] as const).map(({ label, bg, color }) => {
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
                          padding: "3px 10px",
                          borderRadius: "4px",
                          fontSize: "var(--text-label)",
                          fontWeight: 500,
                          fontFamily: "var(--font-sans)",
                          background: isSelected ? bg : "var(--surf-2)",
                          color: isSelected ? color : "var(--text-3)",
                          border: `1px solid ${isSelected ? color + "40" : "var(--border-2)"}`,
                          cursor: "pointer",
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
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: "var(--text-label)", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>Available Teams</label>
                    <div style={{ border: "1px solid var(--border-2)", borderRadius: "4px", height: "128px", overflowY: "auto", background: "var(--surf-2)" }}>
                      {availableTeamsList.length > 0 ? (
                        availableTeamsList.map((team) => (
                          <div
                            key={team.id}
                            onClick={() => toggleAvailableSelection(team.name)}
                            onDoubleClick={() => handleDoubleClickAvailable(team.name)}
                            className="dual-list-item"
                            style={{
                              padding: "6px 12px",
                              fontSize: "var(--text-label)",
                              cursor: "pointer",
                              userSelect: "none",
                              color: selectedAvailable.includes(team.name) ? "#111" : "var(--text-2)",
                              borderLeft: selectedAvailable.includes(team.name) ? "2px solid #00f058" : "2px solid transparent",
                            }}
                          >
                            {team.name}
                          </div>
                        ))
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: "var(--text-label)", color: "var(--text-3)" }}>
                          All teams assigned
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Arrow Buttons */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={handleAddToTeams}
                      disabled={selectedAvailable.length === 0}
                      style={{ width: "32px", height: "32px", borderRadius: "4px", border: "1px solid var(--border-2)", background: "var(--surf-2)", color: "var(--text-2)", cursor: selectedAvailable.length === 0 ? "not-allowed" : "pointer", opacity: selectedAvailable.length === 0 ? 0.4 : 1, display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <ChevronRight style={{ width: "16px", height: "16px" }} />
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveFromTeams}
                      disabled={selectedTeams.length === 0}
                      style={{ width: "32px", height: "32px", borderRadius: "4px", border: "1px solid var(--border-2)", background: "var(--surf-2)", color: "var(--text-2)", cursor: selectedTeams.length === 0 ? "not-allowed" : "pointer", opacity: selectedTeams.length === 0 ? 0.4 : 1, display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <ChevronLeft style={{ width: "16px", height: "16px" }} />
                    </button>
                  </div>

                  {/* Person Teams */}
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: "var(--text-label)", color: "var(--text-3)", display: "block", marginBottom: "4px" }}>{formData.name ? `${formData.name}'s Teams` : "Person's Teams"} ({personTeamsList.length})</label>
                    <div style={{ border: "1px solid var(--border-2)", borderRadius: "4px", height: "128px", overflowY: "auto", background: "var(--surf-2)" }}>
                      {personTeamsList.length > 0 ? (
                        personTeamsList.map((team) => (
                          <div
                            key={team.id}
                            onClick={() => toggleTeamSelection(team.name)}
                            onDoubleClick={() => handleDoubleClickTeam(team.name)}
                            className="dual-list-item"
                            style={{
                              padding: "6px 12px",
                              fontSize: "var(--text-label)",
                              cursor: "pointer",
                              userSelect: "none",
                              color: selectedTeams.includes(team.name) ? "#111" : "var(--text-2)",
                              borderLeft: selectedTeams.includes(team.name) ? "2px solid #00f058" : "2px solid transparent",
                            }}
                          >
                            {team.name}
                          </div>
                        ))
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: "var(--text-label)", color: "var(--text-3)" }}>
                          No teams yet
                        </div>
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
