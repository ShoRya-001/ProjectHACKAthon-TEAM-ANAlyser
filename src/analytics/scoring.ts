import type {
  Actor, WorkItem, NormalizedEvent,
  ScoreResult, ScoringFactor, DeveloperWorkload,
  BottleneckFunnel, CycleTimePoint, AnalyticsReport,
  RecommendedAction,
} from '../types/schema';
import {
  clamp, mean, zScore, giniCoefficient,
  getHealthStatus, getRiskStatus, hoursBetween, generateId,
} from '../utils/helpers';

// ═══════════════════════════════════════════
// 1. TEAM HEALTH SCORE (0-100)
// ═══════════════════════════════════════════
function calculateTeamHealth(
  workItems: WorkItem[],
  events: NormalizedEvent[],
  actors: Actor[]
): ScoreResult {
  const factors: ScoringFactor[] = [];
  const devCount = Math.max(actors.length, 1);
  const totalItems = Math.max(workItems.length, 1);

  // Factor 1: Blocked Time Penalty
  const blockedItems = workItems.filter(w => w.status === 'BLOCKED');
  const blockedEvents = events.filter(e => e.event_type === 'BLOCKED' || e.event_type === 'REPORTED_BLOCKER');
  const blockedRatio = (blockedItems.length + blockedEvents.length * 0.5) / totalItems;
  const blockedPenalty = clamp(blockedRatio * 100, 0, 40);
  factors.push({
    name: 'Blocked Time',
    value: blockedPenalty,
    impact: `${blockedItems.length} items blocked (${(blockedRatio * 100).toFixed(0)}% of total). Each blocked item slows sprint velocity.`,
    weight: 1,
  });

  // Factor 2: WIP Limit Penalty
  const activeItems = workItems.filter(w =>
    w.status === 'IN_PROGRESS' || w.status === 'IN_REVIEW'
  );
  const wipRatio = activeItems.length / devCount;
  const wipPenalty = wipRatio > 2.5 ? 15 : wipRatio > 2.0 ? 8 : 0;
  factors.push({
    name: 'WIP Overload',
    value: wipPenalty,
    impact: `${activeItems.length} active items across ${devCount} devs (${wipRatio.toFixed(1)} per dev). ${wipRatio > 2.5 ? 'Exceeds 2.5 WIP limit — context switching is likely.' : 'Within healthy limits.'}`,
    weight: 1,
  });

  // Factor 3: Aging Penalty (items open > 5 days without progress)
  const now = Date.now();
  const agingItems = workItems.filter(w => {
    if (w.status === 'DONE') return false;
    const created = new Date(w.created_at).getTime();
    const ageDays = (now - created) / (1000 * 60 * 60 * 24);
    return ageDays > 5;
  });
  const agingPenalty = clamp((agingItems.length / totalItems) * 30, 0, 30);
  factors.push({
    name: 'Aging Items',
    value: agingPenalty,
    impact: `${agingItems.length} items have been open for 5+ days. Stale work items often indicate hidden blockers.`,
    weight: 1,
  });

  const score = clamp(100 - blockedPenalty - wipPenalty - agingPenalty, 0, 100);
  return {
    score,
    status: getHealthStatus(score, { green: 80, amber: 60 }),
    factors,
  };
}

// ═══════════════════════════════════════════
// 2. WORKLOAD IMBALANCE (0-100, higher = worse)
// ═══════════════════════════════════════════
function calculateWorkloadImbalance(
  workItems: WorkItem[],
  events: NormalizedEvent[],
  actors: Actor[]
): { score: ScoreResult; distribution: DeveloperWorkload[] } {
  const factors: ScoringFactor[] = [];
  const devWorkload = new Map<string, { coding: number; reviews: number; name: string }>();

  // Initialize all actors
  for (const actor of actors) {
    devWorkload.set(actor.id, { coding: 0, reviews: 0, name: actor.display_name });
  }

  // Count coding points (assigned work items)
  for (const item of workItems) {
    if (item.assignee_id && devWorkload.has(item.assignee_id)) {
      devWorkload.get(item.assignee_id)!.coding += item.size_estimate;
    }
  }

  // Count review points
  const reviewEvents = events.filter(e => e.event_type === 'CODE_REVIEW');
  for (const evt of reviewEvents) {
    if (devWorkload.has(evt.actor_id)) {
      devWorkload.get(evt.actor_id)!.reviews += 1;
    }
  }

  // Calculate workloads
  const totalWorkloads: number[] = [];
  const distribution: DeveloperWorkload[] = [];
  const totalReviews = reviewEvents.length || 1;

  for (const [actorId, data] of devWorkload.entries()) {
    const total = data.coding + data.reviews * 2; // reviews weighted
    totalWorkloads.push(total);

    const reviewLoadPct = (data.reviews / totalReviews) * 100;

    distribution.push({
      developer: data.name,
      actor_id: actorId,
      coding_points: data.coding,
      review_points: data.reviews,
      total_points: total,
      z_score: 0, // calculated below
      review_load_pct: reviewLoadPct,
      flagged: false,
      flag_reason: undefined,
    });
  }

  // Calculate Z-scores and flags
  for (const dev of distribution) {
    dev.z_score = zScore(dev.total_points, totalWorkloads);

    if (dev.z_score > 2.0) {
      dev.flagged = true;
      dev.flag_reason = `High burnout risk: Z-score ${dev.z_score.toFixed(1)} (>2.0). Carrying significantly more work than team average.`;
    } else if (dev.z_score > 1.5) {
      dev.flagged = true;
      dev.flag_reason = `Elevated workload: Z-score ${dev.z_score.toFixed(1)} (>1.5). Monitor closely.`;
    } else if (dev.review_load_pct > 40 && actors.length >= 5) {
      dev.flagged = true;
      dev.flag_reason = `Review bottleneck: Handling ${dev.review_load_pct.toFixed(0)}% of all code reviews.`;
    }
  }

  // Gini coefficient
  const gini = giniCoefficient(totalWorkloads);
  factors.push({
    name: 'Gini Coefficient',
    value: gini,
    impact: `Workload Gini = ${gini.toFixed(2)}. ${gini > 0.4 ? 'High inequality — work is concentrated on few devs.' : gini > 0.2 ? 'Moderate inequality in work distribution.' : 'Healthy work distribution across team.'}`,
    weight: 0.5,
  });

  const flaggedCount = distribution.filter(d => d.flagged).length;
  factors.push({
    name: 'Flagged Developers',
    value: flaggedCount,
    impact: `${flaggedCount} developer(s) flagged for workload concerns.`,
    weight: 0.5,
  });

  // Imbalance score: higher = worse
  const imbalanceScore = clamp(gini * 100 + flaggedCount * 15, 0, 100);
  return {
    score: {
      score: imbalanceScore,
      status: imbalanceScore > 60 ? 'red' : imbalanceScore > 30 ? 'amber' : 'green',
      factors,
    },
    distribution: distribution.sort((a, b) => b.total_points - a.total_points),
  };
}

// ═══════════════════════════════════════════
// 3. COLLABORATION QUALITY (0-100)
// ═══════════════════════════════════════════
function calculateCollaborationQuality(
  events: NormalizedEvent[],
  _workItems: WorkItem[]
): ScoreResult {
  const factors: ScoringFactor[] = [];

  // Factor 1: Review Speed (40% weight)
  const prOpenedEvents = events.filter(e => e.event_type === 'PR_OPENED');
  const reviewEvents = events.filter(e => e.event_type === 'CODE_REVIEW');
  let reviewSpeedScore = 75; // default

  if (prOpenedEvents.length > 0 && reviewEvents.length > 0) {
    const reviewTimes: number[] = [];
    for (const pr of prOpenedEvents) {
      const prReview = reviewEvents.find(r => r.work_item_id === pr.work_item_id);
      if (prReview) {
        const hrs = hoursBetween(pr.timestamp, prReview.timestamp);
        reviewTimes.push(hrs);
      }
    }
    if (reviewTimes.length > 0) {
      const avgReviewTime = mean(reviewTimes);
      if (avgReviewTime < 4) reviewSpeedScore = 100;
      else if (avgReviewTime < 8) reviewSpeedScore = 80;
      else if (avgReviewTime < 16) reviewSpeedScore = 60;
      else if (avgReviewTime < 24) reviewSpeedScore = 40;
      else reviewSpeedScore = 20;

      factors.push({
        name: 'Review Speed',
        value: reviewSpeedScore,
        impact: `Average time-to-first-review: ${avgReviewTime.toFixed(1)}hrs. ${avgReviewTime < 4 ? 'Excellent!' : avgReviewTime > 24 ? 'PRs waiting too long.' : 'Acceptable but can improve.'}`,
        weight: 0.4,
      });
    }
  } else {
    factors.push({
      name: 'Review Speed',
      value: reviewSpeedScore,
      impact: 'Insufficient PR data to calculate review speed. Using default score.',
      weight: 0.4,
    });
  }

  // Factor 2: Review Depth (40% weight)
  const reviewDepthScore = reviewEvents.length > 0
    ? clamp(Math.min(reviewEvents.length / Math.max(prOpenedEvents.length, 1), 1) * 100, 0, 100)
    : 50;
  factors.push({
    name: 'Review Coverage',
    value: reviewDepthScore,
    impact: `${reviewEvents.length} reviews for ${prOpenedEvents.length} PRs. ${reviewEvents.length >= prOpenedEvents.length ? 'Good coverage.' : 'Some PRs lack reviews.'}`,
    weight: 0.4,
  });

  // Factor 3: Standup Sentiment (20% weight)
  const sentimentEvents = events.filter(e => e.event_type === 'SENTIMENT_FLAG');
  let sentimentScore = 70; // neutral default
  if (sentimentEvents.length > 0) {
    const sentiments = sentimentEvents.map(e => Number(e.metadata.sentiment ?? 0));
    const avgSentiment = mean(sentiments);
    sentimentScore = clamp((avgSentiment + 1) * 50, 0, 100); // map [-1,1] to [0,100]
    factors.push({
      name: 'Team Sentiment',
      value: sentimentScore,
      impact: `Average standup sentiment: ${avgSentiment > 0 ? 'Positive' : avgSentiment < 0 ? 'Negative — potential frustration' : 'Neutral'}. Based on ${sentimentEvents.length} sentiment signals.`,
      weight: 0.2,
    });
  } else {
    factors.push({
      name: 'Team Sentiment',
      value: sentimentScore,
      impact: 'No standup sentiment data available. Using neutral baseline.',
      weight: 0.2,
    });
  }

  const score = clamp(
    reviewSpeedScore * 0.4 + reviewDepthScore * 0.4 + sentimentScore * 0.2,
    0, 100
  );

  return {
    score,
    status: getHealthStatus(score, { green: 75, amber: 50 }),
    factors,
  };
}

// ═══════════════════════════════════════════
// 4. DELIVERY RISK (0-100%, higher = worse)
// ═══════════════════════════════════════════
function calculateDeliveryRisk(
  workItems: WorkItem[],
  events: NormalizedEvent[]
): ScoreResult {
  const factors: ScoringFactor[] = [];
  const jiraItems = workItems.filter(w => w.source === 'jira' || w.source === 'github');
  const totalItems = Math.max(jiraItems.length, 1);

  // Factor 1: Completion rate
  const doneItems = jiraItems.filter(w => w.status === 'DONE');
  const totalPoints = jiraItems.reduce((s, w) => s + w.size_estimate, 0) || 1;
  const donePoints = doneItems.reduce((s, w) => s + w.size_estimate, 0);
  const completionRatio = donePoints / totalPoints;

  factors.push({
    name: 'Completion Rate',
    value: completionRatio * 100,
    impact: `${donePoints.toFixed(0)}/${totalPoints.toFixed(0)} points completed (${(completionRatio * 100).toFixed(0)}%). ${completionRatio > 0.7 ? 'On track.' : completionRatio > 0.4 ? 'Behind schedule.' : 'Significantly behind.'}`,
    weight: 0.5,
  });

  // Factor 2: Scope Creep (estimate from recent tickets)
  const ticketCreatedEvents = events.filter(e => e.event_type === 'TICKET_CREATED');
  const recentCreations = ticketCreatedEvents.length;
  const scopeCreepRatio = totalItems > 5 ? clamp(recentCreations / totalItems - 0.2, 0, 1) : 0;
  factors.push({
    name: 'Scope Creep',
    value: scopeCreepRatio * 100,
    impact: `${recentCreations} new items detected. Scope creep factor: ${(scopeCreepRatio * 100).toFixed(0)}%.${scopeCreepRatio > 0.3 ? ' High scope change increases delivery risk.' : ''}`,
    weight: 0.3,
  });

  // Factor 3: Blocker Impact
  const blockerEvents = events.filter(e => e.event_type === 'BLOCKED' || e.event_type === 'REPORTED_BLOCKER');
  const blockerImpact = clamp((blockerEvents.length / totalItems) * 100, 0, 50);
  factors.push({
    name: 'Active Blockers',
    value: blockerImpact,
    impact: `${blockerEvents.length} blocker events detected. ${blockerEvents.length > 3 ? 'Multiple blockers threaten sprint delivery.' : 'Manageable blocker load.'}`,
    weight: 0.2,
  });

  const riskScore = clamp(
    (1 - completionRatio) * 50 + scopeCreepRatio * 30 + blockerImpact * 0.4,
    0, 100
  );

  return {
    score: riskScore,
    status: getRiskStatus(riskScore),
    factors,
  };
}

// ═══════════════════════════════════════════
// BOTTLENECK FUNNEL
// ═══════════════════════════════════════════
function calculateBottleneckFunnel(workItems: WorkItem[]): BottleneckFunnel {
  const funnel: BottleneckFunnel = { todo: 0, in_progress: 0, in_review: 0, qa: 0, done: 0 };
  for (const item of workItems) {
    switch (item.status) {
      case 'TODO': funnel.todo++; break;
      case 'IN_PROGRESS': funnel.in_progress++; break;
      case 'IN_REVIEW': funnel.in_review++; break;
      case 'QA': funnel.qa++; break;
      case 'DONE': funnel.done++; break;
      case 'BLOCKED': funnel.in_progress++; break; // count blocked as in-progress
    }
  }
  return funnel;
}

// ═══════════════════════════════════════════
// CYCLE TIME SCATTER
// ═══════════════════════════════════════════
function calculateCycleTime(workItems: WorkItem[], actors: Actor[]): CycleTimePoint[] {
  const actorMap = new Map(actors.map(a => [a.id, a.display_name]));
  const points: CycleTimePoint[] = [];
  const prs = workItems.filter(w => w.source === 'github' && w.closed_at);

  const cycleTimes: number[] = [];
  for (const pr of prs) {
    const hrs = hoursBetween(pr.created_at, pr.closed_at!);
    cycleTimes.push(hrs);
  }

  const avgCycle = mean(cycleTimes);

  for (const pr of prs) {
    const hrs = hoursBetween(pr.created_at, pr.closed_at!);
    const isOutlier = hrs > avgCycle * 2 && pr.size_estimate <= 2;
    points.push({
      pr_id: pr.source_id,
      title: pr.title,
      size: pr.size_estimate,
      hours_to_merge: Math.round(hrs * 10) / 10,
      author: actorMap.get(pr.assignee_id ?? '') ?? 'unknown',
      is_outlier: isOutlier,
    });
  }

  return points;
}

// ═══════════════════════════════════════════
// RECOMMENDATION ENGINE
// ═══════════════════════════════════════════
function generateRecommendations(
  _teamHealth: ScoreResult,
  _imbalance: ScoreResult,
  distribution: DeveloperWorkload[],
  collaboration: ScoreResult,
  deliveryRisk: ScoreResult,
  events: NormalizedEvent[],
  workItems: WorkItem[]
): RecommendedAction[] {
  const actions: RecommendedAction[] = [];

  // Workload rebalancing
  const flaggedDevs = distribution.filter(d => d.flagged);
  const lightDevs = distribution.filter(d => d.z_score < -0.5);

  for (const dev of flaggedDevs) {
    if (dev.review_load_pct > 40) {
      const target = lightDevs[0]?.developer ?? 'another team member';
      actions.push({
        priority: 'high',
        action: `Redistribute code reviews from '${dev.developer}' (${dev.review_load_pct.toFixed(0)}% of all reviews) to '${target}'.`,
        rationale: `${dev.developer} is a review bottleneck. This concentration delays PR turnaround for the entire team.`,
        category: 'review',
      });
    } else if (dev.z_score > 2.0) {
      actions.push({
        priority: 'high',
        action: `Reduce assigned work for '${dev.developer}' — burnout risk detected (Z-score: ${dev.z_score.toFixed(1)}).`,
        rationale: `This developer is carrying ${dev.total_points} points, significantly above team average. Consider redistributing ${Math.ceil(dev.coding_points * 0.3)} points to balance the load.`,
        category: 'workload',
      });
    }
  }

  // Blocker resolution
  const blockedItems = workItems.filter(w => w.status === 'BLOCKED');

  for (const item of blockedItems.slice(0, 2)) {
    actions.push({
      priority: 'high',
      action: `Investigate '${item.title}' (${item.source_id}) — currently blocked.`,
      rationale: `Blocked items directly reduce team velocity. Created ${new Date(item.created_at).toLocaleDateString()}.`,
      category: 'blocker',
    });
  }

  // Standup vs Jira mismatch
  const standupBlockers = events.filter(e =>
    e.event_type === 'REPORTED_BLOCKER' && e.metadata.description
  );
  for (const blocker of standupBlockers.slice(0, 1)) {
    const refs = (blocker.metadata.ticket_refs as string[]) ?? [];
    if (refs.length > 0) {
      const ticketRef = refs[0];
      const matchingItem = workItems.find(w => w.source_id === ticketRef);
      if (matchingItem && matchingItem.status !== 'BLOCKED') {
        actions.push({
          priority: 'medium',
          action: `Cross-reference: '${ticketRef}' reported as blocked in standup but shows '${matchingItem.status}' in Jira.`,
          rationale: `Jira status may be stale. Verify with the assignee and update the ticket status.`,
          category: 'blocker',
        });
      }
    }
  }

  // Delivery risk
  if (deliveryRisk.status === 'red' || deliveryRisk.status === 'amber') {
    const todoItems = workItems.filter(w => w.status === 'TODO');
    if (todoItems.length > 3) {
      actions.push({
        priority: deliveryRisk.status === 'red' ? 'high' : 'medium',
        action: `Consider descoping: ${todoItems.length} items still in 'To Do'. Prioritize the top 3 by business value.`,
        rationale: `Delivery risk is ${deliveryRisk.score.toFixed(0)}%. Reducing scope now improves chances of hitting sprint goals.`,
        category: 'delivery',
      });
    }
  }

  // Collaboration improvement
  if (collaboration.status === 'red' || collaboration.status === 'amber') {
    actions.push({
      priority: 'medium',
      action: 'Schedule a mid-sprint team sync to discuss PR review practices and unblock stalled reviews.',
      rationale: `Collaboration quality is ${collaboration.score.toFixed(0)}/100. Improving review speed and coverage will reduce cycle time.`,
      category: 'collaboration',
    });
  }

  // Ensure at least 3 actions
  if (actions.length < 3) {
    if (!actions.find(a => a.category === 'delivery')) {
      actions.push({
        priority: 'low',
        action: 'Review sprint burndown in next standup and identify any items at risk of not completing.',
        rationale: 'Proactive sprint monitoring helps catch delivery risks early.',
        category: 'delivery',
      });
    }
    if (!actions.find(a => a.category === 'collaboration')) {
      actions.push({
        priority: 'low',
        action: 'Encourage pair programming or mob reviews for complex PRs to distribute knowledge.',
        rationale: 'Distributing review load builds team resilience and reduces bus factor.',
        category: 'collaboration',
      });
    }
    if (actions.length < 3) {
      actions.push({
        priority: 'low',
        action: 'Document team decisions and blockers in a shared sprint log for visibility.',
        rationale: 'Transparency reduces hidden blockers and improves async collaboration.',
        category: 'collaboration',
      });
    }
  }

  return actions.slice(0, 5);
}

// ═══════════════════════════════════════════
// NARRATIVE GENERATION
// ═══════════════════════════════════════════
function generateNarrative(
  teamHealth: ScoreResult,
  imbalance: ScoreResult,
  collaboration: ScoreResult,
  deliveryRisk: ScoreResult,
  distribution: DeveloperWorkload[],
  funnel: BottleneckFunnel
): string {
  const parts: string[] = [];

  // Overall assessment
  const scores = [teamHealth.score, 100 - imbalance.score, collaboration.score, 100 - deliveryRisk.score];
  const avgHealth = mean(scores);
  if (avgHealth >= 75) {
    parts.push('Your team is performing well overall.');
  } else if (avgHealth >= 55) {
    parts.push('Your team shows mixed signals — some areas need attention.');
  } else {
    parts.push('Your team is showing significant stress signals across multiple dimensions.');
  }

  // Specific callouts
  const flaggedDevs = distribution.filter(d => d.flagged);
  if (flaggedDevs.length > 0) {
    const names = flaggedDevs.map(d => d.developer).join(', ');
    parts.push(`${names} ${flaggedDevs.length === 1 ? 'is' : 'are'} carrying an outsized share of the workload.`);
  }

  // Review bottleneck
  const topReviewer = distribution.reduce((a, b) =>
    a.review_load_pct > b.review_load_pct ? a : b
  , distribution[0]);
  if (topReviewer && topReviewer.review_load_pct > 35) {
    parts.push(`${topReviewer.developer} is handling ${topReviewer.review_load_pct.toFixed(0)}% of code reviews — this creates a single point of failure for PR throughput.`);
  }

  // Funnel bottleneck
  const funnelMax = Math.max(funnel.todo, funnel.in_progress, funnel.in_review, funnel.qa);
  if (funnel.in_review === funnelMax && funnel.in_review > 3) {
    parts.push(`Code Review is the current bottleneck with ${funnel.in_review} items queued.`);
  } else if (funnel.qa === funnelMax && funnel.qa > 3) {
    parts.push(`QA is the current bottleneck with ${funnel.qa} items waiting for testing.`);
  }

  // Delivery
  if (deliveryRisk.status === 'red') {
    parts.push('Sprint delivery is at high risk — consider descoping or reprioritizing immediately.');
  } else if (deliveryRisk.status === 'amber') {
    parts.push('Sprint delivery risk is moderate — close monitoring recommended.');
  }

  return parts.join(' ');
}

// ═══════════════════════════════════════════
// MAIN ANALYSIS PIPELINE
// ═══════════════════════════════════════════
export function runAnalysis(
  actors: Actor[],
  workItems: WorkItem[],
  events: NormalizedEvent[],
  dataQuality: { has_github: boolean; has_jira: boolean; has_standup: boolean }
): AnalyticsReport {
  const teamHealth = calculateTeamHealth(workItems, events, actors);
  const { score: workloadImbalance, distribution } = calculateWorkloadImbalance(workItems, events, actors);
  const collaborationQuality = calculateCollaborationQuality(events, workItems);
  const deliveryRisk = calculateDeliveryRisk(workItems, events);
  const funnel = calculateBottleneckFunnel(workItems);
  const cycleTime = calculateCycleTime(workItems, actors);

  const narrative = generateNarrative(
    teamHealth, workloadImbalance, collaborationQuality,
    deliveryRisk, distribution, funnel
  );

  const recommendedActions = generateRecommendations(
    teamHealth, workloadImbalance, distribution,
    collaborationQuality, deliveryRisk, events, workItems
  );

  const warnings: string[] = [];
  if (!dataQuality.has_github) warnings.push('No GitHub data — collaboration and cycle time metrics may be incomplete.');
  if (!dataQuality.has_jira) warnings.push('No Jira data — delivery risk and team health use limited signals.');
  if (!dataQuality.has_standup) warnings.push('No standup data — sentiment analysis unavailable.');

  return {
    report_id: `rep_${generateId()}`,
    generated_at: new Date().toISOString(),
    summary: {
      team_health: teamHealth,
      workload_imbalance: workloadImbalance,
      collaboration_quality: collaborationQuality,
      delivery_risk: deliveryRisk,
    },
    narrative,
    recommended_actions: recommendedActions,
    charts: {
      workload_distribution: distribution,
      bottleneck_funnel: funnel,
      cycle_time: cycleTime,
    },
    data_quality: {
      ...dataQuality,
      warnings,
    },
  };
}
