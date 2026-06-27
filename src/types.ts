export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  deadline: string; // ISO date string
  estimated_minutes: number;
  category: 'assignment' | 'bill' | 'meeting' | 'interview' | 'other';
  status: 'pending' | 'in_progress' | 'done' | 'missed';
  priority_score: number; // 0-100
  priority_reason: string;
  energy_level: 'low' | 'medium' | 'high';
  source: 'manual' | 'ai_suggested' | 'calendar_synced';
  subtasks: SubTask[];
  created_at: string;
  completed_at?: string;
  parent_task_id?: string;
  custom_order?: number;
}

export interface ScheduleBlock {
  id: string;
  task_id?: string; // Optional, can be personal time / calendar event
  title: string;
  start_time: string; // ISO string
  end_time: string; // ISO string
  source: 'ai_suggested' | 'user_set' | 'calendar_synced';
  status: 'planned' | 'completed' | 'skipped';
}

export interface CalendarEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  is_all_day?: boolean;
}

export interface Goal {
  id: string;
  title: string;
  target_date: string;
  progress_percent: number;
  category: string;
}

export interface Habit {
  id: string;
  title: string;
  frequency: 'daily' | 'weekly';
  streak_count: number;
  last_completed_at?: string; // YYYY-MM-DD
}

export interface UserPattern {
  id: string;
  pattern_type: 'underestimates_duration' | 'best_focus_window' | 'procrastination_risk' | 'energy_alignment';
  title: string;
  description: string;
  confidence: number; // 0 to 1
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  actions_taken?: {
    type: 'create_subtasks' | 'schedule_block' | 'update_priority' | 'status_change';
    detail: string;
  }[];
}

export interface AutonomousLog {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  action_type: 'task_split' | 'reschedule' | 'escalated_nudge' | 'pattern_learned';
  details: string;
}

export interface DBState {
  tasks: Task[];
  schedule_blocks: ScheduleBlock[];
  calendar_events: CalendarEvent[];
  goals: Goal[];
  habits: Habit[];
  patterns: UserPattern[];
  conversations: ChatMessage[];
  autonomous_logs: AutonomousLog[];
}
