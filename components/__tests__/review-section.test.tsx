import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ReviewSection } from '../review/review-section'

describe('ReviewSection', () => {
  const defaultProps = {
    title: 'People Check',
    signalCount: 0,
    isReviewed: false,
    onMarkReviewed: vi.fn(),
    children: null,
  }

  it('renders title', () => {
    render(<ReviewSection {...defaultProps} />)
    expect(screen.getByText('People Check')).toBeTruthy()
  })

  it('shows empty message when signalCount is 0', () => {
    render(<ReviewSection {...defaultProps} emptyMessage="All clear ✓" />)
    expect(screen.getByText('All clear ✓')).toBeTruthy()
  })

  it('shows Reviewed badge when isReviewed is true', () => {
    render(<ReviewSection {...defaultProps} isReviewed={true} />)
    expect(screen.getByText('Reviewed')).toBeTruthy()
  })

  it('does not show Reviewed badge when not reviewed', () => {
    render(<ReviewSection {...defaultProps} isReviewed={false} />)
    expect(screen.queryByText('Reviewed')).toBeNull()
  })

  it('shows critical badge when criticalCount > 0', () => {
    render(<ReviewSection {...defaultProps} signalCount={2} criticalCount={1} warningCount={1} />)
    expect(screen.getByText('1 critical')).toBeTruthy()
    expect(screen.getByText('1 warning')).toBeTruthy()
  })

  it('hides signal badges when isReviewed is true', () => {
    render(<ReviewSection {...defaultProps} signalCount={2} criticalCount={2} isReviewed={true} />)
    expect(screen.queryByText('2 critical')).toBeNull()
  })

  it('calls onMarkReviewed when checkbox clicked', () => {
    const onMarkReviewed = vi.fn()
    render(<ReviewSection {...defaultProps} onMarkReviewed={onMarkReviewed} />)
    const checkbox = screen.getByTitle('Mark as reviewed')
    fireEvent.click(checkbox)
    expect(onMarkReviewed).toHaveBeenCalledWith(true)
  })

  it('collapses body when header is clicked', () => {
    render(<ReviewSection {...defaultProps} emptyMessage="All clear ✓" />)
    expect(screen.getByText('All clear ✓')).toBeTruthy()
    fireEvent.click(screen.getByText('People Check'))
    expect(screen.queryByText('All clear ✓')).toBeNull()
  })

  it('renders children when signalCount > 0', () => {
    render(
      <ReviewSection {...defaultProps} signalCount={1}>
        <div>Signal content</div>
      </ReviewSection>
    )
    expect(screen.getByText('Signal content')).toBeTruthy()
  })
})
