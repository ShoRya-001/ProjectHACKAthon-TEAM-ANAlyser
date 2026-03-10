import { useState, useCallback, useRef } from 'react';
import { Upload, FileText, MessageSquare, Github, CheckCircle2, X, Sparkles } from 'lucide-react';
import { SAMPLE_GITHUB_CSV, SAMPLE_JIRA_CSV, SAMPLE_STANDUP_TEXT } from '../data/sample';

interface UploadZoneProps {
  onAnalyze: (github: string, jira: string, standup: string) => void;
  isProcessing: boolean;
}

type TabType = 'github' | 'jira' | 'standup';

export function UploadZone({ onAnalyze, isProcessing }: UploadZoneProps) {
  const [activeTab, setActiveTab] = useState<TabType>('github');
  const [githubData, setGithubData] = useState('');
  const [jiraData, setJiraData] = useState('');
  const [standupData, setStandupData] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasGithub = githubData.trim().length > 0;
  const hasJira = jiraData.trim().length > 0;
  const hasStandup = standupData.trim().length > 0;
  const hasAnyData = hasGithub || hasJira || hasStandup;

  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) readFile(file);
  }, [activeTab]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) readFile(file);
  }, [activeTab]);

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (activeTab === 'github') setGithubData(text);
      else if (activeTab === 'jira') setJiraData(text);
      else setStandupData(text);
    };
    reader.readAsText(file);
  };

  const loadDemo = () => {
    setGithubData(SAMPLE_GITHUB_CSV);
    setJiraData(SAMPLE_JIRA_CSV);
    setStandupData(SAMPLE_STANDUP_TEXT);
  };

  const getCurrentData = () => {
    if (activeTab === 'github') return githubData;
    if (activeTab === 'jira') return jiraData;
    return standupData;
  };

  const setCurrentData = (val: string) => {
    if (activeTab === 'github') setGithubData(val);
    else if (activeTab === 'jira') setJiraData(val);
    else setStandupData(val);
  };

  const tabs = [
    { id: 'github' as const, label: 'GitHub PRs', icon: Github, hasData: hasGithub, placeholder: 'Paste GitHub PR export (CSV or JSON)...\n\nExpected columns: number, title, user, state, created_at, merged_at, additions, deletions, reviewers...' },
    { id: 'jira' as const, label: 'Jira Tickets', icon: FileText, hasData: hasJira, placeholder: 'Paste Jira ticket export (CSV or JSON)...\n\nExpected columns: key, summary, status, assignee, story_points, created, resolved, flagged...' },
    { id: 'standup' as const, label: 'Standups', icon: MessageSquare, hasData: hasStandup, placeholder: 'Paste standup notes or Slack thread...\n\nFormat:\nJohn:\n- Yesterday: Worked on TKT-123\n- Today: Continue TKT-123\n- Blockers: Waiting on API spec' },
  ];

  const currentTab = tabs.find(t => t.id === activeTab)!;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Upload className="w-5 h-5 text-indigo-600" />
              Data Ingestion
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">Upload or paste your GitHub, Jira, and standup data</p>
          </div>
          <button
            onClick={loadDemo}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Load Demo Data
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative
              ${activeTab === tab.id
                ? 'text-indigo-600 bg-indigo-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.hasData && (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            )}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Drop zone */}
        <div
          onDrop={handleFileDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors mb-4"
        >
          <Upload className="w-6 h-6 text-gray-400 mx-auto mb-1" />
          <p className="text-sm text-gray-500">
            Drop a file here or <span className="text-indigo-600 font-medium">browse</span>
          </p>
          <p className="text-xs text-gray-400 mt-0.5">CSV, JSON, or TXT</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Text area */}
        <div className="relative">
          <textarea
            value={getCurrentData()}
            onChange={(e) => setCurrentData(e.target.value)}
            placeholder={currentTab.placeholder}
            className="w-full h-48 px-4 py-3 text-sm font-mono bg-gray-50 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder:text-gray-400"
          />
          {getCurrentData() && (
            <button
              onClick={() => setCurrentData('')}
              className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 bg-white rounded shadow-sm"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status indicators */}
        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-3 flex-1">
            {tabs.map(tab => (
              <div
                key={tab.id}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${
                  tab.hasData
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-gray-50 text-gray-400 border border-gray-200'
                }`}
              >
                {tab.hasData ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : (
                  <div className="w-3 h-3 rounded-full border-2 border-gray-300" />
                )}
                {tab.label}
              </div>
            ))}
          </div>

          <button
            onClick={() => onAnalyze(githubData, jiraData, standupData)}
            disabled={!hasAnyData || isProcessing}
            className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all
              ${hasAnyData && !isProcessing
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Analyze Team Health
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
