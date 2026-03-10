import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, Cell,
  FunnelChart, Funnel, LabelList,
} from 'recharts';
import type { DeveloperWorkload, BottleneckFunnel, CycleTimePoint } from '../types/schema';
import { BarChart3, GitBranch, Clock } from 'lucide-react';

// ═══════════════════════════════════════════
// WORKLOAD DISTRIBUTION CHART
// ═══════════════════════════════════════════
interface WorkloadChartProps {
  data: DeveloperWorkload[];
}

export function WorkloadChart({ data }: WorkloadChartProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-1">
        <BarChart3 className="w-5 h-5 text-indigo-600" />
        <h3 className="text-lg font-bold text-gray-900">Workload Distribution</h3>
      </div>
      <p className="text-sm text-gray-500 mb-4">Coding vs Review load per developer. Flagged developers are highlighted.</p>

      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="developer"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <Tooltip
            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px' }}
          />
          <Legend
            formatter={(value: string) => value === 'coding_points' ? 'Coding' : 'Reviews'}
            wrapperStyle={{ fontSize: '13px' }}
          />
          <Bar dataKey="coding_points" name="coding_points" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} />
          <Bar dataKey="review_points" name="review_points" stackId="a" fill="#a78bfa" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      {/* Flagged developer callouts */}
      <div className="mt-4 space-y-2">
        {data.filter(d => d.flagged).map((dev, i) => (
          <div key={i} className="flex items-start gap-2 px-3 py-2 bg-red-50 rounded-lg border border-red-100">
            <span className="text-red-500 text-sm mt-0.5">⚠️</span>
            <div>
              <span className="text-sm font-medium text-red-800">{dev.developer}</span>
              <p className="text-xs text-red-600 mt-0.5">{dev.flag_reason}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// BOTTLENECK FUNNEL
// ═══════════════════════════════════════════
interface BottleneckFunnelChartProps {
  data: BottleneckFunnel;
}

const FUNNEL_COLORS = ['#6366f1', '#818cf8', '#a78bfa', '#c4b5fd', '#22c55e'];

export function BottleneckFunnelChart({ data }: BottleneckFunnelChartProps) {
  const funnelData = [
    { name: 'To Do', value: data.todo, fill: FUNNEL_COLORS[0] },
    { name: 'In Progress', value: data.in_progress, fill: FUNNEL_COLORS[1] },
    { name: 'Code Review', value: data.in_review, fill: FUNNEL_COLORS[2] },
    { name: 'QA', value: data.qa, fill: FUNNEL_COLORS[3] },
    { name: 'Done', value: data.done, fill: FUNNEL_COLORS[4] },
  ];

  // Find bottleneck (largest non-done stage)
  const stages = funnelData.slice(0, 4);
  const maxStage = stages.reduce((a, b) => a.value > b.value ? a : b, stages[0]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-1">
        <GitBranch className="w-5 h-5 text-indigo-600" />
        <h3 className="text-lg font-bold text-gray-900">Workflow Funnel</h3>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Items across workflow stages.
        {maxStage.value > 3 && (
          <span className="text-amber-600 font-medium"> Bottleneck detected: {maxStage.name} ({maxStage.value} items)</span>
        )}
      </p>

      <ResponsiveContainer width="100%" height={300}>
        <FunnelChart>
          <Tooltip
            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px' }}
          />
          <Funnel dataKey="value" data={funnelData} isAnimationActive>
            <LabelList position="right" fill="#374151" stroke="none" fontSize={13} />
            <LabelList position="center" fill="#fff" stroke="none" fontSize={12} dataKey="name" />
          </Funnel>
        </FunnelChart>
      </ResponsiveContainer>

      {/* Stage breakdown */}
      <div className="grid grid-cols-5 gap-2 mt-2">
        {funnelData.map((stage, i) => (
          <div key={i} className="text-center">
            <div className="text-lg font-bold" style={{ color: stage.fill }}>{stage.value}</div>
            <div className="text-xs text-gray-500">{stage.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// CYCLE TIME SCATTER PLOT
// ═══════════════════════════════════════════
interface CycleTimeChartProps {
  data: CycleTimePoint[];
}

export function CycleTimeChart({ data }: CycleTimeChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-bold text-gray-900">Cycle Time</h3>
        </div>
        <p className="text-sm text-gray-400 mt-4 text-center py-8">
          No merged PRs with cycle time data available.
        </p>
      </div>
    );
  }

  const outliers = data.filter(d => d.is_outlier);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-1">
        <Clock className="w-5 h-5 text-indigo-600" />
        <h3 className="text-lg font-bold text-gray-900">Cycle Time</h3>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        PR Size vs Time to Merge. Red dots are outliers (small PRs taking too long).
      </p>

      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="size"
            name="Size"
            type="number"
            tick={{ fontSize: 12, fill: '#6b7280' }}
          />
          <YAxis
            dataKey="hours_to_merge"
            name="Hours"
            type="number"
            tick={{ fontSize: 12, fill: '#6b7280' }}
          />
          <Tooltip
            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px' }}
          />
          <Scatter data={data}>
            {data.map((entry, idx) => (
              <Cell key={idx} fill={entry.is_outlier ? '#ef4444' : '#6366f1'} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>

      {outliers.length > 0 && (
        <div className="mt-3 space-y-1">
          {outliers.map((o, i) => (
            <div key={i} className="text-xs bg-red-50 text-red-700 rounded px-3 py-1.5 border border-red-100">
              🚩 <strong>PR #{o.pr_id}</strong>: &ldquo;{o.title}&rdquo; — small PR ({o.size}pts) took {o.hours_to_merge}h to merge. Investigate delays.
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
