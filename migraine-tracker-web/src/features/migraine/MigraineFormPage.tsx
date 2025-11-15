import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import { migraineService } from '../../api/migraineService';
import { 
  Layout, 
  Card, 
  Input, 
  Button,
  ErrorMessage,
  Loading 
} from '../../components/common';
import type { CreateMigraineEntry } from '../../types';

// ============================================
// MIGRAINE FORM PAGE
// ============================================

/**
 * Form validation schema
 */
const migraineSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().optional(),
  intensity: z.number().min(1).max(5),
  triggers: z.string().optional(),
  symptoms: z.string().optional(),
  medication: z.string().optional(),
  notes: z.string().optional(),
  location: z.enum([
    'frontal',
    'temporal',
    'occipital',
    'whole-head',
    'left-side',
    'right-side',
  ]).optional(),
});

type MigraineFormData = z.infer<typeof migraineSchema>;

/**
 * Migraine Form Page Component
 * Handles both create and edit operations
 */
export const MigraineFormPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  
  const isEditMode = !!id;

  // Fetch existing entry if in edit mode
  const { data: existingEntry, isLoading: loadingEntry } = useQuery({
    queryKey: ['migraine', id],
    queryFn: () => migraineService.getById(id!),
    enabled: isEditMode,
  });

  // Form setup
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<MigraineFormData>({
    resolver: zodResolver(migraineSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      intensity: 3,
    },
  });

  // Populate form with existing data in edit mode
  useEffect(() => {
    if (existingEntry) {
      reset({
        date: existingEntry.date,
        startTime: existingEntry.startTime,
        endTime: existingEntry.endTime || '',
        intensity: existingEntry.intensity,
        triggers: existingEntry.triggers?.join(', ') || '',
        symptoms: existingEntry.symptoms?.join(', ') || '',
        medication: existingEntry.medication || '',
        notes: existingEntry.notes || '',
        location: existingEntry.location,
      });
    }
  }, [existingEntry, reset]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateMigraineEntry) => migraineService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['migraines'] });
      queryClient.invalidateQueries({ queryKey: ['migraine-stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-migraines'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] }); // Update calendar
      navigate('/migraines');
    },
    onError: (err: any) => {
      setError(err?.message || 'Failed to create entry');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: CreateMigraineEntry) => 
      migraineService.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['migraines'] });
      queryClient.invalidateQueries({ queryKey: ['migraine', id] });
      queryClient.invalidateQueries({ queryKey: ['migraine-stats'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] }); // Update calendar
      navigate(`/migraines/${id}`);
    },
    onError: (err: any) => {
      setError(err?.message || 'Failed to update entry');
    },
  });

  // Handle form submission
  const onSubmit = (data: MigraineFormData) => {
    setError(null);

    // Transform form data
    const formattedData: CreateMigraineEntry = {
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime || undefined,
      intensity: data.intensity as 1 | 2 | 3 | 4 | 5,
      triggers: data.triggers 
        ? data.triggers.split(',').map(t => t.trim()).filter(Boolean)
        : undefined,
      symptoms: data.symptoms
        ? data.symptoms.split(',').map(s => s.trim()).filter(Boolean)
        : undefined,
      medication: data.medication || undefined,
      notes: data.notes || undefined,
      location: data.location,
    };

    if (isEditMode) {
      updateMutation.mutate(formattedData);
    } else {
      createMutation.mutate(formattedData);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  // Loading state for edit mode
  if (isEditMode && loadingEntry) {
    return (
      <Layout>
        <Loading fullScreen text="Loading entry..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<ArrowLeft size={20} />}
            onClick={() => navigate(-1)}
          >
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isEditMode ? 'Edit Migraine Entry' : 'New Migraine Entry'}
            </h1>
            <p className="text-gray-600 mt-1">
              {isEditMode 
                ? 'Update your migraine details' 
                : 'Log a new migraine episode'}
            </p>
          </div>
        </div>

        {/* Form Card */}
        <Card padding="lg">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Error Message */}
            {error && (
              <ErrorMessage
                variant="banner"
                message={error}
                onDismiss={() => setError(null)}
              />
            )}

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                {...register('date')}
                type="date"
                label="Date"
                error={errors.date?.message}
                disabled={isLoading}
                required
              />
              <Input
                {...register('startTime')}
                type="time"
                label="Start Time"
                error={errors.startTime?.message}
                disabled={isLoading}
                required
              />
              <Input
                {...register('endTime')}
                type="time"
                label="End Time (Optional)"
                error={errors.endTime?.message}
                disabled={isLoading}
              />
            </div>

            {/* Intensity Slider */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pain Intensity <span className="text-red-500">*</span>
              </label>
              <Controller
                name="intensity"
                control={control}
                render={({ field }) => (
                  <div className="space-y-2">
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="1"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                      disabled={isLoading}
                    />
                    <div className="flex justify-between text-sm">
                      <span className={field.value === 1 ? 'font-bold text-primary-600' : 'text-gray-500'}>
                        1 - Mild
                      </span>
                      <span className={field.value === 2 ? 'font-bold text-primary-600' : 'text-gray-500'}>
                        2
                      </span>
                      <span className={field.value === 3 ? 'font-bold text-primary-600' : 'text-gray-500'}>
                        3 - Moderate
                      </span>
                      <span className={field.value === 4 ? 'font-bold text-primary-600' : 'text-gray-500'}>
                        4
                      </span>
                      <span className={field.value === 5 ? 'font-bold text-primary-600' : 'text-gray-500'}>
                        5 - Severe
                      </span>
                    </div>
                  </div>
                )}
              />
              {errors.intensity && (
                <p className="mt-1 text-sm text-red-600">{errors.intensity.message}</p>
              )}
            </div>

            {/* Pain Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pain Location
              </label>
              <select
                {...register('location')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
                disabled={isLoading}
              >
                <option value="">Select location</option>
                <option value="frontal">Frontal (Forehead)</option>
                <option value="temporal">Temporal (Temples)</option>
                <option value="occipital">Occipital (Back of head)</option>
                <option value="whole-head">Whole Head</option>
                <option value="left-side">Left Side</option>
                <option value="right-side">Right Side</option>
              </select>
            </div>

            {/* Triggers */}
            <Input
              {...register('triggers')}
              label="Triggers (Optional)"
              placeholder="e.g., stress, lack of sleep, bright lights (comma-separated)"
              helperText="Separate multiple triggers with commas"
              error={errors.triggers?.message}
              disabled={isLoading}
            />

            {/* Symptoms */}
            <Input
              {...register('symptoms')}
              label="Symptoms (Optional)"
              placeholder="e.g., nausea, sensitivity to light, aura (comma-separated)"
              helperText="Separate multiple symptoms with commas"
              error={errors.symptoms?.message}
              disabled={isLoading}
            />

            {/* Medication */}
            <Input
              {...register('medication')}
              label="Medication Taken (Optional)"
              placeholder="e.g., Ibuprofen 400mg"
              error={errors.medication?.message}
              disabled={isLoading}
            />

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Additional Notes (Optional)
              </label>
              <textarea
                {...register('notes')}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
                placeholder="Any additional details about this episode..."
                disabled={isLoading}
              />
              {errors.notes && (
                <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                leftIcon={<Save size={20} />}
                isLoading={isLoading}
                disabled={isLoading}
              >
                {isEditMode ? 'Update Entry' : 'Save Entry'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </Layout>
  );
};

export default MigraineFormPage;

