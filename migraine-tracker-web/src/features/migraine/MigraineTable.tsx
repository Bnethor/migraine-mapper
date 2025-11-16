import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Edit, Trash2, Eye, Activity } from 'lucide-react';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { migraineService } from '../../api/migraineService';
import { Button, ConfirmDialog } from '../../components/common';
import type { MigraineEntry } from '../../types';

// ============================================
// MIGRAINE TABLE COMPONENT
// ============================================

interface MigraineTableProps {
  entries: MigraineEntry[];
}

/**
 * Migraine Table Component
 * Displays migraine entries in a responsive table
 */
const MigraineTable = ({ entries }: MigraineTableProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => migraineService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['migraines'] });
      queryClient.invalidateQueries({ queryKey: ['migraine-stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-migraines'] });
      setDeleteId(null);
    },
  });

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
    <>
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Intensity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Triggers
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {entries.map((entry) => (
              <tr 
                key={entry.id}
                className="hover:bg-gray-50 dark:bg-gray-800 transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                  {format(new Date(entry.date), 'MMM dd, yyyy')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                  {entry.startTime}
                  {entry.endTime && ` - ${entry.endTime}`}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getIntensityColor(entry.intensity)}`}>
                    <Activity size={12} />
                    {entry.intensity}/5
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                  {entry.triggers && entry.triggers.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {entry.triggers.slice(0, 2).map((trigger, index) => (
                        <span
                          key={index}
                          className="inline-block px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                        >
                          {trigger}
                        </span>
                      ))}
                      {entry.triggers.length > 2 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          +{entry.triggers.length - 2}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 capitalize">
                  {entry.location?.replace('-', ' ') || '—'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => navigate(`/migraines/${entry.id}`)}
                      className="text-primary-600 hover:text-primary-900 p-1 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                      aria-label="View details"
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      onClick={() => navigate(`/migraines/${entry.id}/edit`)}
                      className="text-blue-600 hover:text-blue-900 p-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label="Edit entry"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => setDeleteId(entry.id)}
                      className="text-red-600 hover:text-red-900 p-1 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                      aria-label="Delete entry"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden divide-y divide-gray-200">
        {entries.map((entry) => (
          <div key={entry.id} className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {format(new Date(entry.date), 'MMM dd, yyyy')}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {entry.startTime}
                  {entry.endTime && ` - ${entry.endTime}`}
                </p>
              </div>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getIntensityColor(entry.intensity)}`}>
                <Activity size={12} />
                {entry.intensity}/5
              </span>
            </div>

            {entry.triggers && entry.triggers.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {entry.triggers.map((trigger, index) => (
                  <span
                    key={index}
                    className="inline-block px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                  >
                    {trigger}
                  </span>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Eye size={16} />}
                onClick={() => navigate(`/migraines/${entry.id}`)}
              >
                View
              </Button>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Edit size={16} />}
                onClick={() => navigate(`/migraines/${entry.id}/edit`)}
              >
                Edit
              </Button>
              <Button
                variant="danger"
                size="sm"
                leftIcon={<Trash2 size={16} />}
                onClick={() => setDeleteId(entry.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete Entry"
        message="Are you sure you want to delete this migraine entry? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </>
  );
};

export default MigraineTable;

