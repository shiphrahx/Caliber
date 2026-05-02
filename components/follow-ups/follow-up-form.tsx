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
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: 'var(--surf-2)',
          border: '1px solid var(--border-2)',
          borderRadius: '8px',
          padding: '20px',
          width: '400px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 'var(--text-body)', fontWeight: 600, color: 'var(--text-1)' }}>
            Add follow-up for {personName}
          </span>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex' }}>
            <X style={{ width: '14px', height: '14px' }} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label className="form-label">Title</label>
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="What did you commit to?"
            style={{
              background: 'var(--surf-3)',
              border: '1px solid var(--border-2)',
              borderRadius: '4px',
              color: 'var(--text-1)',
              fontSize: 'var(--text-body)',
              padding: '7px 10px',
              fontFamily: 'var(--font-sans)',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label className="form-label">Description (optional)</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Additional context..."
            rows={3}
            style={{
              background: 'var(--surf-3)',
              border: '1px solid var(--border-2)',
              borderRadius: '4px',
              color: 'var(--text-1)',
              fontSize: 'var(--text-meta)',
              padding: '7px 10px',
              resize: 'none',
              fontFamily: 'var(--font-sans)',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label className="form-label">Due date (optional)</label>
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            style={{
              background: 'var(--surf-3)',
              border: '1px solid var(--border-2)',
              borderRadius: '4px',
              color: 'var(--text-1)',
              fontSize: 'var(--text-meta)',
              padding: '6px 10px',
              fontFamily: 'var(--font-sans)',
              outline: 'none',
            }}
          />
        </div>

        {error && <p style={{ fontSize: 'var(--text-meta)', color: '#ff6b6b', margin: 0 }}>{error}</p>}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              background: 'var(--surf-3)',
              border: '1px solid var(--border-2)',
              borderRadius: '4px',
              color: 'var(--text-2)',
              fontSize: 'var(--text-meta)',
              padding: '6px 14px',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: 'var(--surf-3)',
              border: '1px solid #00f058',
              borderRadius: '4px',
              color: '#00f058',
              fontSize: 'var(--text-meta)',
              fontWeight: 600,
              padding: '6px 14px',
              cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
              fontFamily: 'var(--font-sans)',
            }}
          >
            {saving ? 'Saving...' : 'Save follow-up'}
          </button>
        </div>
      </div>
    </div>
  )
}
