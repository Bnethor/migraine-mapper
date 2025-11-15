import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { migraineService } from '../../api/migraineService';
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

  // Fetch migraine entries
  const { 
    data, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['migraines', page],
    queryFn: () => migraineService.getAll({ page, limit: 10 }),
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
  if (isLoading) {
    return (
      <Layout>
        <Loading fullScreen text="Loading entries..." />
      </Layout>
    );
  }

  // Error state
  if (error) {
    return (
      <Layout>
        <ErrorMessage
          title="Failed to load entries"
          message="There was an error loading your migraine entries."
          onRetry={refetch}
        />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">All Entries</h1>
            <p className="text-gray-600 mt-1">
              View and manage all your migraine logs
            </p>
          </div>
          <Button
            variant="primary"
            leftIcon={<Plus size={20} />}
            onClick={() => navigate('/migraines/new')}
          >
            New Entry
          </Button>
        </div>

        {/* Search and Filters */}
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

        {/* Entries Table */}
        <Card padding="none">
          {filteredEntries.length === 0 ? (
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
          )}
        </Card>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
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

