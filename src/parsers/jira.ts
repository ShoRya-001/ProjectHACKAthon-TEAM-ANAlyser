import Papa from 'papaparse';
import type { RawJiraData, NormalizedEvent, WorkItem, Actor } from '../types/schema';
import { generateId } from '../utils/helpers';

/**
 * Jira Parser
 * Accepts CSV exports from Jira with columns like:
 * Key, Summary, Status, Assignee, Reporter, Issue Type, Priority, Story Points, Created, Updated, Resolved, Labels, Sprint, Flagged
 */

export function parseJiraInput(raw: string): RawJiraData[] {
  const trimmed = raw.trim();

  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch { /* CSV fallback */ }
  }

  const result = Papa.parse<RawJiraData>(trimmed, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
    transformHeader: (h: string) => h.trim().toLowerCase().replace(/\s+/g, '_'),
  });

  return result.data;
}

function mapJiraStatus(raw: string): WorkItem['status'] {
  const s = raw.toLowerCase().trim();
  if (['to do', 'open', 'backlog', 'new'].includes(s)) return 'TODO';
  if (['in progress', 'in development', 'dev', 'active'].includes(s)) return 'IN_PROGRESS';
  if (['in review', 'code review', 'review', 'peer review'].includes(s)) return 'IN_REVIEW';
  if (['qa', 'testing', 'in qa', 'in testing', 'test'].includes(s)) return 'QA';
  if (['done', 'closed', 'resolved', 'complete', 'completed'].includes(s)) return 'DONE';
  if (['blocked', 'impediment'].includes(s)) return 'BLOCKED';
  return 'IN_PROGRESS';
}

function mapJiraType(raw: string): WorkItem['type'] {
  const t = raw.toLowerCase().trim();
  if (t.includes('bug')) return 'BUG';
  if (t.includes('epic')) return 'EPIC';
  if (t.includes('sub')) return 'SUBTASK';
  if (t.includes('task')) return 'TASK';
  return 'STORY';
}

const DEFAULT_POINTS = 1.0;

export function normalizeJira(
  rawData: RawJiraData[]
): { actors: Actor[]; workItems: WorkItem[]; events: NormalizedEvent[] } {
  const actorMap = new Map<string, Actor>();
  const workItems: WorkItem[] = [];
  const events: NormalizedEvent[] = [];

  // Calculate team average for imputation
  const pointsValues = rawData
    .map(t => t.story_points ?? t['points' as keyof RawJiraData] as number)
    .filter(v => typeof v === 'number' && v > 0);
  const teamAvgPoints = pointsValues.length > 0
    ? pointsValues.reduce((a, b) => a + b, 0) / pointsValues.length
    : DEFAULT_POINTS;

  for (const ticket of rawData) {
    const key = String(ticket.key ?? ticket['issue_key' as keyof RawJiraData] ?? generateId());
    const summary = String(ticket.summary ?? ticket.title ?? `Ticket ${key}`);
    const statusRaw = String(ticket.status ?? 'To Do');
    const assignee = String(ticket.assignee ?? 'unassigned').trim();
    const reporter = String(ticket.reporter ?? '').trim();
    const issueType = String(ticket.issue_type ?? ticket['issuetype' as keyof RawJiraData] ?? 'Story');
    const storyPoints = Number(ticket.story_points ?? ticket['points' as keyof RawJiraData] ?? 0);
    const createdAt = ticket.created ?? new Date().toISOString();
    const resolvedAt = ticket.resolved;
    const isFlagged = String(ticket.flagged ?? ticket.blocked ?? '').toLowerCase();
    const isBlocked = isFlagged === 'true' || isFlagged === 'yes' || isFlagged === 'impediment' || statusRaw.toLowerCase() === 'blocked';

    // Ensure actors
    if (assignee && assignee !== 'unassigned' && !actorMap.has(assignee)) {
      actorMap.set(assignee, {
        id: `jira_${assignee.replace(/\s+/g, '_').toLowerCase()}`,
        display_name: assignee,
        aliases: [assignee],
      });
    }
    if (reporter && !actorMap.has(reporter)) {
      actorMap.set(reporter, {
        id: `jira_${reporter.replace(/\s+/g, '_').toLowerCase()}`,
        display_name: reporter,
        aliases: [reporter],
      });
    }

    const status = mapJiraStatus(statusRaw);
    const type = mapJiraType(issueType);
    const size = storyPoints > 0 ? storyPoints : Math.round(teamAvgPoints * 10) / 10;

    const workItemId = `jira_${key}`;
    const actorId = assignee !== 'unassigned'
      ? `jira_${assignee.replace(/\s+/g, '_').toLowerCase()}`
      : 'unknown';

    workItems.push({
      id: workItemId,
      source_id: key,
      source: 'jira',
      type,
      title: summary,
      size_estimate: size,
      status,
      assignee_id: actorId,
      created_at: String(createdAt),
      closed_at: resolvedAt ? String(resolvedAt) : undefined,
      labels: ticket.labels ? String(ticket.labels).split(',').map(l => l.trim()) : [],
    });

    // Status change event
    events.push({
      id: generateId(),
      actor_id: actorId,
      event_type: 'STATUS_CHANGE',
      timestamp: ticket.updated ? String(ticket.updated) : String(createdAt),
      work_item_id: workItemId,
      metadata: { from_status: 'unknown', to_status: status, story_points: size },
    });

    // Blocked event
    if (isBlocked) {
      events.push({
        id: generateId(),
        actor_id: actorId,
        event_type: 'BLOCKED',
        timestamp: ticket.updated ? String(ticket.updated) : String(createdAt),
        work_item_id: workItemId,
        metadata: { reason: 'Flagged or blocked status' },
      });
    }

    // Ticket created event
    events.push({
      id: generateId(),
      actor_id: reporter
        ? `jira_${reporter.replace(/\s+/g, '_').toLowerCase()}`
        : actorId,
      event_type: 'TICKET_CREATED',
      timestamp: String(createdAt),
      work_item_id: workItemId,
      metadata: { type: issueType, priority: ticket.priority },
    });
  }

  return {
    actors: Array.from(actorMap.values()),
    workItems,
    events,
  };
}
