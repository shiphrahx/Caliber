"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { User, Check, FileText, Plus, Trash2, ChevronDown, ChevronRight, RotateCcw } from "lucide-react"
import { useTemplates, type MeetingTemplate } from "@/lib/hooks/use-templates"
import { AISettingsCard } from "@/components/settings/ai-settings-card"

export default function SettingsPage() {
  const [preferredName, setPreferredName] = useState("User")
  const [email] = useState("user@example.com")
  const [saveSuccess, setSaveSuccess] = useState(false)

  const { templates, deletedTemplates, addTemplate, updateTemplate, deleteTemplate, restoreTemplate } = useTemplates()
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<MeetingTemplate | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState("")
  const [newNotes, setNewNotes] = useState("")

  const handleSave = () => {
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  const handleStartEdit = (template: MeetingTemplate) => {
    setEditingTemplate({ ...template })
    setExpandedTemplate(template.id)
  }

  const handleSaveEdit = () => {
    if (!editingTemplate) return
    updateTemplate(editingTemplate.id, { name: editingTemplate.name, notes: editingTemplate.notes })
    setEditingTemplate(null)
  }

  const handleCancelEdit = () => {
    setEditingTemplate(null)
  }

  const handleAdd = () => {
    if (!newName.trim()) return
    addTemplate({ name: newName.trim(), notes: newNotes })
    setNewName("")
    setNewNotes("")
    setIsAdding(false)
  }

  return (
    <>
      <div className="page-topbar">
        <span className="page-topbar-title">Settings</span>
      </div>
      <div className="page-content flex flex-col gap-6">
      <div className="grid gap-6 max-w-4xl">
        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile
            </CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="preferredName">Preferred Name</Label>
              <Input
                id="preferredName"
                value={preferredName}
                onChange={(e) => setPreferredName(e.target.value)}
                placeholder="Enter your preferred name"
              />
              <p className="text-gray-400">
                This is how you'll be addressed throughout the application
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="bg-[#1c1c1c] cursor-not-allowed"
              />
              <p className="text-gray-400">
                Email is managed through your OAuth provider and cannot be changed here
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Meeting Templates */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Meeting Templates
                </CardTitle>
                <CardDescription className="mt-1">
                  Manage note templates used when logging 1:1 meetings
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => { setIsAdding(true); setExpandedTemplate(null); setEditingTemplate(null) }}>
                <Plus className="h-4 w-4" />
                Add Template
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* New template form */}
            {isAdding && (
              <div className="border border-[#383838] rounded-md p-4 space-y-3 bg-[#1c1c1c]">
                <div className="grid gap-1">
                  <Label>Template Name</Label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Onboarding Check-in"
                    autoFocus
                  />
                </div>
                <div className="grid gap-1">
                  <Label>Notes</Label>
                  <Textarea
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="Template content (supports Markdown)..."
                    rows={6}
                    className="bg-[#262626] border-[#383838] text-gray-100 placeholder:text-gray-500 resize-none"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => { setIsAdding(false); setNewName(""); setNewNotes("") }}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleAdd} disabled={!newName.trim()}>
                    Save Template
                  </Button>
                </div>
              </div>
            )}

            {/* Template list */}
            {templates.map((template) => {
              const isExpanded = expandedTemplate === template.id
              const isEditing = editingTemplate?.id === template.id

              return (
                <div key={template.id} className="border border-[#383838] rounded-md overflow-hidden">
                  {/* Header row */}
                  <div
                    className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#292929] transition-colors"
                    onClick={() => !isEditing && setExpandedTemplate(isExpanded ? null : template.id)}
                  >
                    <div className="flex items-center gap-2 text-gray-200 text-sm font-medium">
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                      {template.name}
                    </div>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => isEditing ? handleCancelEdit() : handleStartEdit(template)}>
                        {isEditing ? "Cancel" : "Edit"}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-red-400 hover:text-red-300" onClick={() => deleteTemplate(template.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 bg-[#1c1c1c] border-t border-[#383838] space-y-3">
                      {isEditing ? (
                        <>
                          <div className="grid gap-1">
                            <Label>Template Name</Label>
                            <Input
                              value={editingTemplate.name}
                              onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                            />
                          </div>
                          <div className="grid gap-1">
                            <Label>Notes</Label>
                            <Textarea
                              value={editingTemplate.notes}
                              onChange={(e) => setEditingTemplate({ ...editingTemplate, notes: e.target.value })}
                              rows={8}
                              className="bg-[#262626] border-[#383838] text-gray-100 resize-none font-mono text-xs"
                            />
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button variant="ghost" size="sm" onClick={handleCancelEdit}>Cancel</Button>
                            <Button size="sm" onClick={handleSaveEdit}>Save</Button>
                          </div>
                        </>
                      ) : (
                        <pre className="text-xs text-gray-400 whitespace-pre-wrap font-mono leading-relaxed">
                          {template.notes || <span className="italic">No notes content</span>}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {templates.length === 0 && !isAdding && (
              <p className="text-gray-500 text-sm text-center py-4">No templates yet. Add one to get started.</p>
            )}

            {/* Deleted templates */}
            {deletedTemplates.length > 0 && (
              <div className="mt-6 pt-4 border-t border-[#383838]">
                <div className="flex items-center gap-2 mb-3">
                  <Trash2 className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-400">Deleted templates</span>
                </div>
                <div className="space-y-2">
                  {deletedTemplates.map((template) => (
                    <div key={template.id} className="flex items-center justify-between px-4 py-3 border border-dashed border-[#383838] rounded-md bg-[#1a1a1a]">
                      <span className="text-sm text-gray-500">{template.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-gray-400 hover:text-gray-200"
                        onClick={() => restoreTemplate(template.id)}
                      >
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        Restore
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Assistant */}
        <AISettingsCard />

        <div className="flex items-center justify-between">
          <p className="text-gray-400">Changes will be saved to your account</p>
          <Button onClick={handleSave} className="min-w-[120px]">
            {saveSuccess ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Saved!
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </div>
      </div>
    </>
  )
}
