import type { RecommendedAction } from '../types/schema';
import { Zap, AlertCircle, GitPullRequest, Truck, Users } from 'lucide-react';

interface ActionsPanelProps {
  actions: RecommendedAction[];
}

const CATEGORY_ICONS = {
  workload: Users,
  blocker: AlertCircle,
  review: GitPullRequest,
  delivery: Truck,
  collaboration: Users,
};

const PRIORITY_STYLES = {
  high: {
    border: 'border-l-red-500',
    badge: 'bg-red-100 text-red-700',
    label: 'High Priority',
  },
  medium: {
    border: 'border-l-amber-500',
    badge: 'bg-amber-100 text-amber-700',
    label: 'Medium',
  },
  low: {
    border: 'border-l-blue-500',
    badge: 'bg-blue-100 text-blue-700',
    label: 'Low',
  },
};

export function ActionsPanel({ actions }: ActionsPanelProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-gray-900">Recommended Actions</h2>
        </div>
        <p className="text-sm text-gray-500 mt-1">Prioritized interventions based on your team's data</p>
      </div>

      <div className="divide-y divide-gray-100">
        {actions.map((action, i) => {
          const priority = PRIORITY_STYLES[action.priority];
          const CategoryIcon = CATEGORY_ICONS[action.category];

          return (
            <div
              key={i}
              className={`px-6 py-4 border-l-4 ${priority.border} hover:bg-gray-50 transition-colors`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 p-1.5 rounded-lg bg-gray-100">
                  <CategoryIcon className="w-4 h-4 text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${priority.badge}`}>
                      {priority.label}
                    </span>
                    <span className="text-xs text-gray-400 capitalize">{action.category}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-900 leading-snug">{action.action}</p>
                  <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{action.rationale}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
