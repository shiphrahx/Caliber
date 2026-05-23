/**
 * Unit tests for meetings service
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getMeetings,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  getMeetingsForPerson,
  getMeetingsForTeam,
  generateAndSaveMeetingTldr,
  type Meeting,
} from '../meetings'
import { createClient } from '@/lib/supabase/client'

vi.mock('@/lib/services/ai', () => ({
  callAI: vi.fn(),
}))
vi.mock('@/lib/ai/prompts', () => ({
  MEETING_TLDR_SYSTEM: 'tldr-system-prompt',
  buildMeetingTldrPrompt: vi.fn().mockReturnValue('tldr-user-prompt'),
}))

vi.mock('@/lib/supabase/client')

const mockSupabase = {
  from: vi.fn(),
  auth: {
    getUser: vi.fn(),
  },
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(createClient as any).mockReturnValue(mockSupabase)
})

describe('Meetings Service', () => {
  describe('getMeetings', () => {
    it('should fetch all meetings with person and team data', async () => {
      const mockMeetings = [
        {
          id: '1',
          title: '1:1 with Sarah Miller',
          meeting_type: '1:1',
          meeting_date: '2024-12-20',
          next_meeting_date: '2024-12-27',
          recurrence: 'weekly',
          action_items: '- Follow up on Q1 roadmap',
          notes: 'Discussed career progression',
          tldr: null,
          person_id: 'person-1',
          team_id: null,
          person: { full_name: 'Sarah Miller' },
          team: null,
          created_at: '2024-12-01T00:00:00Z',
          updated_at: '2024-12-01T00:00:00Z',
        },
        {
          id: '2',
          title: 'Team Sync - Platform Engineering',
          meeting_type: 'Team Sync',
          meeting_date: '2024-12-18',
          next_meeting_date: null,
          recurrence: null,
          action_items: '- Deploy new infrastructure',
          notes: 'Discussed Q1 roadmap',
          tldr: null,
          person_id: null,
          team_id: 'team-1',
          person: null,
          team: { name: 'Platform Engineering' },
          created_at: '2024-12-01T00:00:00Z',
          updated_at: '2024-12-01T00:00:00Z',
        },
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockMeetings,
            error: null,
          }),
        }),
      })

      const meetings = await getMeetings()

      expect(mockSupabase.from).toHaveBeenCalledWith('meetings')
      expect(meetings).toHaveLength(2)
      expect(meetings[0]).toEqual({
        id: '1',
        title: '1:1 with Sarah Miller',
        meetingType: '1:1',
        meetingDate: '2024-12-20',
        nextMeetingDate: '2024-12-27',
        recurrence: 'weekly',
        actionItems: '- Follow up on Q1 roadmap',
        notes: 'Discussed career progression',
        tldr: null,
        personId: 'person-1',
        personName: 'Sarah Miller',
        teamId: null,
        teamName: null,
        attendees: ['Sarah Miller'],
        createdAt: '2024-12-01T00:00:00Z',
        updatedAt: '2024-12-01T00:00:00Z',
      })
      expect(meetings[1]).toEqual({
        id: '2',
        title: 'Team Sync - Platform Engineering',
        meetingType: 'Team Sync',
        meetingDate: '2024-12-18',
        nextMeetingDate: null,
        recurrence: null,
        actionItems: '- Deploy new infrastructure',
        notes: 'Discussed Q1 roadmap',
        tldr: null,
        personId: null,
        personName: null,
        teamId: 'team-1',
        teamName: 'Platform Engineering',
        attendees: ['Platform Engineering'],
        createdAt: '2024-12-01T00:00:00Z',
        updatedAt: '2024-12-01T00:00:00Z',
      })
    })

    it('should throw error if database query fails', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        }),
      })

      await expect(getMeetings()).rejects.toEqual({ message: 'Database error' })
    })
  })

  describe('createMeeting', () => {
    it('should create a 1:1 meeting with person', async () => {
      const mockUser = { id: 'user-123' }
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const mockMeeting = {
        id: '1',
        title: '1:1 with Sarah Miller',
        meeting_type: '1:1',
        meeting_date: '2024-12-20',
        next_meeting_date: '2024-12-27',
        recurrence: 'weekly',
        action_items: null,
        notes: null,
        tldr: null,
        person_id: 'person-1',
        team_id: null,
        person: { full_name: 'Sarah Miller' },
        team: null,
        owning_user_id: 'user-123',
        created_at: '2024-12-01T00:00:00Z',
        updated_at: '2024-12-01T00:00:00Z',
      }

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockMeeting,
              error: null,
            }),
          }),
        }),
      })

      const newMeeting = {
        title: '1:1 with Sarah Miller',
        meetingType: '1:1' as const,
        meetingDate: '2024-12-20',
        nextMeetingDate: '2024-12-27',
        recurrence: 'weekly' as const,
        personId: 'person-1',
      }

      const meeting = await createMeeting(newMeeting)

      expect(mockSupabase.from).toHaveBeenCalledWith('meetings')
      expect(meeting.title).toBe('1:1 with Sarah Miller')
      expect(meeting.meetingType).toBe('1:1')
      expect(meeting.personName).toBe('Sarah Miller')
      expect(meeting.attendees).toEqual(['Sarah Miller'])
    })

    it('should create a team sync meeting', async () => {
      const mockUser = { id: 'user-123' }
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const mockMeeting = {
        id: '2',
        title: 'Team Sync - Platform Engineering',
        meeting_type: 'Team Sync',
        meeting_date: '2024-12-18',
        next_meeting_date: null,
        recurrence: null,
        action_items: '- Deploy new infrastructure',
        notes: 'Discussed Q1 roadmap',
        tldr: null,
        person_id: null,
        team_id: 'team-1',
        person: null,
        team: { name: 'Platform Engineering' },
        owning_user_id: 'user-123',
        created_at: '2024-12-01T00:00:00Z',
        updated_at: '2024-12-01T00:00:00Z',
      }

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockMeeting,
              error: null,
            }),
          }),
        }),
      })

      const newMeeting = {
        title: 'Team Sync - Platform Engineering',
        meetingType: 'Team Sync' as const,
        meetingDate: '2024-12-18',
        actionItems: '- Deploy new infrastructure',
        notes: 'Discussed Q1 roadmap',
        teamId: 'team-1',
      }

      const meeting = await createMeeting(newMeeting)

      expect(meeting.meetingType).toBe('Team Sync')
      expect(meeting.teamName).toBe('Platform Engineering')
      expect(meeting.attendees).toEqual(['Platform Engineering'])
    })

    it('should throw error if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const newMeeting = {
        title: '1:1 with Sarah Miller',
        meetingType: '1:1' as const,
        meetingDate: '2024-12-20',
        personId: 'person-1',
      }

      await expect(createMeeting(newMeeting)).rejects.toThrow('Not authenticated')
    })

    it('should throw error if database insert fails', async () => {
      const mockUser = { id: 'user-123' }
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      })

      const newMeeting = {
        title: '1:1 with Sarah Miller',
        meetingType: '1:1' as const,
        meetingDate: '2024-12-20',
        personId: 'person-1',
      }

      await expect(createMeeting(newMeeting)).rejects.toEqual({ message: 'Database error' })
    })
  })

  describe('updateMeeting', () => {
    it('should update meeting fields', async () => {
      const mockMeeting = {
        id: '1',
        title: 'Updated Title',
        meeting_type: '1:1',
        meeting_date: '2024-12-21',
        next_meeting_date: '2024-12-28',
        recurrence: 'weekly',
        action_items: '- Updated action',
        notes: 'Updated notes',
        tldr: null,
        person_id: 'person-1',
        team_id: null,
        person: { full_name: 'Sarah Miller' },
        team: null,
        created_at: '2024-12-01T00:00:00Z',
        updated_at: '2024-12-02T00:00:00Z',
      }

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockMeeting,
                error: null,
              }),
            }),
          }),
        }),
      })

      const updates = {
        title: 'Updated Title',
        meetingDate: '2024-12-21',
        actionItems: '- Updated action',
        notes: 'Updated notes',
      }

      const meeting = await updateMeeting('1', updates)

      expect(mockSupabase.from).toHaveBeenCalledWith('meetings')
      expect(meeting.title).toBe('Updated Title')
      expect(meeting.meetingDate).toBe('2024-12-21')
      expect(meeting.actionItems).toBe('- Updated action')
      expect(meeting.notes).toBe('Updated notes')
    })

    it('should handle partial updates', async () => {
      const mockMeeting = {
        id: '1',
        title: '1:1 with Sarah Miller',
        meeting_type: '1:1',
        meeting_date: '2024-12-20',
        next_meeting_date: '2024-12-27',
        recurrence: 'weekly',
        action_items: '- Updated action only',
        notes: 'Original notes',
        tldr: null,
        person_id: 'person-1',
        team_id: null,
        person: { full_name: 'Sarah Miller' },
        team: null,
        created_at: '2024-12-01T00:00:00Z',
        updated_at: '2024-12-02T00:00:00Z',
      }

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockMeeting,
                error: null,
              }),
            }),
          }),
        }),
      })

      const updates = { actionItems: '- Updated action only' }
      const meeting = await updateMeeting('1', updates)

      expect(meeting.actionItems).toBe('- Updated action only')
      expect(meeting.notes).toBe('Original notes')
    })

    it('should throw error if update fails', async () => {
      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Update failed' },
              }),
            }),
          }),
        }),
      })

      await expect(updateMeeting('1', { title: 'New Title' })).rejects.toEqual({
        message: 'Update failed',
      })
    })
  })

  describe('deleteMeeting', () => {
    it('should delete a meeting', async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: null,
          }),
        }),
      })

      await deleteMeeting('1')

      expect(mockSupabase.from).toHaveBeenCalledWith('meetings')
    })

    it('should throw error if delete fails', async () => {
      mockSupabase.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: { message: 'Delete failed' },
          }),
        }),
      })

      await expect(deleteMeeting('1')).rejects.toEqual({ message: 'Delete failed' })
    })
  })

  describe('getMeetingsForPerson', () => {
    it('should fetch meetings for a specific person', async () => {
      const mockMeetings = [
        {
          id: '1',
          title: '1:1 with Sarah Miller',
          meeting_type: '1:1',
          meeting_date: '2024-12-20',
          next_meeting_date: '2024-12-27',
          recurrence: 'weekly',
          action_items: null,
          notes: null,
          tldr: null,
          person_id: 'person-1',
          team_id: null,
          person: { full_name: 'Sarah Miller' },
          team: null,
          created_at: '2024-12-01T00:00:00Z',
          updated_at: '2024-12-01T00:00:00Z',
        },
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockMeetings,
              error: null,
            }),
          }),
        }),
      })

      const meetings = await getMeetingsForPerson('person-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('meetings')
      expect(meetings).toHaveLength(1)
      expect(meetings[0].personName).toBe('Sarah Miller')
      expect(meetings[0].attendees).toEqual(['Sarah Miller'])
    })
  })

  describe('getMeetingsForTeam', () => {
    it('should fetch meetings for a specific team', async () => {
      const mockMeetings = [
        {
          id: '2',
          title: 'Team Sync - Platform Engineering',
          meeting_type: 'Team Sync',
          meeting_date: '2024-12-18',
          next_meeting_date: null,
          recurrence: null,
          action_items: null,
          notes: null,
          tldr: null,
          person_id: null,
          team_id: 'team-1',
          person: null,
          team: { name: 'Platform Engineering' },
          created_at: '2024-12-01T00:00:00Z',
          updated_at: '2024-12-01T00:00:00Z',
        },
      ]

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockMeetings,
              error: null,
            }),
          }),
        }),
      })

      const meetings = await getMeetingsForTeam('team-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('meetings')
      expect(meetings).toHaveLength(1)
      expect(meetings[0].teamName).toBe('Platform Engineering')
      expect(meetings[0].attendees).toEqual(['Platform Engineering'])
    })
  })

  describe('generateAndSaveMeetingTldr', () => {
    const baseMeeting: Meeting = {
      id: 'meeting-1',
      title: '1:1 with Alice',
      meetingType: '1:1',
      meetingDate: '2024-12-20',
      notes: null,
      actionItems: null,
      tldr: null,
      attendees: ['Alice'],
      createdAt: '2024-12-01T00:00:00Z',
      updatedAt: '2024-12-01T00:00:00Z',
    }

    it('should skip generation when notes are null', async () => {
      const { callAI } = await import('@/lib/services/ai')
      await generateAndSaveMeetingTldr({ ...baseMeeting, notes: null })
      expect(callAI).not.toHaveBeenCalled()
    })

    it('should skip generation when notes <= 100 chars', async () => {
      const { callAI } = await import('@/lib/services/ai')
      await generateAndSaveMeetingTldr({ ...baseMeeting, notes: 'Short notes.' })
      expect(callAI).not.toHaveBeenCalled()
    })

    it('should call AI and save tldr when notes > 100 chars', async () => {
      const { callAI } = await import('@/lib/services/ai')
      const longNotes = 'a'.repeat(101)
      ;(callAI as ReturnType<typeof vi.fn>).mockResolvedValue({ content: 'Generated summary.', tokensUsed: { input: 50, output: 10 }, model: 'claude' })

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })
      mockSupabase.from.mockReturnValue({ update: updateMock })

      await generateAndSaveMeetingTldr({ ...baseMeeting, notes: longNotes })

      expect(callAI).toHaveBeenCalledWith(expect.objectContaining({
        systemPrompt: 'tldr-system-prompt',
        preferFast: true,
        maxTokens: 150,
      }))
      expect(updateMock).toHaveBeenCalledWith({ tldr: 'Generated summary.' })
    })

    it('should not throw when AI call fails (fire-and-forget)', async () => {
      const { callAI } = await import('@/lib/services/ai')
      const longNotes = 'a'.repeat(101)
      ;(callAI as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('AI unavailable'))

      await expect(generateAndSaveMeetingTldr({ ...baseMeeting, notes: longNotes })).resolves.toBeUndefined()
    })

    it('should not save empty tldr string', async () => {
      const { callAI } = await import('@/lib/services/ai')
      const longNotes = 'a'.repeat(101)
      ;(callAI as ReturnType<typeof vi.fn>).mockResolvedValue({ content: '   ', tokensUsed: { input: 10, output: 0 }, model: 'claude' })

      const updateMock = vi.fn()
      mockSupabase.from.mockReturnValue({ update: updateMock })

      await generateAndSaveMeetingTldr({ ...baseMeeting, notes: longNotes })
      expect(updateMock).not.toHaveBeenCalled()
    })
  })
})
