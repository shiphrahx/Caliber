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
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" style={{ width: '360px', gap: '12px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Dismiss item</span>
          <button onClick={onCancel} className="modal-close-btn">
            <X />
          </button>
        </div>

        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Optional: why are you dismissing this? (e.g. on holiday this week)"
          rows={3}
          className="modal-textarea"
        />

        <div className="modal-footer">
          <button onClick={onCancel} className="btn-ghost" style={{ padding: '6px 12px' }}>
            Cancel
          </button>
          <button onClick={() => onConfirm(note)} className="btn-primary" style={{ padding: '6px 12px' }}>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
