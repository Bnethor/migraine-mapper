import { format } from 'date-fns';
import { Calendar, Clock, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { MigraineEntry } from '../../types';
import { EmptyState } from '../../components/common';

// ============================================
// RECENT ENTRIES COMPONENT
// ============================================

interface RecentEntriesProps {
  entries: MigraineEntry[];
}

/**
 * Recent Entries List Component
 * Displays the most recent migraine entries
 */
const RecentEntries = ({ entries }: RecentEntriesProps) => {
  const navigate = useNavigate();

  // Empty state
  if (!entries || entries.length === 0) {
    return (
      <EmptyState
        icon={<Calendar size={48} />}
        title="No entries yet"
        description="Start tracking your migraines by creating your first entry."
        action={{
          label: 'Create Entry',
          onClick: () => navigate('/migraines/new'),
        }}
      />
    );
  }

  // Intensity color mapping
  const getIntensityColor = (intensity: number) => {
    const colors = {
      1: 'bg-green-100 text-green-800',
      2: 'bg-yellow-100 text-yellow-800',
      3: 'bg-orange-100 text-orange-800',
      4: 'bg-red-100 text-red-800',
      5: 'bg-purple-100 text-purple-800',
    };
    return colors[intensity as keyof typeof colors] || colors[3];
  };

  return (
    <div className="divide-y divide-gray-200">
      {entries.map((entry) => (
        <div
          key={entry.id}
          onClick={() => navigate(`/migraines/${entry.id}`)}
          className="py-4 px-2 hover:bg-gray-50 cursor-pointer transition-colors rounded-lg"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              navigate(`/migraines/${entry.id}`);
            }
          }}
        >
          <div className="flex items-start justify-between gap-4">
            {/* Entry Info */}
            <div className="flex-1 space-y-2">
              {/* Date and Time */}
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                <div className="flex items-center gap-1.5">
                  <Calendar size={16} />
                  <span>{format(new Date(entry.date), 'MMM dd, yyyy')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={16} />
                  <span>{entry.startTime}</span>
                  {entry.endTime && <span>- {entry.endTime}</span>}
                </div>
              </div>

              {/* Triggers */}
              {entry.triggers && entry.triggers.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {entry.triggers.slice(0, 3).map((trigger, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-md"
                    >
                      {trigger}
                    </span>
                  ))}
                  {entry.triggers.length > 3 && (
                    <span className="text-xs text-gray-500">
                      +{entry.triggers.length - 3} more
                    </span>
                  )}
                </div>
              )}

              {/* Notes Preview */}
              {entry.notes && (
                <p className="text-sm text-gray-600 line-clamp-1">
                  {entry.notes}
                </p>
              )}
            </div>

            {/* Intensity Badge */}
            <div className="flex-shrink-0">
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${getIntensityColor(
                  entry.intensity
                )}`}
              >
                <Activity size={14} />
                <span className="text-sm font-semibold">{entry.intensity}/5</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RecentEntries;

