import { useState } from 'react';
import type { Actor } from '../types/schema';
import { Link2, Check, Users } from 'lucide-react';

interface IdentityMapperProps {
  actors: Actor[];
  onConfirm: (mergedActors: Actor[]) => void;
}

interface MergeGroup {
  primary: Actor;
  merged: string[]; // actor ids to merge into primary
}

export function IdentityMapper({ actors, onConfirm }: IdentityMapperProps) {
  const [groups, setGroups] = useState<MergeGroup[]>(() =>
    actors.map(a => ({ primary: a, merged: [] }))
  );
  const [selectedForMerge, setSelectedForMerge] = useState<Set<string>>(new Set());

  const unmergedActors = groups.filter(g =>
    !groups.some(other => other.merged.includes(g.primary.id))
  );

  const toggleSelect = (id: string) => {
    setSelectedForMerge(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const mergeSelected = () => {
    if (selectedForMerge.size < 2) return;

    const selectedIds = Array.from(selectedForMerge);
    const primaryId = selectedIds[0];
    const othersIds = selectedIds.slice(1);

    setGroups(prev => {
      const next = [...prev];
      const primaryGroup = next.find(g => g.primary.id === primaryId);
      if (primaryGroup) {
        // Merge all aliases
        for (const otherId of othersIds) {
          const otherGroup = next.find(g => g.primary.id === otherId);
          if (otherGroup) {
            primaryGroup.primary.aliases = [
              ...new Set([...primaryGroup.primary.aliases, ...otherGroup.primary.aliases]),
            ];
            primaryGroup.merged.push(otherId);
          }
        }
      }
      return next;
    });
    setSelectedForMerge(new Set());
  };

  const handleConfirm = () => {
    const mergedActors = unmergedActors.map(g => g.primary);
    onConfirm(mergedActors);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-amber-600" />
          <h2 className="text-lg font-bold text-gray-900">Identity Mapping</h2>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          We found {actors.length} identities across your data sources. Link matching profiles to get accurate per-person analytics.
        </p>
      </div>

      <div className="p-6">
        {/* Actor list */}
        <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
          {unmergedActors.map(group => {
            const actor = group.primary;
            const isSelected = selectedForMerge.has(actor.id);
            const source = actor.id.startsWith('gh_') ? 'GitHub' : actor.id.startsWith('jira_') ? 'Jira' : 'Standup';
            const sourceColor = actor.id.startsWith('gh_') ? 'bg-gray-800 text-white' : actor.id.startsWith('jira_') ? 'bg-blue-600 text-white' : 'bg-purple-600 text-white';

            return (
              <div
                key={actor.id}
                onClick={() => toggleSelect(actor.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all
                  ${isSelected
                    ? 'border-indigo-300 bg-indigo-50 ring-2 ring-indigo-200'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                  ${isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'}`}
                >
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-gray-900">{actor.display_name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${sourceColor}`}>{source}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    Aliases: {actor.aliases.join(', ')}
                  </div>
                </div>

                {group.merged.length > 0 && (
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                    +{group.merged.length} linked
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <button
            onClick={mergeSelected}
            disabled={selectedForMerge.size < 2}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors
              ${selectedForMerge.size >= 2
                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-300'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            Link Selected ({selectedForMerge.size})
          </button>

          <button
            onClick={handleConfirm}
            className="inline-flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200"
          >
            <Check className="w-4 h-4" />
            Confirm & Analyze
          </button>
        </div>
      </div>
    </div>
  );
}
