// ── Canonical Data Models ──

export interface Actor {
  id: string;
  display_name: string;
  aliases: string[];  // git usernames, Jira IDs, etc.
}

export type EventType =
  | 'PR_OPENED' | 'PR_MERGED' | 'PR_CLOSED'
  | 'CODE_REVIEW' | 'COMMENT_ADDED'
  | 'STATUS_CHANGE' | 'BLOCKED' | 'UNBLOCKED'
  | 'TICKET_CREATED' | 'TICKET_ASSIGNED'
  | 'REPORTED_BLOCKER' | 'SENTIMENT_FLAG' | 'STANDUP_UPDATE';

export type WorkItemType = 'PR' | 'STORY' | 'BUG' | 'EPIC' | 'TASK' | 'SUBTASK';
export type WorkItemStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'QA' | 'DONE' | 'BLOCKED';

export interface WorkItem {
  id: string;
  source_id: string;
  source: 'github' | 'jira' | 'standup';
  type: WorkItemType;
  title: string;
  size_estimate: number; // story points or PR size
  status: WorkItemStatus;
  assignee_id?: string;
  created_at: string;
  closed_at?: string;
  labels?: string[];
}

export interface NormalizedEvent {
  id: string;
  actor_id: string;
  event_type: EventType;
  timestamp: string;
  work_item_id?: string;
  metadata: Record<string, unknown>;
}

// ── Scoring Types ──

export type HealthStatus = 'green' | 'amber' | 'red';

export interface ScoreResult {
  score: number;
  status: HealthStatus;
  factors: ScoringFactor[];
}

export interface ScoringFactor {
  name: string;
  value: number;
  impact: string; // human-readable explanation
  weight?: number;
}

export interface DeveloperWorkload {
  developer: string;
  actor_id: string;
  coding_points: number;
  review_points: number;
  total_points: number;
  z_score: number;
  review_load_pct: number;
  flagged: boolean;
  flag_reason?: string;
}

export interface BottleneckFunnel {
  todo: number;
  in_progress: number;
  in_review: number;
  qa: number;
  done: number;
}

export interface CycleTimePoint {
  pr_id: string;
  title: string;
  size: number;
  hours_to_merge: number;
  author: string;
  is_outlier: boolean;
}

export interface RecommendedAction {
  priority: 'high' | 'medium' | 'low';
  action: string;
  rationale: string;
  category: 'workload' | 'blocker' | 'review' | 'delivery' | 'collaboration';
}

export interface AnalyticsReport {
  report_id: string;
  generated_at: string;
  summary: {
    team_health: ScoreResult;
    workload_imbalance: ScoreResult;
    collaboration_quality: ScoreResult;
    delivery_risk: ScoreResult;
  };
  narrative: string;
  recommended_actions: RecommendedAction[];
  charts: {
    workload_distribution: DeveloperWorkload[];
    bottleneck_funnel: BottleneckFunnel;
    cycle_time: CycleTimePoint[];
  };
  data_quality: {
    has_github: boolean;
    has_jira: boolean;
    has_standup: boolean;
    warnings: string[];
  };
}

// ── Ingestion State ──

export interface IngestionState {
  github_data: RawGitHubData[];
  jira_data: RawJiraData[];
  standup_text: string;
  actors: Actor[];
  work_items: WorkItem[];
  events: NormalizedEvent[];
}

export interface RawGitHubData {
  number?: number;
  title?: string;
  user?: string;
  state?: string;
  created_at?: string;
  merged_at?: string;
  closed_at?: string;
  additions?: number;
  deletions?: number;
  changed_files?: number;
  reviewers?: string;
  review_comments?: number;
  requested_reviewers?: string;
  labels?: string;
  head_ref?: string;
  base_ref?: string;
  body?: string;
  [key: string]: unknown;
}

export interface RawJiraData {
  key?: string;
  summary?: string;
  status?: string;
  assignee?: string;
  reporter?: string;
  issue_type?: string;
  priority?: string;
  story_points?: number;
  created?: string;
  updated?: string;
  resolved?: string;
  labels?: string;
  sprint?: string;
  flagged?: string;
  blocked?: string;
  [key: string]: unknown;
}
