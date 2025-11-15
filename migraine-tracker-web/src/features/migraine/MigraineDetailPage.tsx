import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Calendar, 
  Clock,
  Activity,
  MapPin,
  Pill,
  AlertCircle,
  FileText 
} from 'lucide-react';
import { useState } from 'react';
import { migraineService } from '../../api/migraineService';
import { 
  Layout, 
  Card,
  CardHeader,
  CardTitle,
  Button,
  Loading,
  ErrorMessage,
  ConfirmDialog 
} from '../../components/common';

// ============================================
// MIGRAINE DETAIL PAGE
// ============================================

/**
 * Migraine Detail Page Component
 * Displays full details of a single migraine entry
 */
export const MigraineDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Fetch entry details
  const { 
    data: entry, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['migraine', id],
    queryFn: () => migraineService.getById(id!),
    enabled: !!id,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => migraineService.delete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['migraines'] });
      queryClient.invalidateQueries({ queryKey: ['migraine-stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-migraines'] });
      navigate('/migraines');
    },
  });

  // Loading state
  if (isLoading) {
    return (
      <Layout>
        <Loading fullScreen text="Loading entry..." />
      </Layout>
    );
  }

  // Error state
  if (error || !entry) {
    return (
      <Layout>
        <ErrorMessage
          title="Entry not found"
          message="The migraine entry you're looking for could not be found."
          onRetry={() => navigate('/migraines')}
        />
      </Layout>
    );
  }

  // Intensity color mapping
  const getIntensityColor = (intensity: number) => {
    const colors = {
      1: 'bg-green-100 text-green-800 border-green-200',
      2: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      3: 'bg-orange-100 text-orange-800 border-orange-200',
      4: 'bg-red-100 text-red-800 border-red-200',
      5: 'bg-purple-100 text-purple-800 border-purple-200',
    };
    return colors[intensity as keyof typeof colors] || colors[3];
  };

  const getIntensityLabel = (intensity: number) => {
    const labels = {
      1: 'Mild',
      2: 'Mild-Moderate',
      3: 'Moderate',
      4: 'Moderate-Severe',
      5: 'Severe',
    };
    return labels[intensity as keyof typeof labels] || 'Unknown';
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<ArrowLeft size={20} />}
              onClick={() => navigate('/migraines')}
            >
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Migraine Entry
              </h1>
              <p className="text-gray-600 mt-1">
                {format(new Date(entry.date), 'MMMM dd, yyyy')}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              leftIcon={<Edit size={20} />}
              onClick={() => navigate(`/migraines/${id}/edit`)}
            >
              Edit
            </Button>
            <Button
              variant="danger"
              leftIcon={<Trash2 size={20} />}
              onClick={() => setShowDeleteDialog(true)}
            >
              Delete
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Date & Time Card */}
            <Card padding="lg">
              <CardHeader>
                <CardTitle>Date & Time</CardTitle>
              </CardHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Calendar className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Date</p>
                    <p className="font-medium text-gray-900">
                      {format(new Date(entry.date), 'EEEE, MMMM dd, yyyy')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Clock className="text-green-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Duration</p>
                    <p className="font-medium text-gray-900">
                      {entry.startTime}
                      {entry.endTime && ` - ${entry.endTime}`}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Triggers Card */}
            {entry.triggers && entry.triggers.length > 0 && (
              <Card padding="lg">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="text-orange-600" size={20} />
                    <CardTitle>Triggers</CardTitle>
                  </div>
                </CardHeader>
                <div className="flex flex-wrap gap-2">
                  {entry.triggers.map((trigger, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg text-sm font-medium border border-orange-200"
                    >
                      {trigger}
                    </span>
                  ))}
                </div>
              </Card>
            )}

            {/* Symptoms Card */}
            {entry.symptoms && entry.symptoms.length > 0 && (
              <Card padding="lg">
                <CardHeader>
                  <CardTitle>Symptoms</CardTitle>
                </CardHeader>
                <div className="flex flex-wrap gap-2">
                  {entry.symptoms.map((symptom, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium border border-purple-200"
                    >
                      {symptom}
                    </span>
                  ))}
                </div>
              </Card>
            )}

            {/* Notes Card */}
            {entry.notes && (
              <Card padding="lg">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <FileText className="text-gray-600" size={20} />
                    <CardTitle>Notes</CardTitle>
                  </div>
                </CardHeader>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {entry.notes}
                </p>
              </Card>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Intensity Card */}
            <Card padding="lg">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Activity className="text-red-600" size={20} />
                  <CardTitle>Intensity</CardTitle>
                </div>
              </CardHeader>
              <div className={`p-4 rounded-lg border-2 text-center ${getIntensityColor(entry.intensity)}`}>
                <p className="text-4xl font-bold mb-1">
                  {entry.intensity}/5
                </p>
                <p className="text-sm font-medium">
                  {getIntensityLabel(entry.intensity)}
                </p>
              </div>
              
              {/* Visual intensity scale */}
              <div className="mt-4 space-y-1">
                {[5, 4, 3, 2, 1].map((level) => (
                  <div
                    key={level}
                    className={`h-2 rounded ${
                      level <= entry.intensity
                        ? 'bg-red-500'
                        : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </Card>

            {/* Location Card */}
            {entry.location && (
              <Card padding="lg">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <MapPin className="text-blue-600" size={20} />
                    <CardTitle>Location</CardTitle>
                  </div>
                </CardHeader>
                <p className="text-gray-900 font-medium capitalize">
                  {entry.location.replace('-', ' ')}
                </p>
              </Card>
            )}

            {/* Medication Card */}
            {entry.medication && (
              <Card padding="lg">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Pill className="text-green-600" size={20} />
                    <CardTitle>Medication</CardTitle>
                  </div>
                </CardHeader>
                <p className="text-gray-900 font-medium">
                  {entry.medication}
                </p>
              </Card>
            )}

            {/* Metadata Card */}
            <Card padding="md" className="bg-gray-50">
              <div className="space-y-2 text-xs text-gray-600">
                <p>
                  <span className="font-medium">Created:</span>{' '}
                  {format(new Date(entry.createdAt), 'MMM dd, yyyy HH:mm')}
                </p>
                <p>
                  <span className="font-medium">Updated:</span>{' '}
                  {format(new Date(entry.updatedAt), 'MMM dd, yyyy HH:mm')}
                </p>
                <p>
                  <span className="font-medium">Entry ID:</span>{' '}
                  {entry.id}
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete Entry"
        message="Are you sure you want to delete this migraine entry? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </Layout>
  );
};

export default MigraineDetailPage;

