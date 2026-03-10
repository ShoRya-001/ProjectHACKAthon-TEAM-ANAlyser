import { useState, useCallback } from 'react';
import { UploadZone } from './components/UploadZone';
import { IdentityMapper } from './components/IdentityMapper';
import { Dashboard } from './components/Dashboard';
import { parseGitHubInput, normalizeGitHub } from './parsers/github';
import { parseJiraInput, normalizeJira } from './parsers/jira';
import { parseStandupText, normalizeStandup } from './parsers/standup';
import { runAnalysis } from './analytics/scoring';
import type { Actor, WorkItem, NormalizedEvent, AnalyticsReport } from './types/schema';
import { Activity, Github, FileText, MessageSquare, BarChart3 } from 'lucide-react';

type AppView = 'upload' | 'identity' | 'dashboard';

interface ParsedData {
  actors: Actor[];
  workItems: WorkItem[];
  events: NormalizedEvent[];
  dataQuality: { has_github: boolean; has_jira: boolean; has_standup: boolean };
}

export function App() {
  const [view, setView] = useState<AppView>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [report, setReport] = useState<AnalyticsReport | null>(null);

  const handleAnalyze = useCallback((githubRaw: string, jiraRaw: string, standupRaw: string) => {
    setIsProcessing(true);

    // Simulate async processing
    setTimeout(() => {
      try {
        const allActors: Actor[] = [];
        const allWorkItems: WorkItem[] = [];
        const allEvents: NormalizedEvent[] = [];
        const hasGithub = githubRaw.trim().length > 0;
        const hasJira = jiraRaw.trim().length > 0;
        const hasStandup = standupRaw.trim().length > 0;

        // Parse GitHub
        if (hasGithub) {
          const rawGH = parseGitHubInput(githubRaw);
          const { actors, workItems, events } = normalizeGitHub(rawGH);
          allActors.push(...actors);
          allWorkItems.push(...workItems);
          allEvents.push(...events);
        }

        // Parse Jira
        if (hasJira) {
          const rawJira = parseJiraInput(jiraRaw);
          const { actors, workItems, events } = normalizeJira(rawJira);
          allActors.push(...actors);
          allWorkItems.push(...workItems);
          allEvents.push(...events);
        }

        // Parse Standup
        if (hasStandup) {
          const entries = parseStandupText(standupRaw);
          const { actors, events } = normalizeStandup(entries);
          allActors.push(...actors);
          allEvents.push(...events);
        }

        // Deduplicate actors by display_name similarity
        const deduped = deduplicateActors(allActors);

        setParsedData({
          actors: deduped,
          workItems: allWorkItems,
          events: allEvents,
          dataQuality: { has_github: hasGithub, has_jira: hasJira, has_standup: hasStandup },
        });

        // If few actors, skip identity mapping
        if (deduped.length <= 3) {
          const analysisReport = runAnalysis(deduped, allWorkItems, allEvents, {
            has_github: hasGithub, has_jira: hasJira, has_standup: hasStandup,
          });
          setReport(analysisReport);
          setView('dashboard');
        } else {
          setView('identity');
        }
      } catch (err) {
        console.error('Analysis error:', err);
        alert('Error processing data. Please check your input format.');
      } finally {
        setIsProcessing(false);
      }
    }, 800);
  }, []);

  const handleIdentityConfirm = useCallback((mergedActors: Actor[]) => {
    if (!parsedData) return;
    setIsProcessing(true);

    setTimeout(() => {
      // Remap events and work items to merged actor IDs
      const aliasMap = new Map<string, string>();
      for (const actor of mergedActors) {
        for (const alias of actor.aliases) {
          // Map various ID patterns to this actor
          aliasMap.set(`gh_${alias}`, actor.id);
          aliasMap.set(`jira_${alias.replace(/\s+/g, '_').toLowerCase()}`, actor.id);
          aliasMap.set(`standup_${alias.replace(/\s+/g, '_').toLowerCase()}`, actor.id);
        }
      }

      const remappedEvents = parsedData.events.map(e => ({
        ...e,
        actor_id: aliasMap.get(e.actor_id) ?? e.actor_id,
      }));

      const remappedWorkItems = parsedData.workItems.map(w => ({
        ...w,
        assignee_id: w.assignee_id ? (aliasMap.get(w.assignee_id) ?? w.assignee_id) : undefined,
      }));

      const analysisReport = runAnalysis(
        mergedActors, remappedWorkItems, remappedEvents, parsedData.dataQuality
      );

      setReport(analysisReport);
      setView('dashboard');
      setIsProcessing(false);
    }, 500);
  }, [parsedData]);

  const handleBack = useCallback(() => {
    setView('upload');
    setReport(null);
    setParsedData(null);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      {/* Nav */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-indigo-600 rounded-lg">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-gray-900 text-sm tracking-tight">
                Eng Health Analytics
              </span>
              <span className="text-[10px] font-medium bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">
                MVP
              </span>
            </div>

            {/* Step indicators */}
            <div className="hidden sm:flex items-center gap-1">
              {[
                { step: 'upload', label: 'Ingest', icon: BarChart3 },
                { step: 'identity', label: 'Map', icon: FileText },
                { step: 'dashboard', label: 'Report', icon: Activity },
              ].map(({ step, label, icon: Icon }, i) => (
                <div key={step} className="flex items-center">
                  {i > 0 && <div className="w-6 h-px bg-gray-300 mx-1" />}
                  <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium
                    ${view === step
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-400'
                    }`}>
                    <Icon className="w-3 h-3" />
                    {label}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="hidden md:inline-flex items-center gap-1"><Github className="w-3 h-3" />GitHub</span>
              <span className="hidden md:inline-flex items-center gap-1"><FileText className="w-3 h-3" />Jira</span>
              <span className="hidden md:inline-flex items-center gap-1"><MessageSquare className="w-3 h-3" />Standups</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {view === 'upload' && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Hero */}
            <div className="text-center py-6">
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                Engineering Team Health Analytics
              </h1>
              <p className="text-gray-500 mt-2 max-w-2xl mx-auto">
                Upload your GitHub PR exports, Jira ticket data, and standup notes.
                Get instant insights on team health, workload distribution, collaboration quality, and delivery risk.
              </p>
            </div>

            <UploadZone onAnalyze={handleAnalyze} isProcessing={isProcessing} />

            {/* How it works */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              {[
                {
                  title: 'Upload Data',
                  desc: 'Paste or upload GitHub PR exports (CSV/JSON), Jira ticket exports, and standup text from Slack.',
                  icon: '📁',
                },
                {
                  title: 'Automatic Analysis',
                  desc: 'Data is normalized, scored for health/workload/collaboration/risk using transparent rules.',
                  icon: '⚡',
                },
                {
                  title: 'Actionable Insights',
                  desc: 'Get a dashboard with KPIs, charts, and 3-5 specific recommended actions for your team.',
                  icon: '🎯',
                },
              ].map((item, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 text-center">
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <h3 className="font-semibold text-gray-900 text-sm">{item.title}</h3>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'identity' && parsedData && (
          <div className="max-w-3xl mx-auto space-y-6">
            <IdentityMapper
              actors={parsedData.actors}
              onConfirm={handleIdentityConfirm}
            />
          </div>
        )}

        {view === 'dashboard' && report && (
          <Dashboard report={report} onBack={handleBack} />
        )}
      </main>
    </div>
  );
}

/**
 * Simple deduplication: merge actors with very similar display names.
 * Full identity resolution would use fuzzy matching + LLM in production.
 */
function deduplicateActors(actors: Actor[]): Actor[] {
  const map = new Map<string, Actor>();

  for (const actor of actors) {
    const key = actor.display_name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (map.has(key)) {
      const existing = map.get(key)!;
      existing.aliases = [...new Set([...existing.aliases, ...actor.aliases])];
    } else {
      map.set(key, { ...actor, aliases: [...actor.aliases] });
    }
  }

  return Array.from(map.values());
}
