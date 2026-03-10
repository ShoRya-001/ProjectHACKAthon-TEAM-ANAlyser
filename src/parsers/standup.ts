import type { NormalizedEvent, Actor } from '../types/schema';
import { generateId } from '../utils/helpers';

/**
 * Standup Text Parser
 * Rule-based NLP parser for plain-text standup messages.
 * Extracts: actor, blockers, sentiment, and ticket references.
 * 
 * Expected input format (flexible):
 * 
 * @john / John:
 * - Yesterday: Worked on TKT-123
 * - Today: Continue TKT-123, start TKT-456
 * - Blockers: Waiting on API spec from backend team
 * 
 * Also handles freeform text like Slack threads.
 */

interface StandupEntry {
  actor_name: string;
  yesterday: string[];
  today: string[];
  blockers: string[];
  sentiment: number; // -1, 0, +1
  ticket_refs: string[];
  raw_text: string;
}

// Common blocker keywords
const BLOCKER_PATTERNS = [
  /block(?:ed|er|ing)/i,
  /stuck/i,
  /waiting\s+(?:on|for)/i,
  /depend(?:s|ency|ent)/i,
  /can'?t\s+proceed/i,
  /impediment/i,
  /need(?:s)?\s+(?:help|input|approval|review)/i,
  /no\s+progress/i,
  /delayed/i,
];

// Negative sentiment keywords
const NEGATIVE_KEYWORDS = [
  /frustrat/i, /confus/i, /struggle/i, /difficult/i,
  /overwhelm/i, /stress/i, /burn(?:ed)?\s*out/i,
  /exhausted/i, /upset/i, /concern/i, /worry/i, /worried/i,
  /unclear/i, /chaos/i, /broken/i, /failed/i, /failing/i,
];

// Positive sentiment keywords
const POSITIVE_KEYWORDS = [
  /great/i, /awesome/i, /smooth/i, /on\s*track/i,
  /complet(?:ed|e)/i, /shipped/i, /merged/i, /done/i,
  /progress/i, /resolved/i, /unblocked/i, /good/i,
  /excited/i, /confident/i, /happy/i,
];

// Ticket reference pattern (e.g., TKT-123, PROJ-456, #789)
const TICKET_PATTERN = /(?:[A-Z]{2,10}-\d+|#\d+)/g;

// Person header patterns
const PERSON_PATTERNS = [
  /^@?([a-zA-Z][a-zA-Z0-9_.]+)\s*:/m,
  /^([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s*:/m,
  /^\*\*@?([a-zA-Z][a-zA-Z0-9_.]+)\*\*/m,
];

function analyzeSentiment(text: string): number {
  let score = 0;
  const lower = text.toLowerCase();
  
  for (const pat of NEGATIVE_KEYWORDS) {
    if (pat.test(lower)) score -= 1;
  }
  for (const pat of POSITIVE_KEYWORDS) {
    if (pat.test(lower)) score += 1;
  }
  
  if (score > 0) return 1;
  if (score < 0) return -1;
  return 0;
}

function hasBlocker(text: string): boolean {
  return BLOCKER_PATTERNS.some(p => p.test(text));
}

function extractTicketRefs(text: string): string[] {
  const matches = text.match(TICKET_PATTERN);
  return matches ? [...new Set(matches)] : [];
}

export function parseStandupText(text: string): StandupEntry[] {
  const entries: StandupEntry[] = [];
  const trimmed = text.trim();
  if (!trimmed) return entries;

  // Try to split by person headers
  const lines = trimmed.split('\n');
  let currentPerson: string | null = null;
  let currentLines: string[] = [];
  const personBlocks: { name: string; lines: string[] }[] = [];

  for (const line of lines) {
    let matched = false;
    for (const pattern of PERSON_PATTERNS) {
      const m = line.match(pattern);
      if (m) {
        if (currentPerson) {
          personBlocks.push({ name: currentPerson, lines: [...currentLines] });
        }
        currentPerson = m[1].trim();
        currentLines = [line];
        matched = true;
        break;
      }
    }
    if (!matched) {
      currentLines.push(line);
    }
  }
  if (currentPerson) {
    personBlocks.push({ name: currentPerson, lines: currentLines });
  }

  // If no persons found, treat entire text as one entry from "team"
  if (personBlocks.length === 0) {
    personBlocks.push({ name: 'team', lines: lines });
  }

  for (const block of personBlocks) {
    const fullText = block.lines.join('\n');
    const yesterday: string[] = [];
    const today: string[] = [];
    const blockers: string[] = [];
    
    let section: 'general' | 'yesterday' | 'today' | 'blocker' = 'general';

    for (const line of block.lines) {
      const lower = line.toLowerCase().trim();
      
      if (lower.includes('yesterday') || lower.includes('did') || lower.includes('completed') || lower.includes('last')) {
        section = 'yesterday';
        continue;
      }
      if (lower.includes('today') || lower.includes('plan') || lower.includes('will') || lower.includes('next')) {
        section = 'today';
        continue;
      }
      if (lower.includes('blocker') || lower.includes('impediment') || lower.includes('blocked') || lower.includes('issue')) {
        section = 'blocker';
        continue;
      }

      const cleaned = line.replace(/^[\s\-\*•]+/, '').trim();
      if (!cleaned) continue;

      if (section === 'yesterday') yesterday.push(cleaned);
      else if (section === 'today') today.push(cleaned);
      else if (section === 'blocker' || hasBlocker(cleaned)) blockers.push(cleaned);
      else today.push(cleaned); // default to "today"
    }

    // Also scan all lines for implicit blockers
    for (const line of block.lines) {
      const cleaned = line.replace(/^[\s\-\*•]+/, '').trim();
      if (cleaned && hasBlocker(cleaned) && !blockers.includes(cleaned)) {
        blockers.push(cleaned);
      }
    }

    entries.push({
      actor_name: block.name,
      yesterday,
      today,
      blockers,
      sentiment: analyzeSentiment(fullText),
      ticket_refs: extractTicketRefs(fullText),
      raw_text: fullText,
    });
  }

  return entries;
}

export function normalizeStandup(
  entries: StandupEntry[]
): { actors: Actor[]; events: NormalizedEvent[] } {
  const actorMap = new Map<string, Actor>();
  const events: NormalizedEvent[] = [];
  const now = new Date().toISOString();

  for (const entry of entries) {
    const actorId = `standup_${entry.actor_name.replace(/\s+/g, '_').toLowerCase()}`;
    
    if (!actorMap.has(entry.actor_name)) {
      actorMap.set(entry.actor_name, {
        id: actorId,
        display_name: entry.actor_name,
        aliases: [entry.actor_name],
      });
    }

    // Standup update event
    events.push({
      id: generateId(),
      actor_id: actorId,
      event_type: 'STANDUP_UPDATE',
      timestamp: now,
      metadata: {
        yesterday: entry.yesterday,
        today: entry.today,
        ticket_refs: entry.ticket_refs,
        raw_text: entry.raw_text,
      },
    });

    // Blocker events
    for (const blocker of entry.blockers) {
      events.push({
        id: generateId(),
        actor_id: actorId,
        event_type: 'REPORTED_BLOCKER',
        timestamp: now,
        metadata: {
          description: blocker,
          ticket_refs: extractTicketRefs(blocker),
        },
      });
    }

    // Sentiment flag
    if (entry.sentiment !== 0) {
      events.push({
        id: generateId(),
        actor_id: actorId,
        event_type: 'SENTIMENT_FLAG',
        timestamp: now,
        metadata: {
          sentiment: entry.sentiment,
          sentiment_label: entry.sentiment > 0 ? 'positive' : 'negative',
        },
      });
    }
  }

  return {
    actors: Array.from(actorMap.values()),
    events,
  };
}
