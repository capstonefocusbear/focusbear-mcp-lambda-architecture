import { WebhookEventType } from './webhook-event-type.enum';

export interface WebhookPayload {
  event_type: WebhookEventType;
  timestamp: string;
  user_id: string;
  data: Record<string, any>;
}

export interface ActivityCompletedPayload {
  activity_id: string;
  activity_name: string;
  activity_type: string;
  duration_seconds: number;
  completed_at: string;
}

export interface RoutineCompletedPayload {
  routine_type: 'morning' | 'evening' | 'break';
  completion_percentage: number;
  activities_completed: number;
  total_activities: number;
  completed_at: string;
}

export interface FocusSessionPayload {
  focus_mode_id: string;
  focus_mode_name: string;
  started_at?: string;
  completed_at?: string;
  duration_seconds?: number;
}

export interface TodoPayload {
  todo_id: string;
  title: string;
  status: string;
  due_date?: string;
  created_at?: string;
  completed_at?: string;
}

export interface StreakMilestonePayload {
  streak_type: 'morning_routines' | 'evening_routines' | 'focus_modes' | 'micro_breaks';
  streak_count: number;
  milestone: number;
  achieved_at: string;
}
