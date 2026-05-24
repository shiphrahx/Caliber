"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { PersonFormDialog } from "@/components/person-form-dialog"
import { PeopleTable } from "@/components/people-table"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { getPeople, createPerson, updatePerson, deletePerson as deletePersonService, togglePersonStatus, type Person } from "@/lib/services/people"
import { getTeams, type Team } from "@/lib/services/teams"
import { useRadar } from "@/lib/hooks/use-person-signals"

const byName = <T extends { name: string }>(arr: T[]) =>
  [...arr].sort((a, b) => a.name.localeCompare(b.name))

export default function PeoplePage() {
  const router = useRouter()
  const [people, setPeople] = useState<Person[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingPerson, setEditingPerson] = useState<Person | null>(null)
  const [deletingPerson, setDeletingPerson] = useState<Person | null>(null)
  const [, setIsLoading] = useState(true)

  const { people: radarPeople } = useRadar()
  const attentionScores: Record<string, number> = Object.fromEntries(
    radarPeople.map(p => [p.personId, p.score])
  )

  useEffect(() => {
    loadPeople()
    loadTeams()
  }, [])

  const loadTeams = async () => {
    try {
      const data = await getTeams()
      setTeams(data)
    } catch (error) {
      console.error('Failed to load teams:', error)
      toast.error('Failed to load teams')
    }
  }

  const loadPeople = async () => {
    try {
      setIsLoading(true)
      const data = await getPeople()
      setPeople(byName(data))
    } catch (error) {
      console.error('Failed to load people:', error)
      toast.error('Failed to load people')
    } finally {
      setIsLoading(false)
    }
  }

  const getRecentHires = () => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    return people.filter(person => {
      if (!person.startDate) return false
      return new Date(person.startDate) >= thirtyDaysAgo
    }).length
  }

  const handleAddPerson = async (newPerson: Person) => {
    try {
      const person = await createPerson(newPerson)
      setPeople(byName([...people, person]))
      setIsAddDialogOpen(false)
    } catch (error) {
      console.error('Failed to create person:', error)
      toast.error('Failed to add person')
    }
  }

  const handleEditPerson = async (updatedPerson: Person) => {
    try {
      const person = await updatePerson(updatedPerson.id, updatedPerson)
      setPeople(byName(people.map(p => p.id === person.id ? person : p)))
      setEditingPerson(null)
    } catch (error) {
      console.error('Failed to update person:', error)
      toast.error('Failed to update person')
    }
  }

  const handleToggleStatus = async (person: Person) => {
    try {
      const updatedPerson = await togglePersonStatus(person.id, person.status)
      setPeople(byName(people.map(p => p.id === updatedPerson.id ? updatedPerson : p)))
    } catch (error) {
      console.error('Failed to toggle person status:', error)
      toast.error('Failed to update status')
    }
  }

  const handleDeletePerson = async () => {
    if (deletingPerson) {
      try {
        await deletePersonService(deletingPerson.id)
        setPeople(people.filter(p => p.id !== deletingPerson.id))
        setDeletingPerson(null)
      } catch (error) {
        console.error('Failed to delete person:', error)
        toast.error('Failed to delete person')
      }
    }
  }

  const activePeople = people.filter(p => p.status === "active")
  const activeTeams = teams.filter(t => t.status === "active")

  return (
    <>
      {/* Top bar */}
      <div className="page-topbar">
        <span className="page-topbar-title">People</span>
        <button className="btn-primary" onClick={() => setIsAddDialogOpen(true)}>
          + Add person
        </button>
      </div>

      <div className="page-content">
        {/* Stat cards */}
        <div className="stat-grid">
          {[
            { label: "Active people", value: activePeople.length, sub: `${people.filter(p => p.status === "inactive").length} inactive` },
            { label: "Recent hires", value: getRecentHires(), sub: "In the last 30 days" },
            { label: "Teams", value: activeTeams.length, sub: "Active teams" },
          ].map(({ label, value, sub }) => (
            <div key={label} className="stat-card">
              <div className="form-label">{label}</div>
              <div className="stat-card-value">{value}</div>
              <div className="stat-card-sub">{sub}</div>
            </div>
          ))}
        </div>

        {/* People Table */}
        <PeopleTable
          people={people}
          onRowClick={(person) => router.push(`/people/${person.id}`)}
          onEdit={(person) => setEditingPerson(person)}
          onDelete={(person) => setDeletingPerson(person)}
          onToggleStatus={handleToggleStatus}
          onQuickAdd={() => setIsAddDialogOpen(true)}
          attentionScores={attentionScores}
        />
      </div>

      <PersonFormDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSave={handleAddPerson}
        availableTeams={teams}
      />
      <PersonFormDialog
        open={!!editingPerson}
        onOpenChange={(open) => !open && setEditingPerson(null)}
        person={editingPerson}
        onSave={handleEditPerson}
        availableTeams={teams}
      />
      <DeleteConfirmDialog
        open={!!deletingPerson}
        onOpenChange={(open) => !open && setDeletingPerson(null)}
        onConfirm={handleDeletePerson}
        itemName={deletingPerson?.name || ""}
        itemType="Person"
        description="This action cannot be undone. This will permanently delete this person and remove all associated data."
      />
    </>
  )
}
