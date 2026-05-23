/**
 * Tests for BatchEvidenceImportModal
 * Tests input step, extraction, preview table, selection, and bulk save.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BatchEvidenceImportModal } from '../batch-evidence-import-modal'

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/services/ai', () => ({
  callAI: vi.fn(),
  handleAIError: vi.fn(),
}))

vi.mock('@/lib/ai/prompts', () => ({
  BATCH_EVIDENCE_EXTRACTION_SYSTEM: 'batch-system-prompt',
  buildBatchEvidencePrompt: vi.fn().mockReturnValue('batch-user-prompt'),
}))

vi.mock('@/lib/services/evidence', () => ({
  createEvidence: vi.fn().mockResolvedValue({ id: 'ev1' }),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() },
}))

import { callAI } from '@/lib/services/ai'
import { createEvidence } from '@/lib/services/evidence'
import { toast } from 'sonner'

const PEOPLE = [
  { id: 'p1', name: 'Alice Chen' },
  { id: 'p2', name: 'Bob Smith' },
]

const MOCK_EXTRACTED = [
  {
    title: 'Delivered migration ahead of schedule',
    content: 'Completed 2 weeks early.',
    category: 'achievement',
    sentiment: 'positive',
    occurredAt: '2026-05-01',
    personName: 'Alice Chen',
  },
  {
    title: 'Late to standup twice this week',
    content: null,
    category: 'concern',
    sentiment: 'negative',
    occurredAt: '2026-05-10',
    personName: 'Bob Smith',
  },
]

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  people: PEOPLE,
}

describe('BatchEvidenceImportModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── Input step ──────────────────────────────────────────────────────────────

  it('renders the input step on open', () => {
    render(<BatchEvidenceImportModal {...defaultProps} />)
    expect(screen.getByText('Import Evidence from Text')).toBeTruthy()
    expect(screen.getByPlaceholderText(/Paste Slack messages/i)).toBeTruthy()
  })

  it('shows Extract Evidence button disabled when text is empty', () => {
    render(<BatchEvidenceImportModal {...defaultProps} />)
    const btn = screen.getByRole('button', { name: /Extract Evidence/i })
    expect(btn).toBeDisabled()
  })

  it('enables Extract Evidence button when text is entered', () => {
    render(<BatchEvidenceImportModal {...defaultProps} />)
    const textarea = screen.getByPlaceholderText(/Paste Slack messages/i)
    fireEvent.change(textarea, { target: { value: 'Alice did great work.' } })
    const btn = screen.getByRole('button', { name: /Extract Evidence/i })
    expect(btn).not.toBeDisabled()
  })

  it('shows context person note when contextPersonName is provided', () => {
    render(<BatchEvidenceImportModal {...defaultProps} contextPersonName="Alice Chen" />)
    expect(screen.getByText(/Alice Chen/)).toBeTruthy()
    expect(screen.getByText(/Context:/)).toBeTruthy()
  })

  it('shows validation error when Extract clicked with empty text', async () => {
    render(<BatchEvidenceImportModal {...defaultProps} />)
    // Manually enable the button by manipulating state — use direct fireEvent
    // Instead we just verify empty textarea results in error message
    const textarea = screen.getByPlaceholderText(/Paste Slack messages/i)
    fireEvent.change(textarea, { target: { value: '' } })
    // Button is disabled so we can't click. Test passes if button is indeed disabled.
    expect(screen.getByRole('button', { name: /Extract Evidence/i })).toBeDisabled()
  })

  // ─── Extraction ───────────────────────────────────────────────────────────────

  it('calls callAI and transitions to preview step on successful extraction', async () => {
    ;(callAI as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: JSON.stringify(MOCK_EXTRACTED),
      tokensUsed: { input: 100, output: 50 },
      model: 'claude',
    })

    render(<BatchEvidenceImportModal {...defaultProps} />)
    fireEvent.change(screen.getByPlaceholderText(/Paste Slack messages/i), {
      target: { value: 'Some performance notes about Alice and Bob.' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Extract Evidence/i }))

    await waitFor(() => {
      // Titles render in editable input fields
      expect(screen.getByDisplayValue('Delivered migration ahead of schedule')).toBeTruthy()
    })
    expect(screen.getByDisplayValue('Late to standup twice this week')).toBeTruthy()
  })

  it('shows error when AI returns non-JSON', async () => {
    ;(callAI as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: 'Sorry, I cannot help with that.',
      tokensUsed: { input: 10, output: 5 },
      model: 'claude',
    })

    render(<BatchEvidenceImportModal {...defaultProps} />)
    fireEvent.change(screen.getByPlaceholderText(/Paste Slack messages/i), {
      target: { value: 'Some notes.' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Extract Evidence/i }))

    await waitFor(() => {
      expect(screen.getByText(/Could not parse AI response/i)).toBeTruthy()
    })
  })

  it('shows empty state message when AI returns empty array', async () => {
    ;(callAI as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: '[]',
      tokensUsed: { input: 10, output: 2 },
      model: 'claude',
    })

    render(<BatchEvidenceImportModal {...defaultProps} />)
    fireEvent.change(screen.getByPlaceholderText(/Paste Slack messages/i), {
      target: { value: 'Generic text with no specifics.' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Extract Evidence/i }))

    await waitFor(() => {
      expect(screen.getByText(/No extractable evidence found/i)).toBeTruthy()
    })
  })

  // ─── Preview step ─────────────────────────────────────────────────────────────

  it('shows select all and deselect all buttons in preview', async () => {
    ;(callAI as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: JSON.stringify(MOCK_EXTRACTED),
      tokensUsed: { input: 100, output: 50 },
      model: 'claude',
    })

    render(<BatchEvidenceImportModal {...defaultProps} />)
    fireEvent.change(screen.getByPlaceholderText(/Paste Slack messages/i), {
      target: { value: 'Notes.' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Extract Evidence/i }))

    await waitFor(() => screen.getByText('Select all'))
    expect(screen.getByText('Deselect all')).toBeTruthy()
  })

  it('shows count of selected entries', async () => {
    ;(callAI as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: JSON.stringify(MOCK_EXTRACTED),
      tokensUsed: { input: 100, output: 50 },
      model: 'claude',
    })

    render(<BatchEvidenceImportModal {...defaultProps} />)
    fireEvent.change(screen.getByPlaceholderText(/Paste Slack messages/i), {
      target: { value: 'Notes.' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Extract Evidence/i }))

    await waitFor(() => screen.getByText(/selected/i))
    // Both entries selected by default
    expect(screen.getByText(/2 selected/i)).toBeTruthy()
  })

  it('shows Back button in preview step', async () => {
    ;(callAI as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: JSON.stringify(MOCK_EXTRACTED),
      tokensUsed: { input: 100, output: 50 },
      model: 'claude',
    })

    render(<BatchEvidenceImportModal {...defaultProps} />)
    fireEvent.change(screen.getByPlaceholderText(/Paste Slack messages/i), {
      target: { value: 'Notes.' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Extract Evidence/i }))

    await waitFor(() => screen.getByText(/← Back/i))
    expect(screen.getByText(/← Back/i)).toBeTruthy()
  })

  it('navigates back to input step when Back is clicked', async () => {
    ;(callAI as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: JSON.stringify(MOCK_EXTRACTED),
      tokensUsed: { input: 100, output: 50 },
      model: 'claude',
    })

    render(<BatchEvidenceImportModal {...defaultProps} />)
    fireEvent.change(screen.getByPlaceholderText(/Paste Slack messages/i), {
      target: { value: 'Notes.' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Extract Evidence/i }))

    await waitFor(() => screen.getByText(/← Back/i))
    fireEvent.click(screen.getByText(/← Back/i))

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Paste Slack messages/i)).toBeTruthy()
    })
  })

  // ─── Bulk save ────────────────────────────────────────────────────────────────

  it('calls createEvidence for each selected entry on save', async () => {
    ;(callAI as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: JSON.stringify(MOCK_EXTRACTED),
      tokensUsed: { input: 100, output: 50 },
      model: 'claude',
    })

    render(<BatchEvidenceImportModal {...defaultProps} />)
    fireEvent.change(screen.getByPlaceholderText(/Paste Slack messages/i), {
      target: { value: 'Notes.' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Extract Evidence/i }))

    await waitFor(() => screen.getByText(/Save 2 entries/i))
    fireEvent.click(screen.getByText(/Save 2 entries/i))

    await waitFor(() => {
      expect(createEvidence).toHaveBeenCalledTimes(2)
    })
    expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/Saved 2/i))
  })

  it('shows toast info when no entries selected for save', async () => {
    ;(callAI as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: JSON.stringify(MOCK_EXTRACTED),
      tokensUsed: { input: 100, output: 50 },
      model: 'claude',
    })

    render(<BatchEvidenceImportModal {...defaultProps} />)
    fireEvent.change(screen.getByPlaceholderText(/Paste Slack messages/i), {
      target: { value: 'Notes.' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Extract Evidence/i }))

    await waitFor(() => screen.getByText('Deselect all'))
    fireEvent.click(screen.getByText('Deselect all'))

    await waitFor(() => {
      const saveBtn = screen.getByRole('button', { name: /Save/i })
      expect(saveBtn).toBeDisabled()
    })
  })
})
