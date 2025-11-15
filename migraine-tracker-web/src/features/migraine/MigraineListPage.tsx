import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Activity, FileText } from 'lucide-react';
import { migraineService } from '../../api/migraineService';
import { getWearableData } from '../../api/wearableService';
import { 
  Layout, 
  Card, 
  Button,
  Input,
  Loading,
  ErrorMessage,
  EmptyState 
} from '../../components/common';
import MigraineTable from './MigraineTable';
import WearableDataTable from './WearableDataTable';

// ============================================
// MIGRAINE LIST PAGE
// ============================================

/**
 * Migraine List Page Component
 * Features:
 * - Paginated list of all migraine entries
 * - Search and filter functionality
 * - Data table view
 * - Quick actions
 */
export const MigraineListPage = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'migraines' | 'wearable'>('migraines');

  // Fetch migraine entries
  const { 
    data, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['migraines', page],
    queryFn: () => migraineService.getAll({ page, limit: 10 }),
    enabled: activeTab === 'migraines',
  });

  // Fetch wearable data entries
  const {
    data: wearableData,
    isLoading: wearableLoading,
    error: wearableError,
    refetch: refetchWearable
  } = useQuery({
    queryKey: ['wearable-entries'],
    queryFn: () => getWearableData({ limit: 1000 }),
    enabled: activeTab === 'wearable',
  });

  // Filter entries based on search
  const filteredEntries = data?.data?.filter(entry => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      entry.date.includes(query) ||
      entry.notes?.toLowerCase().includes(query) ||
      entry.triggers?.some(t => t.toLowerCase().includes(query)) ||
      entry.symptoms?.some(s => s.toLowerCase().includes(query))
    );
  }) || [];

  // Loading state
  const currentLoading = activeTab === 'migraines' ? isLoading : wearableLoading;
  const currentError = activeTab === 'migraines' ? error : wearableError;
  const currentRefetch = activeTab === 'migraines' ? refetch : refetchWearable;

  if (currentLoading) {
    return (
      <Layout>
        <Loading fullScreen text="Loading entries..." />
      </Layout>
    );
  }

  // Error state
  if (currentError) {
    return (
      <Layout>
        <ErrorMessage
          title="Failed to load entries"
          message={`There was an error loading your ${activeTab === 'migraines' ? 'migraine' : 'wearable data'} entries.`}
          onRetry={currentRefetch}
        />
      </Layout>
    );
  }

  const wearableEntries = wearableData?.data?.data?.entries || wearableData?.data?.entries || [];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">All Entries</h1>
            <p className="text-gray-600 mt-1">
              {activeTab === 'migraines' 
                ? 'View and manage all your migraine logs' 
                : 'View all your wearable data entries'}
            </p>
          </div>
          {activeTab === 'migraines' && (
            <Button
              variant="primary"
              leftIcon={<Plus size={20} />}
              onClick={() => navigate('/migraines/new')}
            >
              New Entry
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Card padding="none">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('migraines')}
                className={`flex items-center gap-2 px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'migraines'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <FileText size={18} />
                Migraine Logs
                {data?.total && (
                  <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                    {data.total}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('wearable')}
                className={`flex items-center gap-2 px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'wearable'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Activity size={18} />
                Wearable Data
                {wearableEntries.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                    {wearableEntries.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </Card>

        {/* Search and Filters */}
        {activeTab === 'migraines' && (
          <Card padding="md">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="Search entries..."
                  leftIcon={<Search size={20} />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline">
                Filters
              </Button>
            </div>
          </Card>
        )}

        {/* Entries Table */}
        <Card padding="none">
          {activeTab === 'migraines' ? (
            filteredEntries.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title="No entries found"
                  description={
                    searchQuery
                      ? 'Try adjusting your search criteria.'
                      : 'Start tracking your migraines by creating your first entry.'
                  }
                  action={
                    !searchQuery
                      ? {
                          label: 'Create Entry',
                          onClick: () => navigate('/migraines/new'),
                        }
                      : undefined
                  }
                />
              </div>
            ) : (
              <MigraineTable entries={filteredEntries} />
            )
          ) : wearableEntries.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No wearable data found"
                description="Upload CSV files from your wearable devices to see your data here."
                action={{
                  label: 'Upload Data',
                  onClick: () => navigate('/wearable/upload'),
                }}
              />
            </div>
          ) : (
            <WearableDataTable entries={wearableEntries} />
          )}
        </Card>

        {/* Pagination */}
        {activeTab === 'migraines' && data && data.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing page {data.page} of {data.totalPages} ({data.total} total entries)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default MigraineListPage;

