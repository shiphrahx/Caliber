import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '../../test/mocks/supabase'

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockCallAI = vi.fn()
const mockHandleAIError = vi.fn()

vi.mock('@/lib/services/ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/services/ai')>()
  return {
    ...actual,
    callAI: (...args: unknown[]) => mockCallAI(...args),
    handleAIError: (...args: unknown[]) => mockHandleAIError(...args),
  }
})

// Navigator clipboard
const writeText = vi.fn().mockResolvedValue(undefined)
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText },
  writable: true,
  configurable: true,
})

import { FollowUpDraftModal, type FollowUpDraftModalProps } from '../follow-up-draft-modal'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DEFAULT_MEETING_ARGS: FollowUpDraftModalProps['meetingArgs'] = {
  personName:   'Alice Chen',
  meetingTitle: '1:1 with Alice',
  meetingDate:  '2026-05-23',
  notes:        'Discussed roadmap and promotion.',
  actionItems:  '- Write spec\n- Review PR',
  followUps:    [{ title: 'Share salary band info' }],
}

function renderModal(overrides: Partial<FollowUpDraftModalProps> = {}) {
  const props: FollowUpDraftModalProps = {
    open: true,
    onOpenChange: vi.fn(),
    meetingArgs: DEFAULT_MEETING_ARGS,
    ...overrides,
  }
  return { ...render(<FollowUpDraftModal {...props} />), props }
}

const MOCK_AI_RESPONSE = {
  content: 'Hi Alice, thanks for the chat today. I will share the salary band info and look at the spec by Friday.',
  tokensUsed: { input: 100, output: 50 },
  model: 'claude-sonnet-4-6',
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('FollowUpDraftModal', () => {
  beforeEach(() => {
    mockCallAI.mockReset()
    mockHandleAIError.mockReset()
    writeText.mockReset().mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // ─── Rendering ─────────────────────────────────────────────────────────────

  it('renders the dialog title', () => {
    renderModal()
    expect(screen.getByText('Draft follow-up message')).toBeTruthy()
  })

  it('renders person name in description when provided', () => {
    renderModal()
    expect(screen.getByText(/Alice Chen/)).toBeTruthy()
  })

  it('renders all three tone options', () => {
    renderModal()
    expect(screen.getByText('Formal')).toBeTruthy()
    expect(screen.getByText('Casual')).toBeTruthy()
    expect(screen.getByText('Slack')).toBeTruthy()
  })

  it('shows Generate draft button before any generation', () => {
    renderModal()
    expect(screen.getByText('Generate draft')).toBeTruthy()
  })

  it('does not show Regenerate or Copy buttons before generation', () => {
    renderModal()
    expect(screen.queryByText('Regenerate')).toBeNull()
    expect(screen.queryByText('Copy to clipboard')).toBeNull()
  })

  it('shows message when meeting has no notes or action items', () => {
    renderModal({
      meetingArgs: { ...DEFAULT_MEETING_ARGS, notes: null, actionItems: null },
    })
    expect(screen.getByText(/No notes or action items/)).toBeTruthy()
  })

  // ─── Tone selector ─────────────────────────────────────────────────────────

  it('defaults to casual tone', () => {
    renderModal()
    // Description under tone selector should match casual
    expect(screen.getByText('Warm, conversational')).toBeTruthy()
  })

  it('switches tone description when another tone is selected', () => {
    renderModal()
    fireEvent.click(screen.getByText('Formal'))
    expect(screen.getByText('Professional, full sentences')).toBeTruthy()
  })

  it('switches to slack description when slack is selected', () => {
    renderModal()
    fireEvent.click(screen.getByText('Slack'))
    expect(screen.getByText('Short, bullet-point friendly')).toBeTruthy()
  })

  // ─── Generation ─────────────────────────────────────────────────────────────

  it('calls callAI when Generate draft is clicked', async () => {
    mockCallAI.mockResolvedValueOnce(MOCK_AI_RESPONSE)
    renderModal()
    fireEvent.click(screen.getByText('Generate draft'))
    await waitFor(() => expect(mockCallAI).toHaveBeenCalledTimes(1))
  })

  it('shows loading state while generating', async () => {
    let resolve: (v: typeof MOCK_AI_RESPONSE) => void
    mockCallAI.mockReturnValueOnce(new Promise((r) => { resolve = r }))
    renderModal()
    fireEvent.click(screen.getByText('Generate draft'))
    expect(screen.getByText(/Drafting message/)).toBeTruthy()
    resolve!(MOCK_AI_RESPONSE)
  })

  it('shows draft text after generation', async () => {
    mockCallAI.mockResolvedValueOnce(MOCK_AI_RESPONSE)
    renderModal()
    fireEvent.click(screen.getByText('Generate draft'))
    await waitFor(() =>
      expect(screen.getByDisplayValue(/Hi Alice/)).toBeTruthy()
    )
  })

  it('shows Regenerate button after first generation', async () => {
    mockCallAI.mockResolvedValueOnce(MOCK_AI_RESPONSE)
    renderModal()
    fireEvent.click(screen.getByText('Generate draft'))
    await waitFor(() => expect(screen.getByText('Regenerate')).toBeTruthy())
  })

  it('shows Copy to clipboard button after generation', async () => {
    mockCallAI.mockResolvedValueOnce(MOCK_AI_RESPONSE)
    renderModal()
    fireEvent.click(screen.getByText('Generate draft'))
    await waitFor(() => expect(screen.getByText('Copy to clipboard')).toBeTruthy())
  })

  // ─── Regenerate ─────────────────────────────────────────────────────────────

  it('calls callAI again when Regenerate is clicked', async () => {
    mockCallAI.mockResolvedValue(MOCK_AI_RESPONSE)
    renderModal()
    fireEvent.click(screen.getByText('Generate draft'))
    await waitFor(() => screen.getByText('Regenerate'))
    fireEvent.click(screen.getByText('Regenerate'))
    await waitFor(() => expect(mockCallAI).toHaveBeenCalledTimes(2))
  })

  it('auto-regenerates when tone is changed after first generation', async () => {
    mockCallAI.mockResolvedValue(MOCK_AI_RESPONSE)
    renderModal()
    fireEvent.click(screen.getByText('Generate draft'))
    await waitFor(() => screen.getByText('Regenerate'))
    fireEvent.click(screen.getByText('Formal'))
    await waitFor(() => expect(mockCallAI).toHaveBeenCalledTimes(2))
  })

  it('does NOT auto-regenerate on tone change before first generation', () => {
    renderModal()
    fireEvent.click(screen.getByText('Formal'))
    expect(mockCallAI).not.toHaveBeenCalled()
  })

  // ─── Copy to clipboard ──────────────────────────────────────────────────────

  it('copies draft to clipboard when Copy is clicked', async () => {
    mockCallAI.mockResolvedValueOnce(MOCK_AI_RESPONSE)
    renderModal()
    fireEvent.click(screen.getByText('Generate draft'))
    await waitFor(() => screen.getByText('Copy to clipboard'))
    fireEvent.click(screen.getByText('Copy to clipboard'))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(MOCK_AI_RESPONSE.content))
  })

  it('shows Copied confirmation after copy', async () => {
    mockCallAI.mockResolvedValueOnce(MOCK_AI_RESPONSE)
    renderModal()
    fireEvent.click(screen.getByText('Generate draft'))
    await waitFor(() => screen.getByText('Copy to clipboard'))
    fireEvent.click(screen.getByText('Copy to clipboard'))
    await waitFor(() => expect(screen.getByText('Copied')).toBeTruthy())
  })

  // ─── Error state ─────────────────────────────────────────────────────────────

  it('shows error message when callAI throws', async () => {
    mockCallAI.mockRejectedValueOnce(new Error('API key invalid'))
    renderModal()
    fireEvent.click(screen.getByText('Generate draft'))
    await waitFor(() => expect(screen.getByText('API key invalid')).toBeTruthy())
  })

  it('calls handleAIError when callAI throws', async () => {
    mockCallAI.mockRejectedValueOnce(new Error('Network error'))
    renderModal()
    fireEvent.click(screen.getByText('Generate draft'))
    await waitFor(() => expect(mockHandleAIError).toHaveBeenCalledTimes(1))
  })

  it('shows Try again button after error', async () => {
    mockCallAI.mockRejectedValueOnce(new Error('Bad gateway'))
    renderModal()
    fireEvent.click(screen.getByText('Generate draft'))
    await waitFor(() => expect(screen.getByText('Try again')).toBeTruthy())
  })

  // ─── Draft editable ──────────────────────────────────────────────────────────

  it('allows editing the draft text', async () => {
    mockCallAI.mockResolvedValueOnce(MOCK_AI_RESPONSE)
    renderModal()
    fireEvent.click(screen.getByText('Generate draft'))
    const textarea = await waitFor(() =>
      screen.getByDisplayValue(/Hi Alice/)
    ) as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: 'Custom message' } })
    expect(textarea.value).toBe('Custom message')
  })

  // ─── Close / reset ───────────────────────────────────────────────────────────

  it('calls onOpenChange(false) when Close button is clicked', () => {
    const onOpenChange = vi.fn()
    renderModal({ onOpenChange })
    // The dialog has two "Close" elements: the sr-only Radix X button and our explicit Close button.
    // Get the visible one by role with accessible name.
    const closeButtons = screen.getAllByText('Close')
    // Our explicit Close button is the one that is not sr-only
    const visibleClose = closeButtons.find(
      (el) => !el.classList.contains('sr-only') && el.tagName !== 'SPAN'
    )
    fireEvent.click(visibleClose!)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  // ─── AI prompt wiring ────────────────────────────────────────────────────────

  it('passes FOLLOW_UP_DRAFT_SYSTEM as systemPrompt', async () => {
    mockCallAI.mockResolvedValueOnce(MOCK_AI_RESPONSE)
    renderModal()
    fireEvent.click(screen.getByText('Generate draft'))
    await waitFor(() => expect(mockCallAI).toHaveBeenCalled())
    const [request] = mockCallAI.mock.calls[0]
    expect(request.systemPrompt).toContain('200 words')
    expect(request.systemPrompt).toContain('formal')
  })

  it('includes person name in user prompt', async () => {
    mockCallAI.mockResolvedValueOnce(MOCK_AI_RESPONSE)
    renderModal()
    fireEvent.click(screen.getByText('Generate draft'))
    await waitFor(() => expect(mockCallAI).toHaveBeenCalled())
    const [request] = mockCallAI.mock.calls[0]
    expect(request.userPrompt).toContain('Alice Chen')
  })

  it('includes selected tone in user prompt', async () => {
    mockCallAI.mockResolvedValueOnce(MOCK_AI_RESPONSE)
    renderModal()
    fireEvent.click(screen.getByText('Formal'))
    fireEvent.click(screen.getByText('Generate draft'))
    await waitFor(() => expect(mockCallAI).toHaveBeenCalled())
    const [request] = mockCallAI.mock.calls[0]
    expect(request.userPrompt).toContain('formal')
  })
})
