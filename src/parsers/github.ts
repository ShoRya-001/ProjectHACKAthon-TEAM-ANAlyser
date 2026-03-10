import Papa from 'papaparse';
import type { RawGitHubData, NormalizedEvent, WorkItem, Actor } from '../types/schema';
import { generateId } from '../utils/helpers';

/**
 * GitHub Parser
 * Accepts CSV or JSON exports of Pull Requests.
 * Normalizes into WorkItems (PRs) and NormalizedEvents (actions).
 */

export function parseGitHubInput(raw: string): RawGitHubData[] {
  const trimmed = raw.trim();

  // Try JSON first
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      // Fall through to CSV
    }
  }

  // Parse as CSV
  const result = Papa.parse<RawGitHubData>(trimmed, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
    transformHeader: (h: string) => h.trim().toLowerCase().replace(/\s+/g, '_'),
  });

  return result.data;
}

export function normalizeGitHub(
  rawData: RawGitHubData[]
): { actors: Actor[]; workItems: WorkItem[]; events: NormalizedEvent[] } {
  const actorMap = new Map<string, Actor>();
  const workItems: WorkItem[] = [];
  const events: NormalizedEvent[] = [];

  for (const pr of rawData) {
    const prNumber = pr.number ?? pr['pull_number' as keyof RawGitHubData] as number;
    const title = pr.title ?? `PR #${prNumber}`;
    const user = String(pr.user ?? pr['author' as keyof RawGitHubData] ?? 'unknown').trim();
    const state = String(pr.state ?? 'open').toLowerCase();
    const createdAt = pr.created_at ?? new Date().toISOString();
    const mergedAt = pr.merged_at;
    const closedAt = pr.closed_at;
    const additions = Number(pr.additions ?? 0);
    const deletions = Number(pr.deletions ?? 0);
    const changedFiles = Number(pr.changed_files ?? pr['files_changed' as keyof RawGitHubData] ?? 1);
    const reviewersStr = String(pr.reviewers ?? pr.requested_reviewers ?? '');

    // Ensure actor exists
    if (!actorMap.has(user)) {
      actorMap.set(user, {
        id: `gh_${user}`,
        display_name: user,
        aliases: [user],
      });
    }

    // Estimate PR size in "points" based on changes
    const totalChanges = additions + deletions;
    const sizeEstimate = totalChanges < 50 ? 1 : totalChanges < 200 ? 2 : totalChanges < 500 ? 3 : 5;

    // Determine status
    let status: WorkItem['status'] = 'IN_PROGRESS';
    if (mergedAt) status = 'DONE';
    else if (closedAt) status = 'DONE';
    else if (state === 'open') status = 'IN_REVIEW';

    const workItemId = `gh_pr_${prNumber ?? generateId()}`;
    workItems.push({
      id: workItemId,
      source_id: String(prNumber),
      source: 'github',
      type: 'PR',
      title,
      size_estimate: sizeEstimate,
      status,
      assignee_id: `gh_${user}`,
      created_at: String(createdAt),
      closed_at: mergedAt ? String(mergedAt) : closedAt ? String(closedAt) : undefined,
      labels: pr.labels ? String(pr.labels).split(',').map(l => l.trim()) : [],
    });

    // PR Opened event
    events.push({
      id: generateId(),
      actor_id: `gh_${user}`,
      event_type: 'PR_OPENED',
      timestamp: String(createdAt),
      work_item_id: workItemId,
      metadata: { additions, deletions, changed_files: changedFiles },
    });

    // PR Merged event
    if (mergedAt) {
      events.push({
        id: generateId(),
        actor_id: `gh_${user}`,
        event_type: 'PR_MERGED',
        timestamp: String(mergedAt),
        work_item_id: workItemId,
        metadata: {},
      });
    }

    // Reviewer events
    if (reviewersStr) {
      const reviewers = reviewersStr.split(/[,;]/).map(r => r.trim()).filter(Boolean);
      for (const reviewer of reviewers) {
        if (!actorMap.has(reviewer)) {
          actorMap.set(reviewer, {
            id: `gh_${reviewer}`,
            display_name: reviewer,
            aliases: [reviewer],
          });
        }
        events.push({
          id: generateId(),
          actor_id: `gh_${reviewer}`,
          event_type: 'CODE_REVIEW',
          timestamp: mergedAt ? String(mergedAt) : String(createdAt),
          work_item_id: workItemId,
          metadata: { review_comments: pr.review_comments ?? 0 },
        });
      }
    }
  }

  return {
    actors: Array.from(actorMap.values()),
    workItems,
    events,
  };
}
