import type { ScoreResult } from '../types/schema';
import { Activity, Users, GitPullRequest, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface KPICardProps {
  title: string;
  result: ScoreResult;
  icon: 'health' | 'workload' | 'collaboration' | 'risk';
  invertScore?: boolean; // for scores where higher = worse
  suffix?: string;
}

const STATUS_COLORS = {
  green: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-800' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500', badge: 'bg-amber-100 text-amber-800' },
  red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', dot: 'bg-red-500', badge: 'bg-red-100 text-red-800' },
};

const ICONS = {
  health: Activity,
  workload: Users,
  collaboration: GitPullRequest,
  risk: AlertTriangle,
};

export function KPICard({ title, result, icon, invertScore, suffix = '/100' }: KPICardProps) {
  const [expanded, setExpanded] = useState(false);
  const colors = STATUS_COLORS[result.status];
  const Icon = ICONS[icon];
  const displayScore = Math.round(result.score);
  const statusLabel = result.status === 'green' ? 'Healthy' : result.status === 'amber' ? 'Warning' : 'Critical';

  return (
    <div className={`rounded-xl border-2 ${colors.border} ${colors.bg} p-5 transition-all duration-200 hover:shadow-md`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${colors.badge}`}>
            <Icon className="w-4 h-4" />
          </div>
          <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${colors.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`}></span>
          {statusLabel}
        </span>
      </div>

      <div className="flex items-baseline gap-1 mb-3">
        <span className={`text-3xl font-bold ${colors.text}`}>
          {invertScore ? `${displayScore}%` : displayScore}
        </span>
        {!invertScore && <span className="text-sm text-gray-500">{suffix}</span>}
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-gray-200 rounded-full mb-3 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            result.status === 'green' ? 'bg-emerald-500' :
            result.status === 'amber' ? 'bg-amber-500' : 'bg-red-500'
          }`}
          style={{ width: `${Math.min(displayScore, 100)}%` }}
        />
      </div>

      {/* Expandable factors */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
      >
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {result.factors.length} contributing factors
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          {result.factors.map((factor, i) => (
            <div key={i} className="text-xs bg-white/60 rounded-lg p-2.5 border border-gray-200/50">
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-gray-700">{factor.name}</span>
                <span className="font-mono text-gray-500">
                  {typeof factor.value === 'number' ? factor.value.toFixed(1) : factor.value}
                </span>
              </div>
              <p className="text-gray-500 leading-relaxed">{factor.impact}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
