/**
 * NaturalLanguageTaskInput component tests
 *
 * Mocks AI service calls — no live AI requests.
 * Tests:
 * - Rendering and input state
 * - Parse trigger (Enter key / button click)
 * - Preview dialog populated from parsed result
 * - Editable preview fields
 * - Confirm creates task with correct shape
 * - Cancel/close clears state
 * - Graceful error handling when AI fails
 * - Assignee matched from people list
 * - Confidence badge display
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NaturalLanguageTaskInput } from '../natural-language-task-input'
import type { NaturalLanguageTaskPerson, NaturalLanguageTaskResult } from '@/lib/services/tasks'

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@/lib/services/tasks', () => ({
  parseNaturalLanguageTask: vi.fn(),
}))

vi.mock('@/lib/services/ai', () => ({
  handleAIError: vi.fn(),
}))

import { parseNaturalLanguageTask } from '@/lib/services/tasks'
import { handleAIError } from '@/lib/services/ai'

const mockParseNaturalLanguageTask = vi.mocked(parseNaturalLanguageTask)
const mockHandleAIError = vi.mocked(handleAIError)

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PEOPLE: NaturalLanguageTaskPerson[] = [
  { id: 'person-alice', name: 'Alice Chen' },
  { id: 'person-bob', name: 'Bob Smith' },
]

const PARSED_HIGH_CONFIDENCE: NaturalLanguageTaskResult = {
  title: 'Follow up with Alice about the deploy',
  priority: 'High',
  category: 'People',
  dueDate: '2026-05-30',
  assigneeId: 'person-alice',
  list: 'week',
  confidence: 'high',
}

const PARSED_LOW_CONFIDENCE: NaturalLanguageTaskResult = {
  title: 'Do something vague',
  priority: 'Medium',
  category: 'Task',
  dueDate: null,
  assigneeId: null,
  list: 'backlog',
  confidence: 'low',
}

const DEFAULT_CONFIRM = vi.fn()

function renderComponent(people = PEOPLE, onConfirm = DEFAULT_CONFIRM) {
  return render(
    <NaturalLanguageTaskInput
      people={people}
      onConfirm={onConfirm}
      today="2026-05-23"
    />
  )
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

describe('NaturalLanguageTaskInput — rendering', () => {
  it('renders the input field', () => {
    renderComponent()
    expect(screen.getByRole('textbox', { name: /natural language task input/i })).toBeInTheDocument()
  })

  it('renders the sparkles icon', () => {
    const { container } = renderComponent()
    // Lucide icons render as SVGs
    const svgs = container.querySelectorAll('svg')
    expect(svgs.length).toBeGreaterThan(0)
  })

  it('parse button is disabled when input is empty', () => {
    renderComponent()
    expect(screen.getByRole('button', { name: /parse task/i })).toBeDisabled()
  })

  it('parse button enables when input has text', async () => {
    const user = userEvent.setup()
    renderComponent()
    await user.type(screen.getByRole('textbox'), 'some task')
    expect(screen.getByRole('button', { name: /parse task/i })).not.toBeDisabled()
  })

  it('input placeholder is visible', () => {
    renderComponent()
    expect(screen.getByPlaceholderText(/describe a task/i)).toBeInTheDocument()
  })
})

describe('NaturalLanguageTaskInput — parsing', () => {
  it('calls parseNaturalLanguageTask with trimmed input on Enter', async () => {
    mockParseNaturalLanguageTask.mockResolvedValue(PARSED_HIGH_CONFIDENCE)
    const user = userEvent.setup()
    renderComponent()

    await user.type(screen.getByRole('textbox'), '  Follow up with Alice  ')
    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(mockParseNaturalLanguageTask).toHaveBeenCalledWith(
        'Follow up with Alice',
        PEOPLE,
        '2026-05-23',
        expect.anything()
      )
    })
  })

  it('calls parseNaturalLanguageTask when parse button clicked', async () => {
    mockParseNaturalLanguageTask.mockResolvedValue(PARSED_HIGH_CONFIDENCE)
    const user = userEvent.setup()
    renderComponent()

    await user.type(screen.getByRole('textbox'), 'Write team update')
    await user.click(screen.getByRole('button', { name: /parse task/i }))

    await waitFor(() => {
      expect(mockParseNaturalLanguageTask).toHaveBeenCalledOnce()
    })
  })

  it('does not call parse when input is empty and Enter pressed', async () => {
    const user = userEvent.setup()
    renderComponent()
    await user.keyboard('{Enter}')
    expect(mockParseNaturalLanguageTask).not.toHaveBeenCalled()
  })

  it('clears input with Escape key', async () => {
    const user = userEvent.setup()
    renderComponent()
    const input = screen.getByRole('textbox')
    await user.type(input, 'some text')
    expect(input).toHaveValue('some text')
    await user.keyboard('{Escape}')
    expect(input).toHaveValue('')
  })

  it('calls handleAIError when parse fails', async () => {
    mockParseNaturalLanguageTask.mockRejectedValue(new Error('AI error'))
    const user = userEvent.setup()
    renderComponent()

    await user.type(screen.getByRole('textbox'), 'any task')
    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(mockHandleAIError).toHaveBeenCalledWith(expect.any(Error))
    })
  })
})

describe('NaturalLanguageTaskInput — preview dialog', () => {
  it('opens preview dialog after successful parse', async () => {
    mockParseNaturalLanguageTask.mockResolvedValue(PARSED_HIGH_CONFIDENCE)
    const user = userEvent.setup()
    renderComponent()

    await user.type(screen.getByRole('textbox'), 'Follow up with Alice about the deploy')
    await user.keyboard('{Enter}')

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
    expect(screen.getByText(/review parsed task/i)).toBeInTheDocument()
  })

  it('populates title field from parse result', async () => {
    mockParseNaturalLanguageTask.mockResolvedValue(PARSED_HIGH_CONFIDENCE)
    const user = userEvent.setup()
    renderComponent()

    await user.type(screen.getByRole('textbox'), 'test')
    await user.keyboard('{Enter}')

    await waitFor(() => screen.getByRole('dialog'))
    const titleInput = screen.getByLabelText('Title')
    expect(titleInput).toHaveValue('Follow up with Alice about the deploy')
  })

  it('shows matched assignee name in dialog', async () => {
    mockParseNaturalLanguageTask.mockResolvedValue(PARSED_HIGH_CONFIDENCE)
    const user = userEvent.setup()
    renderComponent()

    await user.type(screen.getByRole('textbox'), 'Follow up with Alice')
    await user.keyboard('{Enter}')

    await waitFor(() => screen.getByRole('dialog'))
    expect(screen.getByText('Alice Chen')).toBeInTheDocument()
  })

  it('does not show assignee section when no assignee matched', async () => {
    mockParseNaturalLanguageTask.mockResolvedValue(PARSED_LOW_CONFIDENCE)
    const user = userEvent.setup()
    renderComponent()

    await user.type(screen.getByRole('textbox'), 'vague task')
    await user.keyboard('{Enter}')

    await waitFor(() => screen.getByRole('dialog'))
    expect(screen.queryByText('Linked person')).not.toBeInTheDocument()
  })

  it('shows high confidence indicator', async () => {
    mockParseNaturalLanguageTask.mockResolvedValue(PARSED_HIGH_CONFIDENCE)
    const user = userEvent.setup()
    renderComponent()

    await user.type(screen.getByRole('textbox'), 'test')
    await user.keyboard('{Enter}')

    await waitFor(() => screen.getByRole('dialog'))
    expect(screen.getByText(/high confidence/i)).toBeInTheDocument()
  })

  it('shows low confidence indicator', async () => {
    mockParseNaturalLanguageTask.mockResolvedValue(PARSED_LOW_CONFIDENCE)
    const user = userEvent.setup()
    renderComponent()

    await user.type(screen.getByRole('textbox'), 'vague')
    await user.keyboard('{Enter}')

    await waitFor(() => screen.getByRole('dialog'))
    expect(screen.getByText(/low confidence/i)).toBeInTheDocument()
  })

  it('shows raw input in dialog description', async () => {
    mockParseNaturalLanguageTask.mockResolvedValue(PARSED_HIGH_CONFIDENCE)
    const user = userEvent.setup()
    renderComponent()

    await user.type(screen.getByRole('textbox'), 'Follow up with Alice')
    await user.keyboard('{Enter}')

    await waitFor(() => screen.getByRole('dialog'))
    expect(screen.getByText(/follow up with alice/i)).toBeInTheDocument()
  })

  it('Create task button is disabled when title is empty', async () => {
    mockParseNaturalLanguageTask.mockResolvedValue({ ...PARSED_HIGH_CONFIDENCE, title: '' })
    const user = userEvent.setup()
    renderComponent()

    await user.type(screen.getByRole('textbox'), 'test')
    await user.keyboard('{Enter}')

    await waitFor(() => screen.getByRole('dialog'))
    expect(screen.getByRole('button', { name: /create task/i })).toBeDisabled()
  })
})

describe('NaturalLanguageTaskInput — preview editing', () => {
  async function openPreview(user: ReturnType<typeof userEvent.setup>) {
    mockParseNaturalLanguageTask.mockResolvedValue(PARSED_HIGH_CONFIDENCE)
    await user.type(screen.getByRole('textbox'), 'Follow up with Alice')
    await user.keyboard('{Enter}')
    await waitFor(() => screen.getByRole('dialog'))
  }

  it('title is editable', async () => {
    const user = userEvent.setup()
    renderComponent()
    await openPreview(user)

    const titleInput = screen.getByLabelText('Title')
    await user.clear(titleInput)
    await user.type(titleInput, 'Updated title')
    expect(titleInput).toHaveValue('Updated title')
  })
})

describe('NaturalLanguageTaskInput — confirm', () => {
  it('calls onConfirm with correct task shape on Create task', async () => {
    mockParseNaturalLanguageTask.mockResolvedValue(PARSED_HIGH_CONFIDENCE)
    const onConfirm = vi.fn()
    const user = userEvent.setup()
    render(
      <NaturalLanguageTaskInput people={PEOPLE} onConfirm={onConfirm} today="2026-05-23" />
    )

    await user.type(screen.getByRole('textbox'), 'Follow up with Alice')
    await user.keyboard('{Enter}')
    await waitFor(() => screen.getByRole('dialog'))

    await user.click(screen.getByRole('button', { name: /create task/i }))

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Follow up with Alice about the deploy',
        priority: 'High',
        category: 'People',
        dueDate: '2026-05-30',
        list: 'week',
        status: 'Not started',
      })
    )
  })

  it('clears input and closes dialog after confirm', async () => {
    mockParseNaturalLanguageTask.mockResolvedValue(PARSED_HIGH_CONFIDENCE)
    const onConfirm = vi.fn()
    const user = userEvent.setup()
    render(
      <NaturalLanguageTaskInput people={PEOPLE} onConfirm={onConfirm} today="2026-05-23" />
    )

    await user.type(screen.getByRole('textbox'), 'some task')
    await user.keyboard('{Enter}')
    await waitFor(() => screen.getByRole('dialog'))

    await user.click(screen.getByRole('button', { name: /create task/i }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('textbox')).toHaveValue('')
  })

  it('closes dialog and keeps input on Cancel', async () => {
    mockParseNaturalLanguageTask.mockResolvedValue(PARSED_HIGH_CONFIDENCE)
    const onConfirm = vi.fn()
    const user = userEvent.setup()
    render(
      <NaturalLanguageTaskInput people={PEOPLE} onConfirm={onConfirm} today="2026-05-23" />
    )

    await user.type(screen.getByRole('textbox'), 'some task')
    await user.keyboard('{Enter}')
    await waitFor(() => screen.getByRole('dialog'))

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('uses edited title in confirmed task', async () => {
    mockParseNaturalLanguageTask.mockResolvedValue(PARSED_HIGH_CONFIDENCE)
    const onConfirm = vi.fn()
    const user = userEvent.setup()
    render(
      <NaturalLanguageTaskInput people={PEOPLE} onConfirm={onConfirm} today="2026-05-23" />
    )

    await user.type(screen.getByRole('textbox'), 'test')
    await user.keyboard('{Enter}')
    await waitFor(() => screen.getByRole('dialog'))

    const titleInput = screen.getByLabelText('Title')
    await user.clear(titleInput)
    await user.type(titleInput, 'Manually edited title')

    await user.click(screen.getByRole('button', { name: /create task/i }))

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Manually edited title' })
    )
  })
})

describe('NaturalLanguageTaskInput — edge cases', () => {
  it('handles people list with no matches for assigneeId', async () => {
    const parsed: NaturalLanguageTaskResult = {
      ...PARSED_HIGH_CONFIDENCE,
      assigneeId: 'non-existent-id',
    }
    mockParseNaturalLanguageTask.mockResolvedValue(parsed)
    const user = userEvent.setup()
    renderComponent()

    await user.type(screen.getByRole('textbox'), 'test')
    await user.keyboard('{Enter}')

    await waitFor(() => screen.getByRole('dialog'))
    // No "Linked person" section since ID not matched
    expect(screen.queryByText('Linked person')).not.toBeInTheDocument()
  })

  it('works with empty people list', async () => {
    mockParseNaturalLanguageTask.mockResolvedValue(PARSED_LOW_CONFIDENCE)
    const user = userEvent.setup()
    renderComponent([], vi.fn())

    await user.type(screen.getByRole('textbox'), 'any task')
    await user.keyboard('{Enter}')

    await waitFor(() => screen.getByRole('dialog'))
    expect(screen.getByText(/review parsed task/i)).toBeInTheDocument()
  })

  it('does not double-fire parse on rapid Enter presses (isParsing guard)', async () => {
    let resolveFirst!: (v: NaturalLanguageTaskResult) => void
    const slowPromise = new Promise<NaturalLanguageTaskResult>(r => { resolveFirst = r })
    mockParseNaturalLanguageTask.mockReturnValue(slowPromise)

    const user = userEvent.setup()
    renderComponent()

    await user.type(screen.getByRole('textbox'), 'task')
    await user.keyboard('{Enter}')
    await user.keyboard('{Enter}')

    resolveFirst(PARSED_HIGH_CONFIDENCE)
    await waitFor(() => screen.getByRole('dialog'))

    // Only called once — second Enter ignored while isParsing
    expect(mockParseNaturalLanguageTask).toHaveBeenCalledOnce()
  })
})
