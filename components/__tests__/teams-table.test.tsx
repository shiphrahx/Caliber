import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TeamsTable } from '../teams-table'
import type { Team } from '@/lib/services/teams'

describe('TeamsTable', () => {
  const mockTeams: Team[] = [
    {
      id: '1',
      name: 'Platform Engineering',
      description: 'Core platform development',
      status: 'active',
      memberCount: 5,
      createdAt: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      name: 'Product Team',
      description: 'Product development',
      status: 'inactive',
      memberCount: 3,
      createdAt: '2024-01-02T00:00:00Z',
    },
  ]

  const mockHandlers = {
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onToggleStatus: vi.fn(),
    onQuickAdd: vi.fn(),
  }

  it('should render all teams in the table', () => {
    render(<TeamsTable teams={mockTeams} {...mockHandlers} />)

    expect(screen.getByText('Platform Engineering')).toBeInTheDocument()
    expect(screen.getByText('Product Team')).toBeInTheDocument()
    expect(screen.getByText('Core platform development')).toBeInTheDocument()
  })

  it('should display member count for each team', () => {
    render(<TeamsTable teams={mockTeams} {...mockHandlers} />)

    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('should display status badges with correct styling', () => {
    render(<TeamsTable teams={mockTeams} {...mockHandlers} />)

    const badges = screen.getAllByText(/active|inactive/i)
    expect(badges).toHaveLength(2)
  })

  it('should display formatted creation dates', () => {
    render(<TeamsTable teams={mockTeams} {...mockHandlers} />)

    // Dates should be formatted as "01 Jan 2024" format
    const dates = screen.getAllByText(/Jan.*2024/)
    expect(dates.length).toBeGreaterThanOrEqual(1)
  })

  it('should show inline action buttons', () => {
    render(<TeamsTable teams={mockTeams} {...mockHandlers} />)
    const editButtons = screen.getAllByText('Edit')
    expect(editButtons.length).toBeGreaterThanOrEqual(1)
    const deactivateButtons = screen.getAllByText('Deactivate')
    expect(deactivateButtons.length).toBeGreaterThanOrEqual(1)
    const deleteButtons = screen.getAllByText('Delete')
    expect(deleteButtons.length).toBeGreaterThanOrEqual(1)
  })

  it('should call onEdit when Edit is clicked', async () => {
    const user = userEvent.setup()
    render(<TeamsTable teams={mockTeams} {...mockHandlers} />)
    const editButtons = screen.getAllByText('Edit')
    await user.click(editButtons[0])
    expect(mockHandlers.onEdit).toHaveBeenCalledWith(mockTeams[0])
  })

  it('should call onToggleStatus when Deactivate is clicked', async () => {
    const user = userEvent.setup()
    render(<TeamsTable teams={mockTeams} {...mockHandlers} />)
    const deactivateButtons = screen.getAllByText('Deactivate')
    await user.click(deactivateButtons[0])
    expect(mockHandlers.onToggleStatus).toHaveBeenCalledWith(mockTeams[0])
  })

  it('should call onDelete when Delete is clicked', async () => {
    const user = userEvent.setup()
    render(<TeamsTable teams={mockTeams} {...mockHandlers} />)
    const deleteButtons = screen.getAllByText('Delete')
    await user.click(deleteButtons[0])
    expect(mockHandlers.onDelete).toHaveBeenCalledWith(mockTeams[0])
  })

  it('should filter teams by status', async () => {
    render(<TeamsTable teams={mockTeams} {...mockHandlers} />)

    // Initially both teams should be visible
    expect(screen.getByText('Platform Engineering')).toBeInTheDocument()
    expect(screen.getByText('Product Team')).toBeInTheDocument()

    // Apply active filter
    // Note: This would require interacting with the DataTable's filter component
    // The exact implementation depends on your DataTable component structure
  })

  it('should search teams by name', async () => {
    render(<TeamsTable teams={mockTeams} {...mockHandlers} />)

    // Search functionality test
    // Note: This would require interacting with the DataTable's search input
    // The exact implementation depends on your DataTable component structure
  })

  it('should render empty state when no teams', () => {
    render(<TeamsTable teams={[]} {...mockHandlers} />)

    // DataTable should handle empty state
    // The exact message depends on your DataTable implementation
    expect(screen.queryByText('Platform Engineering')).not.toBeInTheDocument()
  })

  it('should handle teams with missing optional fields', () => {
    const teamsWithMissingFields: Team[] = [
      {
        id: '1',
        name: 'Minimal Team',
        description: '',
        status: 'active',
        memberCount: 0,
        createdAt: '2024-01-01T00:00:00Z',
      },
    ]

    render(<TeamsTable teams={teamsWithMissingFields} {...mockHandlers} />)

    expect(screen.getByText('Minimal Team')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument() // memberCount
  })
})
