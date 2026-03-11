# PulseBoard — Engineering Team Health Analytics

> Upload GitHub, Jira, and Standup data → Get team health scores, workload insights, and actionable manager recommendations in under 2 minutes.

![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3.x-06B6D4?logo=tailwindcss)
![Recharts](https://img.shields.io/badge/Recharts-2.x-FF6B6B)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 🎯 Problem

Engineering managers spend **4–6 hours/week** manually cross-referencing GitHub PRs, Jira tickets, and Slack standups to assess team health. Critical signals — burnout, bottlenecks, blocked work, scope creep — go undetected until it's too late (sprint failure, attrition, missed deadlines).

**PulseBoard** automates this entirely.

---

## ✨ What It Does

| Input | → | Output |
|-------|---|--------|
| GitHub PR export (CSV/JSON) | → | **Team Health Score** (0–100) with contributing factors |
| Jira ticket export (CSV/JSON) | → | **Workload Imbalance** detection with per-developer Z-scores |
| Standup text (plain text paste) | → | **Collaboration Quality** score with review speed analysis |
| | → | **Delivery Risk** percentage with scope creep tracking |
| | → | **3–5 Recommended Actions** with priority and rationale |
| | → | **Interactive Charts** (workload bars, bottleneck funnel, cycle time scatter) |

---

## 🖥️ Screenshots

### Upload Screen
Three input zones for GitHub, Jira, and Standup data with drag-and-drop support and a "Load Demo Data" button for instant testing.

### Executive Dashboard
Four color-coded KPI scorecards (Green/Amber/Red) with expandable contributing factors, an AI-generated narrative summary, and a prioritized actions panel.

### Deep Dive Charts
- **Workload Distribution**: Stacked bar chart showing coding vs reviewing load per developer
- **Bottleneck Funnel**: Pipeline visualization (To Do → In Progress → In Review → QA → Done)
- **Cycle Time Scatter**: PR size vs time-to-merge with outlier detection

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    DATA INGESTION                        │
│                                                          │
│   GitHub CSV/JSON    Jira CSV/JSON    Standup Text       │
│        │                  │                │             │
│        ▼                  ▼                ▼             │
│   ┌──────────┐     ┌──────────┐     ┌──────────────┐    │
│   │ GitHub   │     │  Jira    │     │  Standup NLP │    │
│   │ Parser   │     │  Parser  │     │  Parser      │    │
│   └────┬─────┘     └────┬─────┘     └──────┬───────┘    │
│        │                │                   │            │
│        ▼                ▼                   ▼            │
│   ┌──────────────────────────────────────────────┐       │
│   │         CANONICAL EVENT SCHEMA               │       │
│   │   Actor │ WorkItem │ NormalizedEvent          │       │
│   └─────────────────────┬────────────────────────┘       │
│                         │                                │
│              ┌──────────┼──────────┐                     │
│              ▼          ▼          ▼                     │
│   ┌────────────┐ ┌───────────┐ ┌──────────────┐         │
│   │ Identity   │ │ Scoring   │ │ Recommendation│         │
│   │ Mapper     │ │ Engine    │ │ Engine        │         │
│   └────────────┘ └─────┬─────┘ └──────┬───────┘         │
│                        │              │                  │
│                        ▼              ▼                  │
│              ┌───────────────────────────────┐           │
│              │      DASHBOARD UI             │           │
│              │  KPIs + Charts + Actions      │           │
│              └───────────────────────────────┘           │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Scoring Methodology

All scores are **fully explainable** — each returns contributing factors that users can inspect.

### 1. Team Health (0–100)
```
Score = 100 - BlockedTimePenalty - WIPLimitPenalty - AgingPenalty

BlockedTimePenalty = (% of sprint time items spent BLOCKED) × 100
WIPLimitPenalty    = 15 points if (Active Tasks / Developers) > 2.5
AgingPenalty       = 2 points per item older than 7 days in same status

Thresholds: 🟢 >80 | 🟡 60–80 | 🔴 <60
```

### 2. Workload Imbalance (0–100)
```
Gini Coefficient calculated across developer workloads (story points + PRs)
Per-developer Z-scores computed against team mean

Flags:
  - Z-score > 1.5 → Amber (overloaded)
  - Z-score > 2.0 → Red (burnout risk)
  - Review Load > 40% for one person → Bottleneck flag

Score = Gini × 100 (higher = more unequal)
Thresholds: 🟢 <30 | 🟡 30–55 | 🔴 >55
```

### 3. Collaboration Quality (0–100)
```
Score = ReviewSpeed × 0.4 + ReviewCoverage × 0.4 + StandupSentiment × 0.2

ReviewSpeed:    100 if avg < 4hrs, scales to 0 if > 24hrs
ReviewCoverage: % of PRs that received at least 1 review
Sentiment:      NLP-extracted from standup text (-1 to +1, normalized to 0–100)

Thresholds: 🟢 >75 | 🟡 50–75 | 🔴 <50
```

### 4. Delivery Risk (0–100%)
```
Score = (1 - CompletionRate) × 50 + ScopeCreep% × 30 + BlockerImpact

CompletionRate = Completed Points / Total Committed Points
ScopeCreep     = Points Added After Sprint Start / Initial Points
BlockerImpact  = Number of Blocked Items × 0.4 (capped contribution)

Thresholds: 🟢 <30% | 🟡 30–60% | 🔴 >60%
```

---

## 🔧 Recommendation Engine

Six rule-based triggers generate prioritized actions:

| # | Rule | Priority | Trigger |
|---|------|----------|---------|
| 1 | Review Redistribution | 🔴 HIGH | Developer review load > 40% |
| 2 | Burnout Prevention | 🔴 HIGH | Developer Z-score > 2.0 |
| 3 | Blocker Resolution | 🔴 HIGH | WorkItems with BLOCKED status |
| 4 | Standup/Jira Mismatch | 🟡 MEDIUM | Blocker reported in standup but not in Jira |
| 5 | Scope Descoping | 🟡 MEDIUM | Delivery risk amber/red + >3 TODO items |
| 6 | Collaboration Sync | 🟡 MEDIUM | Collaboration score amber/red |

Each recommendation includes:
- **Action**: Specific, actionable instruction (e.g., "Redistribute 2 PRs from John to Sarah")
- **Rationale**: Why this matters (e.g., "John handles 63% of reviews — single point of failure")
- **Category**: WORKLOAD / PROCESS / COLLABORATION / DELIVERY

Minimum 3 actions guaranteed via fallback rules.

---

## 🗂️ Project Structure

```
/
├── src/
│   ├── types/
│   │   └── schema.ts            # All TypeScript interfaces & types
│   │                              # Actor, WorkItem, NormalizedEvent,
│   │                              # ScoreResult, AnalyticsReport, etc.
│   │
│   ├── parsers/
│   │   ├── github.ts            # GitHub CSV/JSON → WorkItems + Events
│   │   │                          # Handles: PR opened/merged/reviewed
│   │   │                          # Extracts: cycle time, review counts
│   │   │
│   │   ├── jira.ts              # Jira CSV/JSON → WorkItems + Events
│   │   │                          # Handles: status transitions, blockers
│   │   │                          # Imputes missing story points (team avg)
│   │   │
│   │   └── standup.ts           # Plain text → NormalizedEvents
│   │                              # NLP extraction: blockers, sentiment,
│   │                              # ticket refs, actor identification
│   │
│   ├── analytics/
│   │   └── scoring.ts           # Core scoring engine
│   │                              # - calculateTeamHealth()
│   │                              # - calculateWorkloadImbalance()
│   │                              # - calculateCollaborationQuality()
│   │                              # - calculateDeliveryRisk()
│   │                              # - generateNarrative()
│   │                              # - generateRecommendations()
│   │                              # Helper: giniCoefficient(), zScores()
│   │
│   ├── data/
│   │   └── sample.ts            # Demo dataset (8 PRs, 12 tickets,
│   │                              # 5-person standup thread)
│   │
│   ├── components/
│   │   ├── UploadZone.tsx       # Drag-drop file upload + text paste
│   │   │                          # Supports: .csv, .json, plain text
│   │   │                          # "Load Demo Data" functionality
│   │   │
│   │   ├── IdentityMapper.tsx   # Cross-source identity linking UI
│   │   │                          # Links git usernames ↔ Jira IDs
│   │   │
│   │   ├── Dashboard.tsx        # Main report layout container
│   │   │                          # Orchestrates all dashboard sections
│   │   │
│   │   ├── KPICard.tsx          # Expandable scorecard component
│   │   │                          # Shows: score, status, progress bar
│   │   │                          # Expands: contributing factors list
│   │   │
│   │   ├── ActionsPanel.tsx     # Recommended actions with priority
│   │   │                          # badges, categories, and rationale
│   │   │
│   │   └── Charts.tsx           # Three Recharts visualizations:
│   │                              # - WorkloadChart (stacked bar)
│   │                              # - BottleneckFunnel (bar chart)
│   │                              # - CycleTimeScatter (scatter plot)
│   │
│   ├── App.tsx                  # Main app: 3-step flow
│   │                              # Upload → Identity Map → Dashboard
│   │
│   ├── main.tsx                 # React entry point
│   └── index.css                # Tailwind directives + custom styles
│
├── test-data/                    # Test datasets for validation
│   ├── mixed-signal-github.csv   # 8 PRs with mixed merge times
│   ├── mixed-signal-jira.csv     # 12 tickets (blocked, done, creep)
│   ├── mixed-signal-standup.txt  # 5-person standup with blockers
│   └── EXPECTED-RESULTS.md       # Expected score ranges & verification
│
├── index.html                    # Entry HTML
├── package.json                  # Dependencies
├── vite.config.ts                # Vite configuration
├── tailwind.config.js            # Tailwind configuration
├── tsconfig.json                 # TypeScript configuration
└── README.md                     # This file
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm

### Installation & Development
```bash
# Clone the repository
git clone https://github.com/your-username/pulseboard.git
cd pulseboard

# Install dependencies
npm install

# Start development server
npm run dev
# → Opens at http://localhost:5173

# Build for production
npm run build
# → Output in dist/
```

### Quick Demo
1. Open the app in your browser
2. Click **"Load Demo Data"** (pre-populates all three data sources)
3. Click **"Analyze Team Health"**
4. Explore the dashboard: expand KPI cards, read actions, interact with charts

### Using Your Own Data

**GitHub Export (CSV format):**
```csv
pr_number,title,author,status,created_at,merged_at,reviewers,additions,deletions
101,Add auth middleware,jdoe,merged,2025-06-10T09:00:00Z,2025-06-11T14:00:00Z,"sarah;mike",145,23
```

**Jira Export (CSV format):**
```csv
key,summary,assignee,status,priority,story_points,created,resolved,labels,sprint
TKT-101,User login flow,jdoe,Done,High,5,2025-06-09,2025-06-14,feature,Sprint 12
```

**Standup Text (plain text):**
```
John: Yesterday I worked on the auth service. Today I'll fix the login bug.
Blocked on TKT-105, waiting for API team response.

Sarah: Reviewed 3 PRs yesterday. Today finishing the dashboard component.
No blockers.
```

---

## 📐 Canonical Data Schema

### Actor
```typescript
interface Actor {
  id: string;
  display_name: string;
  aliases: string[];        // ["jdoe", "john.doe@company.com", "John Doe"]
  source_ids: {
    github?: string;        // GitHub username
    jira?: string;          // Jira account ID
    standup?: string;       // Name as appears in standups
  };
}
```

### WorkItem
```typescript
interface WorkItem {
  id: string;
  source: 'github' | 'jira';
  source_id: string;        // "PR-101" or "TKT-201"
  type: 'PR' | 'STORY' | 'BUG' | 'TASK' | 'EPIC';
  title: string;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'QA' | 'DONE' | 'BLOCKED';
  size_estimate: number;    // Story points (imputed if missing)
  assignee_id: string;
  created_at: string;
  closed_at?: string;
  metadata: Record<string, any>;
}
```

### NormalizedEvent
```typescript
interface NormalizedEvent {
  id: string;
  actor_id: string;
  event_type: 'PR_OPENED' | 'PR_MERGED' | 'CODE_REVIEW' | 'COMMENT' |
              'STATUS_CHANGE' | 'BLOCKED' | 'UNBLOCKED' | 'SCOPE_ADDED' |
              'REPORTED_BLOCKER' | 'SENTIMENT_FLAG';
  timestamp: string;
  work_item_id?: string;
  source: 'github' | 'jira' | 'standup';
  metadata: Record<string, any>;
}
```

---

## 🧪 Testing

### Test Data
The `test-data/` directory contains a **mixed-signal dataset** designed to produce amber scores across all four KPIs:

| File | Contents |
|------|----------|
| `mixed-signal-github.csv` | 8 PRs: mix of fast (2hr) and slow (72hr) merges, review bottleneck on jdoe |
| `mixed-signal-jira.csv` | 12 tickets: 3 Done, 2 Blocked, 3 scope-creep additions, missing story points |
| `mixed-signal-standup.txt` | 5 developers: 1 frustrated (Emily), 5 blocker reports, Jira mismatches |

### Expected Results
See `test-data/EXPECTED-RESULTS.md` for detailed score expectations:

| KPI | Expected Range | Expected Status |
|-----|---------------|-----------------|
| Team Health | 55–70 | Amber 🟡 |
| Workload Imbalance | 35–55 | Amber 🟡 |
| Collaboration Quality | 60–78 | Amber 🟡 |
| Delivery Risk | 45–65 | Amber 🟡 |

### Verification Checklist
- [ ] All 4 scores fall within expected ranges
- [ ] John Doe flagged for review bottleneck (>40% review load)
- [ ] At least 1 "Standup/Jira mismatch" action generated
- [ ] Blocked items (TKT-102, TKT-108) appear in recommended actions
- [ ] Bottleneck funnel shows In Review as largest stage
- [ ] Workload chart shows John with highest review bar

---

## 🔮 Roadmap

### v1.0 (Current MVP)
- [x] Manual file upload (CSV/JSON) and text paste
- [x] GitHub PR parser with cycle time extraction
- [x] Jira ticket parser with status normalization
- [x] Standup NLP parser (rule-based: blockers, sentiment, ticket refs)
- [x] 4 KPI scoring algorithms with explainable factors
- [x] 6-rule recommendation engine with priority and rationale
- [x] Interactive dashboard with 3 chart types
- [x] Identity mapping UI for cross-source user linking
- [x] Demo data for instant testing

### v2.0 (Planned)
- [ ] **GitHub OAuth Integration** — Live PR data sync via GitHub API
- [ ] **Jira OAuth Integration** — Live ticket sync via Jira Cloud REST API
- [ ] **FastAPI Python Backend** — Move analytics to server-side with PostgreSQL persistence
- [ ] **OpenAI GPT-4o-mini** — Advanced standup parsing with forced JSON schema output
- [ ] **Historical Trends** — Multi-sprint comparison charts and trend lines
- [ ] **Multi-Team Views** — Aggregate dashboards for CTO/VP Engineering

### v3.0 (Future)
- [ ] Slack/Microsoft Teams bot (auto-ingest standup channels)
- [ ] SSO / SAML enterprise authentication
- [ ] Automated weekly email digest reports
- [ ] Predictive burnout modeling using historical patterns
- [ ] Custom scoring rule configuration per organization
- [ ] Webhook integrations for real-time event streaming

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18 + TypeScript | Component-based UI |
| Build Tool | Vite 6 | Fast HMR and optimized builds |
| Styling | Tailwind CSS 3 | Utility-first responsive design |
| Charts | Recharts 2 | Interactive data visualizations |
| Icons | Lucide React | Consistent icon system |
| Analytics | Custom TypeScript | Statistical scoring (Gini, Z-scores) |
| NLP | Rule-based parser | Sentiment, blocker, and entity extraction |

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

**Built with ❤️ for engineering managers who care about their teams.**
