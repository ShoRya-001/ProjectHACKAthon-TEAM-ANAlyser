import type { AnalyticsReport } from '../types/schema';
import { KPICard } from './KPICard';
import { ActionsPanel } from './ActionsPanel';
import { WorkloadChart, BottleneckFunnelChart, CycleTimeChart } from './Charts';
import { ArrowLeft, AlertTriangle, Clock, Brain } from 'lucide-react';

interface DashboardProps {
  report: AnalyticsReport;
  onBack: () => void;
}

export function Dashboard({ report, onBack }: DashboardProps) {
  const { summary, narrative, recommended_actions, charts, data_quality } = report;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Upload New Data
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Team Health Report</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Generated {new Date(report.generated_at).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Data Quality Warnings */}
      {data_quality.warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-800">Partial Data</span>
          </div>
          <ul className="space-y-1">
            {data_quality.warnings.map((w, i) => (
              <li key={i} className="text-xs text-amber-700 flex items-start gap-1.5">
                <span className="mt-0.5">•</span>
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* AI Narrative */}
      <div className="bg-gradient-to-r from-indigo-50 via-blue-50 to-purple-50 border border-indigo-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg mt-0.5">
            <Brain className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-indigo-800 mb-1">AI-Generated Summary</h2>
            <p className="text-sm text-gray-700 leading-relaxed">{narrative}</p>
          </div>
        </div>
      </div>

      {/* KPI Scorecards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Team Health"
          result={summary.team_health}
          icon="health"
        />
        <KPICard
          title="Workload Imbalance"
          result={summary.workload_imbalance}
          icon="workload"
          invertScore
          suffix=""
        />
        <KPICard
          title="Collaboration Quality"
          result={summary.collaboration_quality}
          icon="collaboration"
        />
        <KPICard
          title="Delivery Risk"
          result={summary.delivery_risk}
          icon="risk"
          invertScore
          suffix=""
        />
      </div>

      {/* Recommended Actions */}
      <ActionsPanel actions={recommended_actions} />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WorkloadChart data={charts.workload_distribution} />
        <BottleneckFunnelChart data={charts.bottleneck_funnel} />
      </div>

      {/* Cycle Time (full width) */}
      <CycleTimeChart data={charts.cycle_time} />

      {/* Footer */}
      <div className="text-center py-6 text-xs text-gray-400 border-t border-gray-100">
        <div className="flex items-center justify-center gap-1.5 mb-1">
          <Clock className="w-3 h-3" />
          Report ID: {report.report_id}
        </div>
        <p>Engineering Team Health Analytics MVP • All scores are explainable and rule-based</p>
      </div>
    </div>
  );
}
