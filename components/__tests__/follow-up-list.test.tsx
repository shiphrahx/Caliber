import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '../../test/mocks/supabase'
import { FollowUpList } from '../follow-ups/follow-up-list'
import type { FollowUp } from '@/lib/services/follow-ups'

const mockCompleteFollowUp = vi.fn().mockResolvedValue({})
const mockCancelFollowUp = vi.fn().mockResolvedValue({})

vi.mock('@/lib/services/follow-ups', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/services/follow-ups')>()
  return {
    ...actual,
    completeFollowUp: (...args: unknown[]) => mockCompleteFollowUp(...args),
    cancelFollowUp: (...args: unknown[]) => mockCancelFollowUp(...args),
    deleteFollowUp: vi.fn().mockResolvedValue(undefined),
  }
})

function makeFollowUp(overrides: Partial<FollowUp> = {}): FollowUp {
  return {
    id: 'fu-1',
    userId: 'user-1',
    personId: 'person-1',
    personName: 'Alice Smith',
    title: 'Check in on project blockers',
    description: null,
    sourceType: null,
    sourceId: null,
    sourceName: null,
    status: 'open',
    dueDate: null,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    completedAt: null,
    cancelledAt: null,
    lastSurfacedAt: null,
    timesSurfaced: 0,
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('FollowUpList', () => {
  it('renders empty state when no follow-ups', () => {
    render(<FollowUpList followUps={[]} onChanged={vi.fn()} />)
    expect(screen.getByText('No follow-ups')).toBeInTheDocument()
  })

  it('renders open follow-up title', () => {
    render(<FollowUpList followUps={[makeFollowUp()]} onChanged={vi.fn()} />)
    expect(screen.getByText('Check in on project blockers')).toBeInTheDocument()
  })

  it('shows Open badge for open follow-up without due date', () => {
    render(<FollowUpList followUps={[makeFollowUp()]} onChanged={vi.fn()} />)
    expect(screen.getByText('Open')).toBeInTheDocument()
  })

  it('shows Overdue badge when past due date', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0]
    render(<FollowUpList followUps={[makeFollowUp({ dueDate: yesterday })]} onChanged={vi.fn()} />)
    expect(screen.getByText('Overdue')).toBeInTheDocument()
  })

  it('does not show Overdue badge for future due date', () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0]
    render(<FollowUpList followUps={[makeFollowUp({ dueDate: tomorrow })]} onChanged={vi.fn()} />)
    expect(screen.queryByText('Overdue')).not.toBeInTheDocument()
  })

  it('calls completeFollowUp and onChanged when Done clicked', async () => {
    const onChanged = vi.fn()
    render(<FollowUpList followUps={[makeFollowUp()]} onChanged={onChanged} />)

    fireEvent.click(screen.getByTitle('Mark complete'))

    await waitFor(() => {
      expect(mockCompleteFollowUp).toHaveBeenCalledWith('fu-1')
      expect(onChanged).toHaveBeenCalled()
    })
  })

  it('calls cancelFollowUp and onChanged when cancel clicked', async () => {
    const onChanged = vi.fn()
    render(<FollowUpList followUps={[makeFollowUp()]} onChanged={onChanged} />)

    fireEvent.click(screen.getByTitle('Cancel'))

    await waitFor(() => {
      expect(mockCancelFollowUp).toHaveBeenCalledWith('fu-1')
      expect(onChanged).toHaveBeenCalled()
    })
  })

  it('shows closed count button and expands on click', () => {
    const closed = makeFollowUp({ id: 'fu-2', status: 'completed', completedAt: '2026-05-01T10:00:00Z', title: 'Old task done' })
    render(<FollowUpList followUps={[makeFollowUp(), closed]} onChanged={vi.fn()} />)

    expect(screen.getByText('1 closed')).toBeInTheDocument()
    expect(screen.queryByText('Old task done')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('1 closed'))
    expect(screen.getByText('Old task done')).toBeInTheDocument()
  })

  it('shows Done badge for completed follow-up when expanded', () => {
    const closed = makeFollowUp({ id: 'fu-2', status: 'completed', completedAt: '2026-05-01T10:00:00Z', title: 'Finished item' })
    render(<FollowUpList followUps={[closed]} onChanged={vi.fn()} />)

    fireEvent.click(screen.getByText('1 closed'))
    expect(screen.getByText('Done')).toBeInTheDocument()
  })

  it('shows person name link when showPerson=true', () => {
    render(<FollowUpList followUps={[makeFollowUp()]} onChanged={vi.fn()} showPerson={true} />)
    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
  })

  it('does not show person name when showPerson=false (default)', () => {
    render(<FollowUpList followUps={[makeFollowUp()]} onChanged={vi.fn()} />)
    expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument()
  })

  it('shows source name when present', () => {
    const fu = makeFollowUp({ sourceName: 'Sprint Retro', sourceType: 'meeting' })
    render(<FollowUpList followUps={[fu]} onChanged={vi.fn()} />)
    expect(screen.getByText(/Sprint Retro/)).toBeInTheDocument()
  })

  it('shows due date when set', () => {
    const fu = makeFollowUp({ dueDate: '2026-05-15' })
    render(<FollowUpList followUps={[fu]} onChanged={vi.fn()} />)
    expect(screen.getByText(/Due/)).toBeInTheDocument()
  })

  it('shows age in days when no due date', () => {
    render(<FollowUpList followUps={[makeFollowUp()]} onChanged={vi.fn()} />)
    expect(screen.getByText(/\dd old/)).toBeInTheDocument()
  })
})
