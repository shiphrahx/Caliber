import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskCard } from '../task-card'
import type { Task } from '@/lib/types/task'

describe('TaskCard', () => {
  const mockTask: Task = {
    id: '1',
    title: 'Complete project proposal',
    description: 'Draft and submit Q1 proposal',
    dueDate: '2024-03-15',
    priority: 'High',
    category: 'Task',
    status: 'Not started',
    list: 'week',
  }

  const mockHandlers = {
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  }

  it('should render task title', () => {
    render(<TaskCard task={mockTask} onEdit={mockHandlers.onEdit} />)

    expect(screen.getByText('Complete project proposal')).toBeInTheDocument()
  })

  it('should display priority badge with correct styling', () => {
    render(<TaskCard task={mockTask} onEdit={mockHandlers.onEdit} />)
    const priorityBadge = screen.getByText('High')
    expect(priorityBadge).toBeInTheDocument()
  })

  it('should display status badge with correct styling', () => {
    render(<TaskCard task={mockTask} onEdit={mockHandlers.onEdit} />)
    const statusBadge = screen.getByText('Not started')
    expect(statusBadge).toBeInTheDocument()
  })

  it('should display due date in formatted style', () => {
    render(<TaskCard task={mockTask} onEdit={mockHandlers.onEdit} />)

    // Should display formatted date (e.g., "Mar 15")
    expect(screen.getByText(/Mar/)).toBeInTheDocument()
  })

  it('should display "Today" for today\'s date', () => {
    const today = new Date().toISOString().split('T')[0]
    const todayTask = { ...mockTask, dueDate: today }

    render(<TaskCard task={todayTask} onEdit={mockHandlers.onEdit} />)

    expect(screen.getByText('Today')).toBeInTheDocument()
  })

  it('should display "Tomorrow" for tomorrow\'s date', () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowDate = tomorrow.toISOString().split('T')[0]
    const tomorrowTask = { ...mockTask, dueDate: tomorrowDate }

    render(<TaskCard task={tomorrowTask} onEdit={mockHandlers.onEdit} />)

    expect(screen.getByText('Tomorrow')).toBeInTheDocument()
  })

  it('should not display due date if null', () => {
    const taskWithoutDate = { ...mockTask, dueDate: null }

    render(<TaskCard task={taskWithoutDate} onEdit={mockHandlers.onEdit} />)

    // Should not render any date text
    expect(screen.queryByText(/Today|Tomorrow|Jan|Feb|Mar/)).not.toBeInTheDocument()
  })

  it('should show CircleCheck icon for completed tasks', () => {
    const completedTask = { ...mockTask, status: 'Done' as const }

    render(<TaskCard task={completedTask} onEdit={mockHandlers.onEdit} />)

    const statusBadge = screen.getByText('Done')
    expect(statusBadge).toBeInTheDocument()
  })

  it('should show Circle icon for non-completed tasks', () => {
    render(<TaskCard task={mockTask} onEdit={mockHandlers.onEdit} />)

    const statusBadge = screen.getByText('Not started')
    expect(statusBadge).toBeInTheDocument()
  })

  it('should display all priority levels with correct colors', () => {
    const priorities: Array<Task['priority']> = ['Very High', 'High', 'Medium', 'Low']

    priorities.forEach((priority) => {
      const { unmount } = render(
        <TaskCard task={{ ...mockTask, priority }} onEdit={mockHandlers.onEdit} />
      )
      expect(screen.getByText(priority)).toBeInTheDocument()
      unmount()
    })
  })

  it('should display all status types with correct colors', () => {
    const statuses: Array<Task['status']> = ['Not started', 'In progress', 'Blocked', 'Done']

    statuses.forEach((status) => {
      const { unmount } = render(
        <TaskCard task={{ ...mockTask, status }} onEdit={mockHandlers.onEdit} />
      )
      expect(screen.getByText(status)).toBeInTheDocument()
      unmount()
    })
  })

  it('should show action menu on hover and click', async () => {
    const user = userEvent.setup()
    render(<TaskCard task={mockTask} onEdit={mockHandlers.onEdit} onDelete={mockHandlers.onDelete} />)

    // Find and click the menu button
    const menuButton = screen.getByLabelText('Task actions')
    await user.click(menuButton)

    // Menu should appear with Edit and Delete options
    expect(screen.getByText('Edit')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('should call onEdit when Edit is clicked in menu', async () => {
    const user = userEvent.setup()
    render(<TaskCard task={mockTask} onEdit={mockHandlers.onEdit} onDelete={mockHandlers.onDelete} />)

    // Open menu
    const menuButton = screen.getByLabelText('Task actions')
    await user.click(menuButton)

    // Click Edit
    const editButton = screen.getByText('Edit')
    await user.click(editButton)

    expect(mockHandlers.onEdit).toHaveBeenCalledWith(mockTask)
  })

  it('should call onDelete when Delete is clicked in menu', async () => {
    const user = userEvent.setup()
    render(<TaskCard task={mockTask} onEdit={mockHandlers.onEdit} onDelete={mockHandlers.onDelete} />)

    // Open menu
    const menuButton = screen.getByLabelText('Task actions')
    await user.click(menuButton)

    // Click Delete
    const deleteButton = screen.getByText('Delete')
    await user.click(deleteButton)

    expect(mockHandlers.onDelete).toHaveBeenCalledWith(mockTask.id)
  })

  it('should not show Delete option when onDelete is not provided', async () => {
    const user = userEvent.setup()
    render(<TaskCard task={mockTask} onEdit={mockHandlers.onEdit} />)

    // Open menu
    const menuButton = screen.getByLabelText('Task actions')
    await user.click(menuButton)

    // Delete should not be present
    expect(screen.queryByText('Delete')).not.toBeInTheDocument()
    // But Edit should still be there
    expect(screen.getByText('Edit')).toBeInTheDocument()
  })

  it('should apply dragging styles when isDragging is true', () => {
    const { container } = render(
      <TaskCard task={mockTask} onEdit={mockHandlers.onEdit} isDragging={true} />
    )
    const card = container.firstChild as HTMLElement
    expect(card).toBeInTheDocument()
    // Dragging state applied via inline style (background: var(--surf-3))
    expect(card.style.background).toBeTruthy()
  })

  it('should truncate long titles with line-clamp', () => {
    const longTitleTask = {
      ...mockTask,
      title: 'This is a very long task title that should be truncated and clamped to two lines maximum to maintain consistent card height',
    }

    render(<TaskCard task={longTitleTask} onEdit={mockHandlers.onEdit} />)

    const title = screen.getByText(longTitleTask.title)
    expect(title).toHaveClass('line-clamp-2')
  })

  it('should handle tasks with very long titles without breaking layout', () => {
    const extremeLongTitleTask = {
      ...mockTask,
      title: 'ImplementtheauthenticationflowwithGoogleOAuthintegrationandsupabasebackendwithoutanyspacesinthetext',
    }

    render(<TaskCard task={extremeLongTitleTask} onEdit={mockHandlers.onEdit} />)

    const title = screen.getByText(extremeLongTitleTask.title)
    expect(title).toHaveClass('break-words')
  })

  it('should close menu on Escape key', async () => {
    const user = userEvent.setup()
    render(<TaskCard task={mockTask} onEdit={mockHandlers.onEdit} onDelete={mockHandlers.onDelete} />)

    // Open menu
    const menuButton = screen.getByLabelText('Task actions')
    await user.click(menuButton)

    expect(screen.getByText('Edit')).toBeInTheDocument()

    // Press Escape
    await user.keyboard('{Escape}')

    // Menu should be closed (Edit button should not be in document)
    expect(screen.queryByText('Edit')).not.toBeInTheDocument()
  })

})
