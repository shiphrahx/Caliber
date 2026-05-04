-- =============================================================================
-- CADENCE SEED DATA
-- Run in Supabase SQL Editor.
-- Replace YOUR_USER_ID with your actual auth.users id (find it in Auth > Users).
-- =============================================================================

DO $$
DECLARE
  uid UUID := 'YOUR_USER_ID';  -- <-- REPLACE THIS

  -- Team IDs
  t_platform  UUID;
  t_product   UUID;
  t_data      UUID;
  t_mobile    UUID;

  -- People IDs
  p_alice     UUID;
  p_bob       UUID;
  p_carol     UUID;
  p_dave      UUID;
  p_eve       UUID;
  p_frank     UUID;
  p_grace     UUID;
  p_heidi     UUID;

  -- Task IDs (one per status × priority combo = 4 × 4 = 16, plus extras)
  task_ids    UUID[];

  -- Meeting IDs
  m_11_alice  UUID;
  m_11_bob    UUID;
  m_11_carol  UUID;
  m_sync_plat UUID;
  m_sync_prod UUID;
  m_retro     UUID;
  m_planning  UUID;
  m_review    UUID;
  m_standup   UUID;
  m_other     UUID;

  -- Career IDs
  cgp         UUID;
  gap_tech    UUID;
  gap_lead    UUID;
  gap_comm    UUID;

  -- Framework IDs
  fw          UUID;
  area_eng    UUID;
  area_lead   UUID;

  -- Review cycle
  rc          UUID;

BEGIN

-- =============================================================================
-- 1. CLEANUP — delete all existing data for this user
-- =============================================================================
DELETE FROM public.review_dismissed_items WHERE user_id = uid;
DELETE FROM public.weekly_reviews         WHERE user_id = uid;
DELETE FROM public.follow_ups             WHERE user_id = uid;
DELETE FROM public.competency_assessments WHERE owning_user_id = uid;
DELETE FROM public.growth_plans           WHERE owning_user_id = uid;
DELETE FROM public.competency_levels      WHERE owning_user_id = uid;
DELETE FROM public.competency_areas       WHERE owning_user_id = uid;
DELETE FROM public.competency_frameworks  WHERE owning_user_id = uid;
DELETE FROM public.evidence_entries       WHERE owning_user_id = uid;
DELETE FROM public.review_summaries       WHERE owning_user_id = uid;
DELETE FROM public.review_cycles          WHERE owning_user_id = uid;
DELETE FROM public.task_relations         WHERE task_id IN (SELECT id FROM public.tasks WHERE owning_user_id = uid);
DELETE FROM public.tasks                  WHERE owning_user_id = uid;
DELETE FROM public.meetings               WHERE owning_user_id = uid;
DELETE FROM public.team_memberships       WHERE team_id IN (SELECT id FROM public.teams WHERE owning_user_id = uid);
DELETE FROM public.career_goals           WHERE owning_user_id = uid;
DELETE FROM public.focus_distributions    WHERE owning_user_id = uid;
DELETE FROM public.gap_analysis_categories WHERE owning_user_id = uid;
DELETE FROM public.career_goals_profiles  WHERE owning_user_id = uid;
DELETE FROM public.achievements           WHERE owning_user_id = uid;
DELETE FROM public.people                 WHERE owning_user_id = uid;
DELETE FROM public.teams                  WHERE owning_user_id = uid;
DELETE FROM public.meeting_templates      WHERE owning_user_id = uid;

-- =============================================================================
-- 2. TEAMS
-- =============================================================================
INSERT INTO public.teams (id, name, description, status, notes, owning_user_id)
VALUES
  (gen_random_uuid(), 'Platform Engineering', 'Core infra and developer experience', 'active',
   'Owns CI/CD, internal tooling, and k8s clusters.', uid),
  (gen_random_uuid(), 'Product Engineering', 'Customer-facing product features', 'active',
   'Works closely with design and PM.', uid),
  (gen_random_uuid(), 'Data & Analytics', 'Data pipelines, BI, and ML platform', 'active',
   'Main consumers of the data lake.', uid),
  (gen_random_uuid(), 'Mobile', 'iOS and Android apps', 'inactive',
   'Team paused pending reorg.', uid);

-- Fetch IDs back by name
SELECT id INTO t_platform FROM public.teams WHERE owning_user_id = uid AND name = 'Platform Engineering';
SELECT id INTO t_product  FROM public.teams WHERE owning_user_id = uid AND name = 'Product Engineering';
SELECT id INTO t_data     FROM public.teams WHERE owning_user_id = uid AND name = 'Data & Analytics';
SELECT id INTO t_mobile   FROM public.teams WHERE owning_user_id = uid AND name = 'Mobile';

-- =============================================================================
-- 3. PEOPLE — all seniority levels + active/inactive mix
-- =============================================================================
INSERT INTO public.people (id, full_name, role, level, start_date, status, notes, owning_user_id)
VALUES
  (gen_random_uuid(), 'Alice Chen',    'Software Engineer',        'Junior',  '2024-06-01', 'active',
   'Strong learner. Working on first production feature.', uid),
  (gen_random_uuid(), 'Bob Okafor',    'Software Engineer',        'Mid',     '2023-03-15', 'active',
   'Solid delivery. Ready to take on tech lead work.', uid),
  (gen_random_uuid(), 'Carol Mendes',  'Senior Engineer',          'Senior',  '2022-01-10', 'active',
   'Go-to for architecture decisions on the product side.', uid),
  (gen_random_uuid(), 'Dave Singh',    'Staff Engineer',           'Staff',   '2020-09-01', 'active',
   'Cross-team influence. Driving platform strategy.', uid),
  (gen_random_uuid(), 'Eve Nakamura',  'Engineering Manager',      'Manager', '2021-05-20', 'active',
   'Managing mobile team through reorg.', uid),
  (gen_random_uuid(), 'Frank Liu',     'Data Engineer',            'Mid',     '2023-08-01', 'active',
   'Owns the ingestion pipeline.', uid),
  (gen_random_uuid(), 'Grace Torres',  'Junior Data Analyst',      'Junior',  '2024-11-01', 'active',
   'Recently onboarded. Still ramping up on SQL.', uid),
  (gen_random_uuid(), 'Heidi Bauer',   'Principal Engineer',       'Principal', '2019-04-01', 'inactive',
   'On extended leave. Expected return Q3.', uid)
;

SELECT id INTO p_alice FROM public.people WHERE owning_user_id = uid AND full_name = 'Alice Chen';
SELECT id INTO p_bob   FROM public.people WHERE owning_user_id = uid AND full_name = 'Bob Okafor';
SELECT id INTO p_carol FROM public.people WHERE owning_user_id = uid AND full_name = 'Carol Mendes';
SELECT id INTO p_dave  FROM public.people WHERE owning_user_id = uid AND full_name = 'Dave Singh';
SELECT id INTO p_eve   FROM public.people WHERE owning_user_id = uid AND full_name = 'Eve Nakamura';
SELECT id INTO p_frank FROM public.people WHERE owning_user_id = uid AND full_name = 'Frank Liu';
SELECT id INTO p_grace FROM public.people WHERE owning_user_id = uid AND full_name = 'Grace Torres';
SELECT id INTO p_heidi FROM public.people WHERE owning_user_id = uid AND full_name = 'Heidi Bauer';

-- =============================================================================
-- 4. TEAM MEMBERSHIPS
-- =============================================================================
INSERT INTO public.team_memberships (team_id, person_id, join_date)
VALUES
  (t_platform, p_dave,  '2020-09-01'),
  (t_platform, p_bob,   '2023-03-15'),
  (t_platform, p_alice, '2024-06-01'),
  (t_product,  p_carol, '2022-01-10'),
  (t_product,  p_bob,   '2023-03-15'),
  (t_data,     p_frank, '2023-08-01'),
  (t_data,     p_grace, '2024-11-01'),
  (t_mobile,   p_eve,   '2021-05-20'),
  (t_mobile,   p_heidi, '2019-04-01');

-- =============================================================================
-- 5. TASKS — every status × priority combination across week and backlog
--    status:   not_started | in_progress | blocked | completed
--    priority: low | medium | high | very_high
--    list:     week | backlog
--    source:   manual | meeting_action | recurring_meeting | growth | performance
-- =============================================================================
INSERT INTO public.tasks (title, description, status, priority, list, source, due_date, completion_date, owning_user_id)
VALUES
  -- Week tasks: not_started × all priorities
  ('Write Q2 team update',          'Draft and send quarterly update to stakeholders.',
   'not_started', 'low',       'week', 'manual',           CURRENT_DATE + 5,  NULL,             uid),
  ('Review Alice''s PR',            'Code review for feature/auth-refresh branch.',
   'not_started', 'medium',    'week', 'meeting_action',   CURRENT_DATE + 2,  NULL,             uid),
  ('Prepare sprint planning deck',  'Slides for Wednesday planning session.',
   'not_started', 'high',      'week', 'manual',           CURRENT_DATE + 1,  NULL,             uid),
  ('Resolve prod incident RCA',     'Root cause write-up for last week''s outage.',
   'not_started', 'very_high', 'week', 'manual',           CURRENT_DATE,      NULL,             uid),

  -- Week tasks: in_progress × all priorities
  ('Update team handbook',          'Revise onboarding section with new tooling.',
   'in_progress', 'low',       'week', 'manual',           CURRENT_DATE + 7,  NULL,             uid),
  ('1:1 prep for Bob',              'Review his goals and recent feedback before Thursday.',
   'in_progress', 'medium',    'week', 'recurring_meeting',CURRENT_DATE + 3,  NULL,             uid),
  ('Unblock data pipeline issue',   'Investigate why ingestion job fails on weekends.',
   'in_progress', 'high',      'week', 'meeting_action',   CURRENT_DATE + 1,  NULL,             uid),
  ('Performance review for Carol',  'Draft written review for H1 cycle.',
   'in_progress', 'very_high', 'week', 'performance',      CURRENT_DATE + 2,  NULL,             uid),

  -- Week tasks: blocked × all priorities
  ('Set up monitoring alerts',      'Waiting on infra team to grant Grafana access.',
   'blocked',     'low',       'week', 'manual',           CURRENT_DATE + 10, NULL,             uid),
  ('Finalise headcount request',    'Blocked on finance approval.',
   'blocked',     'medium',    'week', 'manual',           CURRENT_DATE + 4,  NULL,             uid),
  ('Deploy new auth service',       'Blocked on security sign-off.',
   'blocked',     'high',      'week', 'meeting_action',   CURRENT_DATE + 1,  NULL,             uid),
  ('Ship mobile release v3.2',      'Blocked on legal review of new data collection.',
   'blocked',     'very_high', 'week', 'manual',           CURRENT_DATE,      NULL,             uid),

  -- Week tasks: completed × all priorities
  ('Send meeting notes from retro', 'Sent to team Slack after Friday retro.',
   'completed',   'low',       'week', 'recurring_meeting',CURRENT_DATE - 1,  CURRENT_DATE - 1, uid),
  ('Review Dave''s tech proposal',  'Approved with minor comments.',
   'completed',   'medium',    'week', 'manual',           CURRENT_DATE - 2,  CURRENT_DATE - 2, uid),
  ('Fix flaky CI test',             'Root cause was non-deterministic UUID comparison.',
   'completed',   'high',      'week', 'manual',           CURRENT_DATE - 1,  CURRENT_DATE - 1, uid),
  ('Resolve P0 auth outage',        'Rolled back bad migration, patched within SLA.',
   'completed',   'very_high', 'week', 'manual',           CURRENT_DATE - 3,  CURRENT_DATE - 3, uid),

  -- Backlog tasks: one per priority, varied status
  ('Document architecture decisions','ADR backlog from last quarter.',
   'not_started', 'low',       'backlog', 'manual',        CURRENT_DATE + 30, NULL,             uid),
  ('Evaluate new observability tool','Compare Datadog vs Grafana Cloud.',
   'not_started', 'medium',    'backlog', 'growth',        CURRENT_DATE + 21, NULL,             uid),
  ('Define promotion criteria doc', 'Work with HR to define levels clearly.',
   'in_progress', 'high',      'backlog', 'manual',        CURRENT_DATE + 14, NULL,             uid),
  ('Set up E2E test suite',         'Playwright tests for critical user flows.',
   'not_started', 'very_high', 'backlog', 'meeting_action',CURRENT_DATE + 10, NULL,             uid),
  ('Create onboarding checklist',   'Standardise 30/60/90 day plan for engineers.',
   'completed',   'medium',    'backlog', 'manual',        CURRENT_DATE - 10, CURRENT_DATE - 10,uid),
  ('Run team health survey',        'Quarterly pulse check.',
   'completed',   'low',       'backlog', 'recurring_meeting',CURRENT_DATE - 7,CURRENT_DATE - 7,uid)
;

-- =============================================================================
-- 6. MEETINGS — all types, spread across several dates
--    types: '1:1' | 'Team Sync' | 'Retro' | 'Planning' | 'Review' | 'Standup' | 'Other'
--    recurrence: none | weekly | fortnightly | monthly | custom
-- =============================================================================

-- 1:1s (person_id set, team_id NULL)
INSERT INTO public.meetings (id, title, meeting_type, meeting_date, next_meeting_date, recurrence,
  notes, action_items, person_id, team_id, owning_user_id)
VALUES
  (gen_random_uuid(),
   '1:1 with Alice', '1:1', CURRENT_DATE - 7, CURRENT_DATE,
   'weekly',
   'Alice shared she feels confident in her first feature. Wants more code review feedback.',
   '- Share reading list on clean code\n- Schedule pairing session with Bob',
   p_alice, NULL, uid),

  (gen_random_uuid(),
   '1:1 with Alice', '1:1', CURRENT_DATE, CURRENT_DATE + 7,
   'weekly',
   'Good energy. Completed first end-to-end feature. Nervous about upcoming sprint review.',
   '- Add Alice to sprint review presenter list\n- Follow up on growth plan',
   p_alice, NULL, uid),

  (gen_random_uuid(),
   '1:1 with Bob', '1:1', CURRENT_DATE - 14, CURRENT_DATE - 7,
   'fortnightly',
   'Bob wants to move toward tech lead. Discussed what that means in practice.',
   '- Share staff eng job description\n- Identify a project for Bob to lead',
   p_bob, NULL, uid),

  (gen_random_uuid(),
   '1:1 with Bob', '1:1', CURRENT_DATE - 7, CURRENT_DATE,
   'fortnightly',
   'Bob drafted his first tech spec. Good structure, needs sharper problem statement.',
   '- Review tech spec draft\n- Schedule doc review with Dave',
   p_bob, NULL, uid),

  (gen_random_uuid(),
   '1:1 with Carol', '1:1', CURRENT_DATE - 21, CURRENT_DATE - 7,
   'monthly',
   'Carol is leading the new auth refactor. On track. Flagged cross-team dependency risk.',
   '- Raise dependency risk in weekly sync\n- Check in with security team',
   p_carol, NULL, uid),

  (gen_random_uuid(),
   '1:1 with Carol', '1:1', CURRENT_DATE - 3, CURRENT_DATE + 25,
   'monthly',
   'Discussed promotion timeline. Carol is tracking well against Staff criteria.',
   '- Write up promotion case draft\n- Collect peer feedback',
   p_carol, NULL, uid);

SELECT id INTO m_11_alice FROM public.meetings
  WHERE owning_user_id = uid AND meeting_type = '1:1' AND person_id = p_alice
  ORDER BY meeting_date DESC LIMIT 1;

SELECT id INTO m_11_bob FROM public.meetings
  WHERE owning_user_id = uid AND meeting_type = '1:1' AND person_id = p_bob
  ORDER BY meeting_date DESC LIMIT 1;

SELECT id INTO m_11_carol FROM public.meetings
  WHERE owning_user_id = uid AND meeting_type = '1:1' AND person_id = p_carol
  ORDER BY meeting_date DESC LIMIT 1;

-- Team Syncs, Retros, Planning, Reviews, Standups, Other (team_id set, person_id NULL)
INSERT INTO public.meetings (id, title, meeting_type, meeting_date, next_meeting_date, recurrence,
  notes, action_items, person_id, team_id, owning_user_id)
VALUES
  (gen_random_uuid(),
   'Platform Weekly Sync', 'Team Sync', CURRENT_DATE - 7, CURRENT_DATE,
   'weekly',
   'Discussed CI flakiness. Dave will pair with Alice on the fix.',
   '- Fix flaky CI test (Alice + Dave)\n- Update runbook for deploy process',
   NULL, t_platform, uid),

  (gen_random_uuid(),
   'Platform Weekly Sync', 'Team Sync', CURRENT_DATE, CURRENT_DATE + 7,
   'weekly',
   'Reviewed sprint velocity. On track. Deployment blocker raised for auth service.',
   '- Track auth service sign-off\n- Dave to escalate if not resolved by Thursday',
   NULL, t_platform, uid),

  (gen_random_uuid(),
   'Product Sync', 'Team Sync', CURRENT_DATE - 3, CURRENT_DATE + 4,
   'weekly',
   'Carol walked through the auth refactor plan. PM aligned. Design review next week.',
   '- Carol to send architecture doc to PM\n- Schedule design review',
   NULL, t_product, uid),

  (gen_random_uuid(),
   'Sprint Retro', 'Retro', CURRENT_DATE - 14, NULL,
   'none',
   'Team flagged too many context switches. Agreed to protect focus blocks in calendar.',
   '- Block 2 hours of focus time per person per day\n- Try no-meeting Thursdays',
   NULL, t_platform, uid),

  (gen_random_uuid(),
   'Q2 Sprint Planning', 'Planning', CURRENT_DATE - 1, NULL,
   'none',
   'Planned 24 points across 3 engineers. Key priority: auth refactor and monitoring alerts.',
   '- Kick off auth refactor Monday\n- Alice to pick up monitoring alerts ticket',
   NULL, t_product, uid),

  (gen_random_uuid(),
   'Q1 Engineering Review', 'Review', CURRENT_DATE - 30, NULL,
   'none',
   'Reviewed Q1 delivery vs targets. 80% of planned stories shipped. Two slipped to Q2.',
   '- Add slipped items to Q2 backlog\n- Post-mortem on auth incident',
   NULL, t_platform, uid),

  (gen_random_uuid(),
   'Daily Standup', 'Standup', CURRENT_DATE, CURRENT_DATE + 1,
   'weekly',
   'Quick round. Bob blocked on auth sign-off. Alice will demo feature today.',
   '- Bob to ping security directly\n- Alice to share demo link',
   NULL, t_product, uid),

  (gen_random_uuid(),
   'Data Team Standup', 'Standup', CURRENT_DATE - 1, CURRENT_DATE,
   'weekly',
   'Frank flagged weekend pipeline failure. Grace investigating.',
   '- Grace to share findings by EOD\n- Frank to add retry logic',
   NULL, t_data, uid),

  (gen_random_uuid(),
   'Reorg Kickoff', 'Other', CURRENT_DATE - 10, NULL,
   'none',
   'Eve walked through the proposed mobile reorg. Q&A open. No decisions made yet.',
   '- Eve to send follow-up summary\n- All to review org chart draft',
   NULL, NULL, uid);

SELECT id INTO m_sync_plat FROM public.meetings
  WHERE owning_user_id = uid AND title = 'Platform Weekly Sync' AND meeting_date = CURRENT_DATE;
SELECT id INTO m_retro      FROM public.meetings WHERE owning_user_id = uid AND meeting_type = 'Retro';
SELECT id INTO m_planning   FROM public.meetings WHERE owning_user_id = uid AND meeting_type = 'Planning';
SELECT id INTO m_review     FROM public.meetings WHERE owning_user_id = uid AND meeting_type = 'Review';

-- =============================================================================
-- 7. MEETING TEMPLATES
-- =============================================================================
INSERT INTO public.meeting_templates (name, notes, owning_user_id)
VALUES
  ('1:1 Template',
   '## Check-in\nHow are you feeling this week?\n\n## Focus\nWhat are you working on?\n\n## Blockers\nAnything slowing you down?\n\n## Growth\nAny progress on your goals?\n\n## Action Items\n- ',
   uid),
  ('Team Sync Template',
   '## Updates\nRound-robin team updates.\n\n## Blockers\nAnything the team needs help with?\n\n## Decisions\nDecisions to make today.\n\n## Action Items\n- ',
   uid),
  ('Retro Template',
   '## What went well?\n\n## What could be better?\n\n## Action Items\n- ',
   uid),
  ('Performance Review Template',
   '## Achievements\nKey wins this period.\n\n## Opportunities\nAreas to grow.\n\n## Goals for next period\n\n## Rating discussion\n',
   uid);

-- =============================================================================
-- 8. EVIDENCE ENTRIES — all categories, all sentiments, linked to people + meetings
--    categories: achievement | feedback_given | feedback_received | concern |
--                growth | delivery | behaviour | promotion_evidence | general
--    sentiments: positive | neutral | negative
-- =============================================================================
INSERT INTO public.evidence_entries
  (owning_user_id, person_id, category, title, content, occurred_at,
   meeting_id, sentiment, included_in_review)
VALUES
  -- Alice
  (uid, p_alice, 'achievement', 'Shipped first production feature',
   'Alice delivered the profile settings page end-to-end with no bugs in prod. Impressive for a junior.',
   CURRENT_DATE - 2, m_11_alice, 'positive', TRUE),

  (uid, p_alice, 'growth', 'Proactively asked for stretch assignment',
   'During our 1:1 Alice asked to take on the monitoring alerts ticket without being prompted.',
   CURRENT_DATE, m_11_alice, 'positive', TRUE),

  (uid, p_alice, 'feedback_given', 'Gave constructive PR feedback to Bob',
   'Left detailed, respectful comments on Bob''s auth PR. Good instinct for code quality.',
   CURRENT_DATE - 5, NULL, 'positive', TRUE),

  (uid, p_alice, 'concern', 'Underestimated task complexity twice this sprint',
   'Alice''s estimates have been off by 2x on two stories. Needs to break tasks down more carefully.',
   CURRENT_DATE - 3, m_11_alice, 'negative', TRUE),

  -- Bob
  (uid, p_bob, 'delivery', 'Led auth refactor spike independently',
   'Bob drove the 3-day spike, produced a clear recommendation doc, and presented to the team.',
   CURRENT_DATE - 7, m_11_bob, 'positive', TRUE),

  (uid, p_bob, 'feedback_received', 'Positive peer feedback from Carol',
   'Carol noted Bob is great to pair with and always explains his reasoning clearly.',
   CURRENT_DATE - 5, NULL, 'positive', TRUE),

  (uid, p_bob, 'behaviour', 'Became defensive during retro feedback',
   'Bob pushed back when team raised concerns about test coverage in his area. Needs to hear feedback openly.',
   CURRENT_DATE - 14, m_retro, 'negative', TRUE),

  (uid, p_bob, 'promotion_evidence', 'Tech spec approved by staff eng',
   'Dave approved Bob''s tech spec with minor revisions. Strong signal for senior readiness.',
   CURRENT_DATE - 2, NULL, 'positive', TRUE),

  -- Carol
  (uid, p_carol, 'achievement', 'Delivered auth refactor on time',
   'Despite cross-team dependencies, Carol shipped the refactor within the planned sprint.',
   CURRENT_DATE - 1, m_11_carol, 'positive', TRUE),

  (uid, p_carol, 'delivery', 'Slipped on documentation deadline',
   'ADR for auth service was two weeks late. Carol deprioritised it without flagging the slip.',
   CURRENT_DATE - 10, NULL, 'negative', TRUE),

  (uid, p_carol, 'general', 'Represented team in cross-org design review',
   'Carol was the sole engineer in a design review with 3 product teams. Handled it well.',
   CURRENT_DATE - 4, NULL, 'neutral', TRUE),

  (uid, p_carol, 'promotion_evidence', 'Mentoring Bob toward senior skills',
   'Carol is informally coaching Bob on system design. Unprompted. Strong staff-level behaviour.',
   CURRENT_DATE - 6, NULL, 'positive', TRUE),

  -- Dave
  (uid, p_dave, 'achievement', 'Platform strategy doc adopted org-wide',
   'Dave''s platform vision doc was accepted by the CTO and is now the reference for all infra decisions.',
   CURRENT_DATE - 20, m_review, 'positive', TRUE),

  (uid, p_dave, 'behaviour', 'Occasionally skips Standup without notice',
   'Dave has missed standup 3 times this month without a message. Flagged as a small but recurring issue.',
   CURRENT_DATE - 3, NULL, 'negative', FALSE),

  -- Frank
  (uid, p_frank, 'delivery', 'Built ingestion pipeline from scratch',
   'Frank delivered the full ingestion pipeline in 6 weeks. Now processing 10M events/day.',
   CURRENT_DATE - 30, NULL, 'positive', TRUE),

  (uid, p_frank, 'concern', 'No documentation for pipeline jobs',
   'None of the pipeline jobs have runbooks. This is a bus-factor risk.',
   CURRENT_DATE - 5, NULL, 'negative', TRUE),

  -- Grace
  (uid, p_grace, 'growth', 'Completed first solo SQL analysis',
   'Grace ran an independent cohort analysis and presented it to the team. Clean work for her level.',
   CURRENT_DATE - 7, NULL, 'positive', TRUE),

  (uid, p_grace, 'feedback_received', 'Frank noted Grace is asking the right questions',
   'Frank said Grace always reads documentation before asking for help. Good sign.',
   CURRENT_DATE - 2, NULL, 'positive', TRUE);

-- =============================================================================
-- 9. REVIEW CYCLES + REVIEW SUMMARIES
-- =============================================================================
INSERT INTO public.review_cycles (id, owning_user_id, name, start_date, end_date, status)
VALUES
  (gen_random_uuid(), uid, 'H1 2026 Performance Review', '2026-01-01', '2026-06-30', 'active'),
  (gen_random_uuid(), uid, 'H2 2025 Performance Review', '2025-07-01', '2025-12-31', 'completed');

SELECT id INTO rc FROM public.review_cycles WHERE owning_user_id = uid AND name = 'H1 2026 Performance Review';

INSERT INTO public.review_summaries (owning_user_id, person_id, review_cycle_id, period_start, period_end, summary_text, manager_notes)
VALUES
  (uid, p_alice, rc, '2026-01-01', '2026-06-30',
   'Alice has had a strong first half. Shipped her first production feature and shown great initiative. Growth area: estimation accuracy.',
   'Tracking well for expectations at Junior level. Keep encouraging stretch.'),

  (uid, p_bob, rc, '2026-01-01', '2026-06-30',
   'Bob is demonstrating senior-level behaviours in technical delivery and mentoring. One development area: receiving feedback gracefully.',
   'Close to promotion bar. Plan to discuss formally in Q3.'),

  (uid, p_carol, rc, '2026-01-01', '2026-06-30',
   'Carol delivered a critical refactor under pressure. Starting to show staff-level influence through mentoring. Documentation is a gap.',
   'Strong candidate for Staff in 12-18 months if influence continues to grow.');

-- =============================================================================
-- 10. CAREER GOALS + GAP ANALYSIS
-- =============================================================================
INSERT INTO public.career_goals_profiles (id, where_you_are, where_you_want_to_go, owning_user_id)
VALUES
  (gen_random_uuid(),
   'Engineering Manager leading 3 teams. Strong in delivery and people growth. Less experienced in org-level strategy.',
   'Director of Engineering. Driving org-level technical strategy, hiring, and culture.',
   uid);

SELECT id INTO cgp FROM public.career_goals_profiles WHERE owning_user_id = uid;

INSERT INTO public.gap_analysis_categories (id, category, current_state, desired_state, display_order, owning_user_id)
VALUES
  (gen_random_uuid(), 'Technical Leadership',
   'Comfortable with team-level technical direction.',
   'Drive org-wide architecture decisions and evaluate build/buy/partner.',
   1, uid),
  (gen_random_uuid(), 'People & Org Development',
   'Effective 1:1s and performance reviews. Good at growing individual engineers.',
   'Build hiring pipelines, define levelling, shape team culture at scale.',
   2, uid),
  (gen_random_uuid(), 'Communication & Influence',
   'Strong within my teams. Less visible at exec level.',
   'Regularly present to leadership. Influence roadmap and resourcing decisions.',
   3, uid);

SELECT id INTO gap_tech FROM public.gap_analysis_categories WHERE owning_user_id = uid AND category = 'Technical Leadership';
SELECT id INTO gap_lead FROM public.gap_analysis_categories WHERE owning_user_id = uid AND category = 'People & Org Development';
SELECT id INTO gap_comm FROM public.gap_analysis_categories WHERE owning_user_id = uid AND category = 'Communication & Influence';

INSERT INTO public.focus_distributions (time_period, category_id, focus_percent, why, owning_user_id)
VALUES
  ('short_term', gap_tech,  30, 'Build credibility on technical decisions first.', uid),
  ('short_term', gap_lead,  50, 'Current teams need most of my energy.',           uid),
  ('short_term', gap_comm,  20, 'Start attending leadership forums.',               uid),
  ('mid_term',   gap_tech,  25, 'Stay close enough to guide architecture.',         uid),
  ('mid_term',   gap_lead,  35, 'Begin building hiring muscle.',                    uid),
  ('mid_term',   gap_comm,  40, 'Ramp up exec visibility.',                        uid),
  ('long_term',  gap_tech,  20, 'Delegate most technical decisions to staff engs.', uid),
  ('long_term',  gap_lead,  30, 'Focus on director-level org design.',              uid),
  ('long_term',  gap_comm,  50, 'Executive presence is the main lever.',            uid);

INSERT INTO public.career_goals (time_period, goal, type, category_id, status, display_order, owning_user_id)
VALUES
  ('short_term', 'Lead cross-team technical design review',           'Core',    gap_tech, 'In progress',  1, uid),
  ('short_term', 'Complete Engineering Management course (Reforge)',  'Core',    gap_lead, 'Not started',  2, uid),
  ('short_term', 'Present team roadmap to leadership',                'Stretch', gap_comm, 'Not started',  3, uid),
  ('mid_term',   'Build levelling framework for all engineering roles','Core',    gap_lead, 'Not started',  1, uid),
  ('mid_term',   'Own hiring for one full role end-to-end',           'Core',    gap_lead, 'Not started',  2, uid),
  ('mid_term',   'Publish internal engineering blog post',            'Stretch', gap_comm, 'Not started',  3, uid),
  ('long_term',  'Promoted to Director of Engineering',               'Core',    gap_comm, 'Not started',  1, uid),
  ('long_term',  'Define 3-year technical strategy for org',          'Stretch', gap_tech, 'Not started',  2, uid),
  ('long_term',  'Build and ship a new team from zero',               'Core',    gap_lead, 'Not started',  3, uid);

-- =============================================================================
-- 11. ACHIEVEMENTS
--     types: Book | Course | Certification | Conference | Talk | Other
-- =============================================================================
INSERT INTO public.achievements (type, description, achievement_date, key_takeaway, owning_user_id)
VALUES
  ('Book',          'An Elegant Puzzle — Will Larson',
   '2026-02-15',
   'Systems thinking for engineering orgs. The concept of "slack" in teams changed how I plan capacity.',
   uid),
  ('Book',          'The Manager''s Path — Camille Fournier',
   '2025-10-01',
   'Excellent progression from TL to VP. Grounded my understanding of each level''s expectations.',
   uid),
  ('Course',        'Reforge: Engineering Leadership Program',
   '2026-03-30',
   'Frameworks for scaling teams and navigating org politics. Immediately applied to headcount planning.',
   uid),
  ('Certification', 'AWS Solutions Architect Associate',
   '2025-06-20',
   'Stronger foundation for evaluating infra proposals from my teams.',
   uid),
  ('Conference',    'LeadDev London 2025',
   '2025-09-12',
   'Talks on psychological safety and distributed team rituals were directly applicable.',
   uid),
  ('Talk',          'Internal talk: "How we halved our deploy time"',
   '2026-01-20',
   'Sharing cross-team learnings builds credibility and surfaces hidden knowledge.',
   uid),
  ('Other',         'Completed 360-degree feedback round with my teams',
   '2026-04-01',
   'Received candid feedback that I sometimes move too fast in decisions without enough buy-in.',
   uid);

-- =============================================================================
-- 12. COMPETENCY FRAMEWORK
-- =============================================================================
INSERT INTO public.competency_frameworks (id, name, description, status, owning_user_id)
VALUES
  (gen_random_uuid(), 'Engineering Levelling Framework',
   'Defines expectations at Junior, Mid, Senior, Staff, and Principal levels.',
   'active', uid);

SELECT id INTO fw FROM public.competency_frameworks WHERE owning_user_id = uid;

INSERT INTO public.competency_areas (id, framework_id, name, description, sort_order, owning_user_id)
VALUES
  (gen_random_uuid(), fw, 'Technical Execution',
   'Code quality, system design, and delivery reliability.', 1, uid),
  (gen_random_uuid(), fw, 'Leadership & Collaboration',
   'Communication, mentoring, and cross-team impact.', 2, uid);

SELECT id INTO area_eng  FROM public.competency_areas WHERE owning_user_id = uid AND name = 'Technical Execution';
SELECT id INTO area_lead FROM public.competency_areas WHERE owning_user_id = uid AND name = 'Leadership & Collaboration';

INSERT INTO public.competency_levels (area_id, level, expectations, owning_user_id)
VALUES
  (area_eng, 'Junior',    'Completes well-defined tasks with guidance. Tests own code. Asks good questions.', uid),
  (area_eng, 'Mid',       'Works independently on features. Proposes solutions. Reviews peers'' code.', uid),
  (area_eng, 'Senior',    'Designs systems across the service. Mentors juniors. Raises the bar in reviews.', uid),
  (area_eng, 'Staff',     'Defines technical direction across teams. Evaluates build/buy/partner decisions.', uid),
  (area_lead, 'Junior',   'Participates in team discussions. Shares progress proactively.', uid),
  (area_lead, 'Mid',      'Unblocks teammates. Gives constructive PR feedback. Runs a team ceremony.', uid),
  (area_lead, 'Senior',   'Leads cross-team initiatives. Mentors mid-levels. Influences roadmap.', uid),
  (area_lead, 'Staff',    'Shapes org culture and process. Advocates for technical strategy at exec level.', uid);

-- Competency assessments for seeded people
INSERT INTO public.competency_assessments
  (owning_user_id, person_id, area_id, assessed_level, score, notes, assessed_at)
VALUES
  (uid, p_alice, area_eng,  'Junior', 2, 'Good instincts but estimates need work.', CURRENT_DATE - 14),
  (uid, p_alice, area_lead, 'Junior', 3, 'Proactively asks for stretch work.',      CURRENT_DATE - 14),
  (uid, p_bob,   area_eng,  'Mid',    4, 'Solid delivery and technical spec quality.', CURRENT_DATE - 7),
  (uid, p_bob,   area_lead, 'Mid',    3, 'Tech leadership strong; needs to improve receiving feedback.', CURRENT_DATE - 7),
  (uid, p_carol, area_eng,  'Senior', 5, 'Delivered refactor under pressure, high quality.',  CURRENT_DATE - 3),
  (uid, p_carol, area_lead, 'Senior', 4, 'Starting to show staff-level influence via mentoring.', CURRENT_DATE - 3),
  (uid, p_frank, area_eng,  'Mid',    3, 'Strong pipeline delivery; documentation gap.', CURRENT_DATE - 10),
  (uid, p_grace, area_eng,  'Junior', 2, 'Early days but good fundamentals.',          CURRENT_DATE - 7);

-- =============================================================================
-- 13. GROWTH PLANS
-- =============================================================================
INSERT INTO public.growth_plans
  (owning_user_id, person_id, area_id, title, description, target_level, status, target_date, progress_notes)
VALUES
  (uid, p_alice, area_eng, 'Alice: improve estimation',
   'Work on breaking stories into sub-tasks before committing. Pair with Bob on next sprint planning.',
   'Mid', 'active', CURRENT_DATE + 90,
   'Started breaking down tasks more. Estimates improving. Two weeks in.'),

  (uid, p_bob, area_lead, 'Bob: tech lead readiness',
   'Lead next major feature end-to-end: spec, delivery, and retro. Increase PR review quality.',
   'Senior', 'active', CURRENT_DATE + 120,
   'Tech spec approved. Now running weekly syncs on auth refactor.'),

  (uid, p_carol, area_lead, 'Carol: staff-level influence',
   'Increase cross-team visibility. Volunteer for org-wide design reviews.',
   'Staff', 'active', CURRENT_DATE + 180,
   'Attended first cross-org design review. Positive reception.'),

  (uid, p_frank, area_eng, 'Frank: documentation habit',
   'Write runbook for each pipeline job. Aim for full coverage by end of Q2.',
   'Mid', 'active', CURRENT_DATE + 60,
   'Two runbooks drafted. Six remaining.'),

  (uid, p_alice, area_lead, 'Alice: peer collaboration',
   'Practice giving PR feedback. Target: review at least 2 PRs per sprint.',
   'Mid', 'active', CURRENT_DATE + 60,
   'Gave first PR review this week. Good start.');

-- =============================================================================
-- 14. FOLLOW UPS
-- =============================================================================
INSERT INTO public.follow_ups (user_id, person_id, title, description, source_type, status, due_date)
VALUES
  (uid, p_alice, 'Share reading list on clean code',
   'Promised during 1:1. Send links to clean code resources.',
   'meeting', 'open', CURRENT_DATE + 3),

  (uid, p_bob, 'Review Bob''s tech spec draft',
   'Bob to share updated draft after Dave''s comments.',
   'meeting', 'open', CURRENT_DATE + 5),

  (uid, p_carol, 'Collect peer feedback for Carol''s promotion case',
   'Reach out to Dave and product PM for written feedback.',
   'manual', 'open', CURRENT_DATE + 14),

  (uid, p_frank, 'Check pipeline runbook progress',
   'Frank committed to two runbooks per week.',
   'meeting', 'open', CURRENT_DATE + 7),

  (uid, p_bob, 'Follow up on retro feedback conversation',
   'Bob was defensive during retro. Check in privately to close the loop.',
   'meeting', 'completed', CURRENT_DATE - 2),

  (uid, p_grace, 'Send Grace link to SQL style guide',
   'Came up during data team standup.',
   'meeting', 'open', CURRENT_DATE + 2);

-- =============================================================================
-- 15. WEEKLY REVIEWS (last 4 weeks)
-- =============================================================================
INSERT INTO public.weekly_reviews (user_id, week_start, status, notes, summary_markdown)
VALUES
  (uid, date_trunc('week', CURRENT_DATE - 21)::DATE, 'completed',
   'Good week. Auth refactor kicked off. Bob''s spec approved.',
   '## Week Summary\n**Highlights:** Auth refactor started. Bob''s tech spec approved by Dave.\n**Risks:** Carol flagged dependency on security team.\n**Next week:** Sprint planning, follow up with security.'),

  (uid, date_trunc('week', CURRENT_DATE - 14)::DATE, 'completed',
   'Retro surfaced context switching issues. Team morale good.',
   '## Week Summary\n**Highlights:** Sprint retro was productive. Good team engagement.\n**Risks:** Bob defensive about test coverage feedback.\n**Next week:** Follow up with Bob, continue auth refactor.'),

  (uid, date_trunc('week', CURRENT_DATE - 7)::DATE, 'completed',
   'Alice shipped her first feature. Dave''s platform doc adopted org-wide.',
   '## Week Summary\n**Highlights:** Alice shipped profile settings. Dave''s doc adopted by CTO.\n**Risks:** CI flakiness still not resolved.\n**Next week:** Fix CI, unblock auth deploy.'),

  (uid, date_trunc('week', CURRENT_DATE)::DATE, 'in_progress',
   'Auth deploy blocked on legal. Focus: unblock and run sprint planning.',
   NULL);

END $$;
