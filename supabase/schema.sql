-- Cadence V1 Database Schema
-- Execute this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USER PROFILE TABLE
-- ============================================================================
-- Extends Supabase auth.users with application-specific profile data
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- TEAMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  notes TEXT,
  documentation_url TEXT,
  owning_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- PEOPLE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.people (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  role TEXT,
  level TEXT,
  start_date DATE,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  owning_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- TEAM MEMBERSHIP TABLE (Many-to-Many)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.team_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
  join_date DATE DEFAULT CURRENT_DATE NOT NULL,
  leave_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  -- Prevent duplicate active memberships
  UNIQUE(team_id, person_id, leave_date)
);

-- ============================================================================
-- TASKS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'blocked', 'completed')),
  due_date DATE,
  completion_date DATE,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'meeting_action', 'recurring_meeting', 'growth', 'performance')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'very_high')),
  list TEXT NOT NULL DEFAULT 'backlog' CHECK (list IN ('week', 'backlog')),
  owning_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- TASK RELATIONS TABLE (Polymorphic Links)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.task_relations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('person', 'team')),
  entity_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  -- Prevent duplicate relations
  UNIQUE(task_id, entity_type, entity_id)
);

-- ============================================================================
-- INDEXES for Performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_teams_owning_user ON public.teams(owning_user_id);
CREATE INDEX IF NOT EXISTS idx_teams_status ON public.teams(status);
CREATE INDEX IF NOT EXISTS idx_people_owning_user ON public.people(owning_user_id);
CREATE INDEX IF NOT EXISTS idx_people_status ON public.people(status);
CREATE INDEX IF NOT EXISTS idx_team_memberships_team ON public.team_memberships(team_id);
CREATE INDEX IF NOT EXISTS idx_team_memberships_person ON public.team_memberships(person_id);
CREATE INDEX IF NOT EXISTS idx_tasks_owning_user ON public.tasks(owning_user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_task_relations_task ON public.task_relations(task_id);
CREATE INDEX IF NOT EXISTS idx_task_relations_entity ON public.task_relations(entity_type, entity_id);

-- ============================================================================
-- TRIGGERS for updated_at timestamps
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_people_updated_at BEFORE UPDATE ON public.people
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_relations ENABLE ROW LEVEL SECURITY;

-- User Profiles: Users can only read/write their own profile
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Teams: Users can only access their own teams
CREATE POLICY "Users can view own teams" ON public.teams
  FOR SELECT USING (auth.uid() = owning_user_id);

CREATE POLICY "Users can insert own teams" ON public.teams
  FOR INSERT WITH CHECK (auth.uid() = owning_user_id);

CREATE POLICY "Users can update own teams" ON public.teams
  FOR UPDATE USING (auth.uid() = owning_user_id);

CREATE POLICY "Users can delete own teams" ON public.teams
  FOR DELETE USING (auth.uid() = owning_user_id);

-- People: Users can only access their own people
CREATE POLICY "Users can view own people" ON public.people
  FOR SELECT USING (auth.uid() = owning_user_id);

CREATE POLICY "Users can insert own people" ON public.people
  FOR INSERT WITH CHECK (auth.uid() = owning_user_id);

CREATE POLICY "Users can update own people" ON public.people
  FOR UPDATE USING (auth.uid() = owning_user_id);

CREATE POLICY "Users can delete own people" ON public.people
  FOR DELETE USING (auth.uid() = owning_user_id);

-- Team Memberships: Users can access memberships for their teams/people
CREATE POLICY "Users can view own team memberships" ON public.team_memberships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.owning_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own team memberships" ON public.team_memberships
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.owning_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own team memberships" ON public.team_memberships
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.owning_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own team memberships" ON public.team_memberships
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.owning_user_id = auth.uid()
    )
  );

-- Tasks: Users can only access their own tasks
CREATE POLICY "Users can view own tasks" ON public.tasks
  FOR SELECT USING (auth.uid() = owning_user_id);

CREATE POLICY "Users can insert own tasks" ON public.tasks
  FOR INSERT WITH CHECK (auth.uid() = owning_user_id);

CREATE POLICY "Users can update own tasks" ON public.tasks
  FOR UPDATE USING (auth.uid() = owning_user_id);

CREATE POLICY "Users can delete own tasks" ON public.tasks
  FOR DELETE USING (auth.uid() = owning_user_id);

-- Task Relations: Users can access relations for their tasks
CREATE POLICY "Users can view own task relations" ON public.task_relations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.owning_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own task relations" ON public.task_relations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.owning_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own task relations" ON public.task_relations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.owning_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own task relations" ON public.task_relations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.owning_user_id = auth.uid()
    )
  );

-- ============================================================================
-- FUNCTION: Cascade delete tasks when entity is deleted
-- ============================================================================
CREATE OR REPLACE FUNCTION delete_orphaned_tasks()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete tasks that only have relations to this entity
  DELETE FROM public.tasks
  WHERE id IN (
    SELECT task_id
    FROM public.task_relations
    WHERE entity_type = TG_ARGV[0]
    AND entity_id = OLD.id
    GROUP BY task_id
    HAVING COUNT(*) = 1
  );

  -- Remove relations for tasks linked to multiple entities
  DELETE FROM public.task_relations
  WHERE entity_type = TG_ARGV[0]
  AND entity_id = OLD.id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Triggers for cascading task deletion
CREATE TRIGGER cascade_delete_person_tasks
  BEFORE DELETE ON public.people
  FOR EACH ROW
  EXECUTE FUNCTION delete_orphaned_tasks('person');

CREATE TRIGGER cascade_delete_team_tasks
  BEFORE DELETE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION delete_orphaned_tasks('team');

-- ============================================================================
-- CAREER GOALS PROFILE TABLE
-- ============================================================================
-- Stores the high-level career journey (where you are, where you want to go)
CREATE TABLE IF NOT EXISTS public.career_goals_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  where_you_are TEXT,
  where_you_want_to_go TEXT,
  owning_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  -- One profile per user
  UNIQUE(owning_user_id)
);

-- ============================================================================
-- GAP ANALYSIS TABLE
-- ============================================================================
-- Categories that identify gaps between current and desired state
CREATE TABLE IF NOT EXISTS public.gap_analysis_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL,
  current_state TEXT,
  desired_state TEXT,
  display_order INTEGER DEFAULT 0,
  owning_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- FOCUS DISTRIBUTIONS TABLE
-- ============================================================================
-- Desired focus percentages per category for each time period
CREATE TABLE IF NOT EXISTS public.focus_distributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  time_period TEXT NOT NULL CHECK (time_period IN ('short_term', 'mid_term', 'long_term')),
  category_id UUID NOT NULL REFERENCES public.gap_analysis_categories(id) ON DELETE CASCADE,
  focus_percent INTEGER DEFAULT 0 CHECK (focus_percent >= 0 AND focus_percent <= 100),
  why TEXT,
  owning_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  -- One distribution per category per time period
  UNIQUE(category_id, time_period)
);

-- ============================================================================
-- CAREER GOALS TABLE
-- ============================================================================
-- Individual goals organized by time period
CREATE TABLE IF NOT EXISTS public.career_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  time_period TEXT NOT NULL CHECK (time_period IN ('short_term', 'mid_term', 'long_term')),
  goal TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Core', 'Stretch')),
  category_id UUID NOT NULL REFERENCES public.gap_analysis_categories(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'Not started' CHECK (status IN ('Not started', 'In progress', 'Completed')),
  display_order INTEGER DEFAULT 0,
  owning_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- ACHIEVEMENTS TABLE
-- ============================================================================
-- Track extra learning and accomplishments
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('Book', 'Course', 'Certification', 'Conference', 'Talk', 'Other')),
  description TEXT NOT NULL,
  achievement_date DATE NOT NULL,
  key_takeaway TEXT,
  owning_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================================
-- INDEXES for Career Goals Performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_career_goals_profiles_user ON public.career_goals_profiles(owning_user_id);
CREATE INDEX IF NOT EXISTS idx_gap_analysis_user ON public.gap_analysis_categories(owning_user_id);
CREATE INDEX IF NOT EXISTS idx_focus_distributions_user ON public.focus_distributions(owning_user_id);
CREATE INDEX IF NOT EXISTS idx_focus_distributions_category ON public.focus_distributions(category_id);
CREATE INDEX IF NOT EXISTS idx_career_goals_user ON public.career_goals(owning_user_id);
CREATE INDEX IF NOT EXISTS idx_career_goals_category ON public.career_goals(category_id);
CREATE INDEX IF NOT EXISTS idx_achievements_user ON public.achievements(owning_user_id);

-- ============================================================================
-- TRIGGERS for Career Goals updated_at timestamps
-- ============================================================================
CREATE TRIGGER update_career_goals_profiles_updated_at BEFORE UPDATE ON public.career_goals_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gap_analysis_categories_updated_at BEFORE UPDATE ON public.gap_analysis_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_focus_distributions_updated_at BEFORE UPDATE ON public.focus_distributions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_career_goals_updated_at BEFORE UPDATE ON public.career_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_achievements_updated_at BEFORE UPDATE ON public.achievements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES for Career Goals
-- ============================================================================

-- Enable RLS on all career goals tables
ALTER TABLE public.career_goals_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gap_analysis_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

-- Career Goals Profiles: Users can only access their own profile
CREATE POLICY "Users can view own career profile" ON public.career_goals_profiles
  FOR SELECT USING (auth.uid() = owning_user_id);

CREATE POLICY "Users can insert own career profile" ON public.career_goals_profiles
  FOR INSERT WITH CHECK (auth.uid() = owning_user_id);

CREATE POLICY "Users can update own career profile" ON public.career_goals_profiles
  FOR UPDATE USING (auth.uid() = owning_user_id);

CREATE POLICY "Users can delete own career profile" ON public.career_goals_profiles
  FOR DELETE USING (auth.uid() = owning_user_id);

-- Gap Analysis Categories: Users can only access their own categories
CREATE POLICY "Users can view own gap categories" ON public.gap_analysis_categories
  FOR SELECT USING (auth.uid() = owning_user_id);

CREATE POLICY "Users can insert own gap categories" ON public.gap_analysis_categories
  FOR INSERT WITH CHECK (auth.uid() = owning_user_id);

CREATE POLICY "Users can update own gap categories" ON public.gap_analysis_categories
  FOR UPDATE USING (auth.uid() = owning_user_id);

CREATE POLICY "Users can delete own gap categories" ON public.gap_analysis_categories
  FOR DELETE USING (auth.uid() = owning_user_id);

-- Focus Distributions: Users can only access their own distributions
CREATE POLICY "Users can view own focus distributions" ON public.focus_distributions
  FOR SELECT USING (auth.uid() = owning_user_id);

CREATE POLICY "Users can insert own focus distributions" ON public.focus_distributions
  FOR INSERT WITH CHECK (auth.uid() = owning_user_id);

CREATE POLICY "Users can update own focus distributions" ON public.focus_distributions
  FOR UPDATE USING (auth.uid() = owning_user_id);

CREATE POLICY "Users can delete own focus distributions" ON public.focus_distributions
  FOR DELETE USING (auth.uid() = owning_user_id);

-- Career Goals: Users can only access their own goals
CREATE POLICY "Users can view own career goals" ON public.career_goals
  FOR SELECT USING (auth.uid() = owning_user_id);

CREATE POLICY "Users can insert own career goals" ON public.career_goals
  FOR INSERT WITH CHECK (auth.uid() = owning_user_id);

CREATE POLICY "Users can update own career goals" ON public.career_goals
  FOR UPDATE USING (auth.uid() = owning_user_id);

CREATE POLICY "Users can delete own career goals" ON public.career_goals
  FOR DELETE USING (auth.uid() = owning_user_id);

-- Achievements: Users can only access their own achievements
CREATE POLICY "Users can view own achievements" ON public.achievements
  FOR SELECT USING (auth.uid() = owning_user_id);

CREATE POLICY "Users can insert own achievements" ON public.achievements
  FOR INSERT WITH CHECK (auth.uid() = owning_user_id);

CREATE POLICY "Users can update own achievements" ON public.achievements
  FOR UPDATE USING (auth.uid() = owning_user_id);

CREATE POLICY "Users can delete own achievements" ON public.achievements
  FOR DELETE USING (auth.uid() = owning_user_id);

-- ============================================================================
-- MEETINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  meeting_type TEXT NOT NULL CHECK (meeting_type IN ('1:1', 'Team Sync', 'Retro', 'Planning', 'Review', 'Standup', 'Other')),
  meeting_date DATE NOT NULL,
  next_meeting_date DATE,
  recurrence TEXT CHECK (recurrence IN ('none', 'weekly', 'fortnightly', 'monthly', 'custom')),
  action_items TEXT,
  notes TEXT,
  person_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  owning_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT valid_next_meeting_date CHECK (next_meeting_date IS NULL OR next_meeting_date > meeting_date),
  CONSTRAINT valid_association CHECK (
    (meeting_type = '1:1' AND person_id IS NOT NULL AND team_id IS NULL) OR
    (meeting_type IN ('Team Sync', 'Retro', 'Planning', 'Review', 'Standup') AND team_id IS NOT NULL AND person_id IS NULL) OR
    (meeting_type = 'Other')
  )
);

-- Create index for faster queries
CREATE INDEX idx_meetings_owning_user_id ON public.meetings(owning_user_id);
CREATE INDEX idx_meetings_meeting_date ON public.meetings(meeting_date DESC);
CREATE INDEX idx_meetings_person_id ON public.meetings(person_id);
CREATE INDEX idx_meetings_team_id ON public.meetings(team_id);
CREATE INDEX idx_meetings_type ON public.meetings(meeting_type);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_meetings_updated_at
  BEFORE UPDATE ON public.meetings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security Policies
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own meetings" ON public.meetings
  FOR SELECT USING (auth.uid() = owning_user_id);

CREATE POLICY "Users can insert own meetings" ON public.meetings
  FOR INSERT WITH CHECK (auth.uid() = owning_user_id);

CREATE POLICY "Users can update own meetings" ON public.meetings
  FOR UPDATE USING (auth.uid() = owning_user_id);

CREATE POLICY "Users can delete own meetings" ON public.meetings
  FOR DELETE USING (auth.uid() = owning_user_id);

-- ============================================================================
-- MEETING TEMPLATES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.meeting_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  owning_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_meeting_templates_owning_user ON public.meeting_templates(owning_user_id);

CREATE TRIGGER update_meeting_templates_updated_at BEFORE UPDATE ON public.meeting_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.meeting_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own meeting templates" ON public.meeting_templates
  FOR SELECT USING (auth.uid() = owning_user_id);

CREATE POLICY "Users can insert own meeting templates" ON public.meeting_templates
  FOR INSERT WITH CHECK (auth.uid() = owning_user_id);

CREATE POLICY "Users can update own meeting templates" ON public.meeting_templates
  FOR UPDATE USING (auth.uid() = owning_user_id);

CREATE POLICY "Users can delete own meeting templates" ON public.meeting_templates
  FOR DELETE USING (auth.uid() = owning_user_id);

-- ============================================================================
-- SEED DATA (Optional - for development)
-- ============================================================================
-- Uncomment to add sample data after first user logs in
-- Replace 'your-user-id' with actual auth.uid()

/*
-- Sample Team
INSERT INTO public.teams (name, description, status, owning_user_id)
VALUES ('Platform Engineering', 'Core infrastructure team', 'active', 'your-user-id');

-- Sample Person
INSERT INTO public.people (full_name, role, level, start_date, status, owning_user_id)
VALUES ('Sarah Miller', 'Senior Engineer', 'Senior', '2024-01-15', 'active', 'your-user-id');

-- Sample Task
INSERT INTO public.tasks (title, description, status, priority, due_date, owning_user_id)
VALUES ('Review Q1 Performance', 'Complete quarterly reviews', 'open', 'high', '2025-01-15', 'your-user-id');
*/
