'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { createFollowUp } from '@/lib/services/follow-ups'
import type { FollowUpSourceType } from '@/lib/services/follow-ups'

interface FollowUpFormProps {
  personId: string
  personName: string
  sourceType?: FollowUpSourceType
  sourceId?: string
  defaultTitle?: string
  onSaved: () => void
  onCancel: () => void
}

export function FollowUpForm({
  personId,
  personName,
  sourceType,
  sourceId,
  defaultTitle = '',
  onSaved,
  onCancel,
}: FollowUpFormProps) {
  const [title, setTitle] = useState(defaultTitle)
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!title.trim()) { setError('Title required'); return }
    setSaving(true)
    setError(null)
    try {
      await createFollowUp({
        personId,
        title: title.trim(),
        description: description.trim() || null,
        sourceType: sourceType ?? 'manual',
        sourceId: sourceId ?? null,
        status: 'open',
        dueDate: dueDate || null,
      })
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box modal-box--sm" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Add follow-up for {personName}</span>
          <button onClick={onCancel} className="modal-close-btn">
            <X />
          </button>
        </div>

        <div className="modal-field">
          <label className="form-label">Title</label>
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="What did you commit to?"
            className="modal-input"
          />
        </div>

        <div className="modal-field">
          <label className="form-label">Description (optional)</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Additional context..."
            rows={3}
            className="modal-textarea"
          />
        </div>

        <div className="modal-field">
          <label className="form-label">Due date (optional)</label>
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className="modal-input modal-input--date"
          />
        </div>

        {error && <p className="modal-error">{error}</p>}

        <div className="modal-footer">
          <button onClick={onCancel} className="modal-btn-cancel">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="modal-btn-primary">
            {saving ? 'Saving...' : 'Save follow-up'}
          </button>
        </div>
      </div>
    </div>
  )
}
