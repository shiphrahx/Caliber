'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface DismissDialogProps {
  onConfirm: (note: string) => void
  onCancel: () => void
}

export function DismissDialog({ onConfirm, onCancel }: DismissDialogProps) {
  const [note, setNote] = useState('')

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
          width: '360px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 'var(--text-body)', fontWeight: 600, color: 'var(--text-1)' }}>
            Dismiss item
          </span>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex' }}>
            <X style={{ width: '14px', height: '14px' }} />
          </button>
        </div>

        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Optional: why are you dismissing this? (e.g. on holiday this week)"
          rows={3}
          style={{
            background: 'var(--surf-3)',
            border: '1px solid var(--border-2)',
            borderRadius: '4px',
            color: 'var(--text-1)',
            fontSize: 'var(--text-meta)',
            padding: '8px 10px',
            resize: 'none',
            fontFamily: 'var(--font-sans)',
            outline: 'none',
          }}
        />

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              background: 'var(--surf-3)',
              border: '1px solid var(--border-2)',
              borderRadius: '4px',
              color: 'var(--text-2)',
              fontSize: 'var(--text-meta)',
              padding: '6px 12px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(note)}
            style={{
              background: 'var(--surf-3)',
              border: '1px solid var(--border-2)',
              borderRadius: '4px',
              color: 'var(--text-1)',
              fontSize: 'var(--text-meta)',
              padding: '6px 12px',
              cursor: 'pointer',
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
