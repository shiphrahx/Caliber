"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { PersonFormDialog } from "@/components/person-form-dialog"
import { PeopleTable } from "@/components/people-table"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { getPeople, createPerson, updatePerson, deletePerson as deletePersonService, togglePersonStatus, type Person } from "@/lib/services/people"
import { getTeams, type Team } from "@/lib/services/teams"

export default function PeoplePage() {
  const router = useRouter()
  const [people, setPeople] = useState<Person[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingPerson, setEditingPerson] = useState<Person | null>(null)
  const [deletingPerson, setDeletingPerson] = useState<Person | null>(null)
  const [, setIsLoading] = useState(true)

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
    }
  }

  const loadPeople = async () => {
    try {
      setIsLoading(true)
      const data = await getPeople()
      setPeople(data)
    } catch (error) {
      console.error('Failed to load people:', error)
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
      setPeople([...people, person])
      setIsAddDialogOpen(false)
    } catch (error) {
      console.error('Failed to create person:', error)
    }
  }

  const handleEditPerson = async (updatedPerson: Person) => {
    try {
      const person = await updatePerson(updatedPerson.id, updatedPerson)
      setPeople(people.map(p => p.id === person.id ? person : p))
      setEditingPerson(null)
    } catch (error) {
      console.error('Failed to update person:', error)
    }
  }

  const handleToggleStatus = async (person: Person) => {
    try {
      const updatedPerson = await togglePersonStatus(person.id, person.status)
      setPeople(people.map(p => p.id === updatedPerson.id ? updatedPerson : p))
    } catch (error) {
      console.error('Failed to toggle person status:', error)
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
      }
    }
  }

  const activePeople = people.filter(p => p.status === "active")
  const activeTeams = teams.filter(t => t.status === "active")

  return (
    <>
      {/* Top bar */}
      <div style={{
        height: "40px",
        padding: "0 16px",
        borderBottom: "1px solid var(--border-1)",
        background: "var(--surf)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <span style={{ fontSize: "var(--text-label)", fontWeight: 500, color: "var(--text-1)", fontFamily: "var(--font-sans)" }}>
          People
        </span>
        <button
          onClick={() => setIsAddDialogOpen(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            background: "linear-gradient(90deg, #00ffe5 0%, #00f058 100%)",
            border: "none",
            color: "#0a1a0a",
            padding: "4px 10px",
            borderRadius: "4px",
            fontSize: "var(--text-caption)",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "var(--font-sans)",
          }}
        >
          + Add person
        </button>
      </div>

      <div style={{ padding: "16px" }}>
        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "7px", marginBottom: "14px" }}>
          {[
            { label: "Active people", value: activePeople.length, sub: `${people.filter(p => p.status === "inactive").length} inactive` },
            { label: "Recent hires", value: getRecentHires(), sub: "In the last 30 days" },
            { label: "Teams", value: activeTeams.length, sub: "Active teams" },
          ].map(({ label, value, sub }) => (
            <div key={label} style={{
              background: "var(--surf)",
              border: "1px solid var(--border-1)",
              borderRadius: "6px",
              padding: "10px 12px",
            }}>
              <div style={{ fontSize: "var(--text-overline)", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>
                {label}
              </div>
              <div style={{ fontSize: "20px", fontWeight: 500, color: "var(--text-1)", fontFamily: "var(--font-mono)" }}>
                {value}
              </div>
              <div style={{ fontSize: "var(--text-overline)", color: "var(--text-3)", marginTop: "2px" }}>
                {sub}
              </div>
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
