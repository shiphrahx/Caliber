import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EvidenceSection } from '../evidence-section'
import type { EvidenceEntry } from '@/lib/services/evidence'

// Mock the evidence service
vi.mock('@/lib/services/evidence', () => ({
  getEvidenceForPerson: vi.fn(),
  createEvidence: vi.fn(),
  updateEvidence: vi.fn(),
  deleteEvidence: vi.fn(),
}))

import {
  getEvidenceForPerson,
  createEvidence,
  deleteEvidence,
} from '@/lib/services/evidence'

const mockEntry: EvidenceEntry = {
  id: 'ev-1',
  personId: 'person-1',
  personName: 'Alice Smith',
  category: 'achievement',
  title: 'Shipped new feature',
  content: 'Delivered ahead of schedule',
  occurredAt: '2026-03-15',
  meetingId: null,
  meetingTitle: null,
  taskId: null,
  taskTitle: null,
  sentiment: 'positive',
  reviewPeriodStart: null,
  reviewPeriodEnd: null,
  includedInReview: true,
  createdAt: '2026-03-15T10:00:00Z',
  updatedAt: '2026-03-15T10:00:00Z',
}

describe('EvidenceSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getEvidenceForPerson).mockResolvedValue([])
    vi.mocked(createEvidence).mockResolvedValue(mockEntry)
    vi.mocked(deleteEvidence).mockResolvedValue(undefined)
  })

  it('should render the section header with person name', async () => {
    render(<EvidenceSection personId="person-1" personName="Alice Smith" />)
    expect(screen.getByRole('heading', { name: /Evidence/ })).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText(/Alice Smith/)).toBeInTheDocument()
    })
  })

  it('should show empty state when no entries', async () => {
    render(<EvidenceSection personId="person-1" personName="Alice Smith" />)
    await waitFor(() => {
      expect(screen.getByText(/No evidence logged yet/)).toBeInTheDocument()
    })
  })

  it('should render evidence entries after load', async () => {
    vi.mocked(getEvidenceForPerson).mockResolvedValue([mockEntry])
    render(<EvidenceSection personId="person-1" personName="Alice Smith" />)
    await waitFor(() => {
      expect(screen.getByText('Shipped new feature')).toBeInTheDocument()
    })
  })

  it('should render category badge with correct label', async () => {
    vi.mocked(getEvidenceForPerson).mockResolvedValue([mockEntry])
    render(<EvidenceSection personId="person-1" personName="Alice Smith" />)
    await waitFor(() => {
      expect(screen.getByText('Achievement')).toBeInTheDocument()
    })
  })

  it('should render sentiment indicator', async () => {
    vi.mocked(getEvidenceForPerson).mockResolvedValue([mockEntry])
    render(<EvidenceSection personId="person-1" personName="Alice Smith" />)
    await waitFor(() => {
      expect(screen.getByText(/Positive/)).toBeInTheDocument()
    })
  })

  it('should show add evidence form when button clicked', async () => {
    render(<EvidenceSection personId="person-1" personName="Alice Smith" />)
    const user = userEvent.setup()
    const addButton = screen.getByRole('button', { name: /Add Evidence/i })
    await user.click(addButton)
    expect(screen.getByPlaceholderText(/Brief description of the evidence/)).toBeInTheDocument()
  })

  it('should show sentiment toggle buttons in form', async () => {
    render(<EvidenceSection personId="person-1" personName="Alice Smith" />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Add Evidence/i }))
    expect(screen.getByRole('button', { name: /Positive/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Neutral/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Negative/i })).toBeInTheDocument()
  })

  it('should disable Save button when title is empty', async () => {
    render(<EvidenceSection personId="person-1" personName="Alice Smith" />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Add Evidence/i }))
    const saveButton = screen.getByRole('button', { name: /Save Evidence/i })
    expect(saveButton).toBeDisabled()
  })

  it('should call createEvidence on form submit', async () => {
    render(<EvidenceSection personId="person-1" personName="Alice Smith" />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Add Evidence/i }))
    await user.type(screen.getByPlaceholderText(/Brief description of the evidence/), 'Great delivery')
    await user.click(screen.getByRole('button', { name: /Save Evidence/i }))
    await waitFor(() => {
      expect(createEvidence).toHaveBeenCalledWith(
        expect.objectContaining({
          personId: 'person-1',
          title: 'Great delivery',
        })
      )
    })
  })

  it('should hide form after successful save', async () => {
    render(<EvidenceSection personId="person-1" personName="Alice Smith" />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Add Evidence/i }))
    await user.type(screen.getByPlaceholderText(/Brief description of the evidence/), 'Test entry')
    await user.click(screen.getByRole('button', { name: /Save Evidence/i }))
    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/Brief description of the evidence/)).not.toBeInTheDocument()
    })
  })

  it('should expand entry on click to show content', async () => {
    vi.mocked(getEvidenceForPerson).mockResolvedValue([mockEntry])
    render(<EvidenceSection personId="person-1" personName="Alice Smith" />)
    const user = userEvent.setup()
    await waitFor(() => screen.getByText('Shipped new feature'))
    await user.click(screen.getByText('Shipped new feature').closest('div[style]')!)
    await waitFor(() => {
      expect(screen.getByText('Delivered ahead of schedule')).toBeInTheDocument()
    })
  })

  it('should call deleteEvidence when delete button clicked', async () => {
    vi.mocked(getEvidenceForPerson).mockResolvedValue([mockEntry])
    render(<EvidenceSection personId="person-1" personName="Alice Smith" />)
    const user = userEvent.setup()
    await waitFor(() => screen.getByText('Shipped new feature'))
    // Expand the entry first
    await user.click(screen.getByText('Shipped new feature').closest('div[style]')!)
    await waitFor(() => screen.getByRole('button', { name: /Delete/i }))
    await user.click(screen.getByRole('button', { name: /Delete/i }))
    await waitFor(() => {
      expect(deleteEvidence).toHaveBeenCalledWith('ev-1')
    })
  })

  it('should show Review Prep link', async () => {
    render(<EvidenceSection personId="person-1" personName="Alice Smith" />)
    expect(screen.getByRole('link', { name: /Review Prep/i })).toHaveAttribute('href', '/people/person-1/review')
  })

  it('should show linked meeting indicator when meetingId set', async () => {
    const entryWithMeeting: EvidenceEntry = {
      ...mockEntry,
      meetingId: 'meeting-1',
      meetingTitle: '1:1 with Alice',
    }
    vi.mocked(getEvidenceForPerson).mockResolvedValue([entryWithMeeting])
    render(<EvidenceSection personId="person-1" personName="Alice Smith" />)
    await waitFor(() => {
      // Link2 icon rendered on the row
      const row = screen.getByText('Shipped new feature').closest('div[style]')!
      expect(row).toBeInTheDocument()
    })
  })
})
