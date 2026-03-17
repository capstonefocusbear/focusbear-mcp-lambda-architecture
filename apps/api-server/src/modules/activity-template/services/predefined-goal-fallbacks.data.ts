import { ActivityType } from '../../activity/domain/activity-type.enum';

export type PredefinedGoalFallbackHabit = {
  name: string;
  description?: string;
  routineType?: ActivityType | string;
  durationMinutes?: number;
  justification?: string;
  emoji?: string;
};

export type PredefinedGoalFallbackDefinition = {
  matchers: RegExp[];
  habits: PredefinedGoalFallbackHabit[];
};

export const PREDEFINED_GOAL_FALLBACKS: PredefinedGoalFallbackDefinition[] = [
  {
    matchers: [/boost productivity/i],
    habits: [
      {
        name: 'Top 3 priorities',
        description: 'Choose the three highest-impact tasks for the day before you start working.',
        routineType: ActivityType.morning,
        durationMinutes: 5,
        justification: 'Creates a clear focus target for the day.',
      },
      {
        name: 'Distraction-free work block',
        description: 'Start one focused work session with notifications silenced and a single task in view.',
        routineType: ActivityType.morning,
        durationMinutes: 15,
        justification: 'Builds momentum on meaningful work quickly.',
      },
      {
        name: 'Tomorrow plan review',
        description: 'Review what moved forward today and prepare the first task for tomorrow.',
        routineType: ActivityType.evening,
        durationMinutes: 10,
        justification: 'Reduces friction and context switching the next day.',
      },
    ],
  },
  {
    matchers: [/improve mental well-being/i, /improve mental wellbeing/i],
    habits: [
      {
        name: 'Calm breathing reset',
        description: 'Do a short breathing exercise to settle your nervous system before the day begins.',
        routineType: ActivityType.morning,
        durationMinutes: 5,
        justification: 'Lowers stress and improves emotional regulation.',
      },
      {
        name: 'Mindful outdoor walk',
        description: 'Take a short walk without multitasking and pay attention to your breathing and surroundings.',
        routineType: ActivityType.morning,
        durationMinutes: 10,
        justification: 'Supports mood, energy, and mental clarity.',
      },
      {
        name: 'Screen-free wind-down',
        description: 'Put devices away and do a calm activity like reading or stretching before bed.',
        routineType: ActivityType.evening,
        durationMinutes: 15,
        justification: 'Improves sleep quality and helps the mind unwind.',
      },
    ],
  },
  {
    matchers: [/focus on health\s*&\s*fitness/i, /focus on health and fitness/i, /improve physical health/i],
    habits: [
      {
        name: 'Hydrate and mobilize',
        description: 'Drink water and do a quick full-body mobility sequence after waking up.',
        routineType: ActivityType.morning,
        durationMinutes: 5,
        justification: 'Starts the day with movement and basic physical care.',
      },
      {
        name: 'Strength or cardio session',
        description: 'Complete a short workout that raises your heart rate or builds strength.',
        routineType: ActivityType.morning,
        durationMinutes: 15,
        justification: 'Creates consistent fitness progress.',
      },
      {
        name: 'Healthy meal prep',
        description: 'Prepare or plan one nutritious meal or snack before the day gets busy.',
        routineType: ActivityType.evening,
        durationMinutes: 10,
        justification: 'Makes healthy eating easier to follow through on.',
      },
    ],
  },
  {
    matchers: [/manage home tasks/i, /cleaning/i, /chores/i, /keep me ship tidy/i, /tame your castle/i],
    habits: [
      {
        name: 'High-traffic tidy-up',
        description: 'Reset one visible area like the kitchen counter, desk, or entryway.',
        routineType: ActivityType.morning,
        durationMinutes: 10,
        justification: 'Creates quick wins and reduces household clutter.',
      },
      {
        name: 'One chore finish',
        description: 'Choose one home task and finish it fully before moving on to another.',
        routineType: ActivityType.evening,
        durationMinutes: 10,
        justification: 'Builds momentum on practical household upkeep.',
      },
      {
        name: 'Evening reset sweep',
        description: 'Spend a few minutes putting items back where they belong before bed.',
        routineType: ActivityType.evening,
        durationMinutes: 10,
        justification: 'Prevents chores from accumulating across the week.',
      },
    ],
  },
  {
    matchers: [/strengthen relationships/i, /build stronger bonds/i, /tend to me crew/i],
    habits: [
      {
        name: 'Send one thoughtful message',
        description: 'Reach out to a friend or family member with a genuine check-in or note of appreciation.',
        routineType: ActivityType.morning,
        durationMinutes: 5,
        justification: 'Keeps important relationships active and warm.',
      },
      {
        name: 'Plan quality time',
        description: 'Schedule a call, walk, meal, or shared activity with someone you care about.',
        routineType: ActivityType.evening,
        durationMinutes: 5,
        justification: 'Turns good intentions into concrete connection.',
      },
      {
        name: 'Device-free conversation',
        description: 'Have one focused conversation without multitasking or checking your phone.',
        routineType: ActivityType.evening,
        durationMinutes: 10,
        justification: 'Improves presence and strengthens emotional connection.',
      },
    ],
  },
  {
    matchers: [/build healthy habits/i, /help me develop/i],
    habits: [
      {
        name: 'Morning reset',
        description: 'Drink water, stretch, and take one minute to set your intention for the day.',
        routineType: ActivityType.morning,
        durationMinutes: 5,
        justification: 'Builds consistency around simple foundational habits.',
      },
      {
        name: 'Habit tracker check-in',
        description: 'Review your habits and mark which one you will complete next.',
        routineType: ActivityType.morning,
        durationMinutes: 5,
        justification: 'Makes habit follow-through more deliberate.',
      },
      {
        name: 'Evening reflection',
        description: 'Reflect on what went well today and prepare one easy habit for tomorrow.',
        routineType: ActivityType.evening,
        durationMinutes: 10,
        justification: 'Reinforces progress and supports long-term consistency.',
      },
    ],
  },
  {
    matchers: [/stay focused at work/i, /help me stay/i],
    habits: [
      {
        name: 'Single-task startup',
        description: 'Choose one important task and clear unrelated tabs or notifications before starting.',
        routineType: ActivityType.morning,
        durationMinutes: 5,
        justification: 'Reduces context switching at the start of work.',
      },
      {
        name: 'Deep work block',
        description: 'Work on one cognitively demanding task with distractions blocked for a dedicated session.',
        routineType: ActivityType.morning,
        durationMinutes: 15,
        justification: 'Improves concentration and meaningful output.',
      },
      {
        name: 'Shutdown note',
        description: 'Capture unfinished tasks and identify the first action for your next work session.',
        routineType: ActivityType.evening,
        durationMinutes: 10,
        justification: 'Helps you resume focused work faster tomorrow.',
      },
    ],
  },
  {
    matchers: [/organize your tasks using ai/i],
    habits: [
      {
        name: 'AI inbox triage',
        description: 'Collect loose tasks and use AI to sort them into clear next actions or projects.',
        routineType: ActivityType.morning,
        durationMinutes: 10,
        justification: 'Turns scattered tasks into an actionable plan.',
      },
      {
        name: 'Priority shortlist',
        description: 'Choose the most important AI-sorted tasks to tackle today.',
        routineType: ActivityType.morning,
        durationMinutes: 5,
        justification: 'Prevents the task list from becoming overwhelming.',
      },
      {
        name: 'AI day review',
        description: 'Review completed work and use AI to prepare a cleaner task list for tomorrow.',
        routineType: ActivityType.evening,
        durationMinutes: 10,
        justification: 'Keeps your task system current and easier to trust.',
      },
    ],
  },
];
