import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { User, Save } from 'lucide-react';
import { profileService } from '../../api/profileService';
import { 
  Layout, 
  Card, 
  Button,
  ErrorMessage,
  Loading 
} from '../../components/common';
import { ButtonGroup, ToggleButton } from '../../components/form';
import type { UserProfile } from '../../types';

// Form validation schema
const profileSchema = z.object({
  typicalDuration: z.number().min(1).max(3).optional(),
  monthlyFrequency: z.number().min(1).max(8).optional(),
  typicalPainLocation: z.number().min(0).max(2).optional(),
  typicalPainCharacter: z.number().min(0).max(2).optional(),
  typicalPainIntensity: z.number().min(0).max(3).optional(),
  experiencesNausea: z.number().min(0).max(1).optional(),
  experiencesVomit: z.number().min(0).max(1).optional(),
  experiencesPhonophobia: z.number().min(0).max(1).optional(),
  experiencesPhotophobia: z.number().min(0).max(1).optional(),
  typicalVisualSymptoms: z.number().min(0).max(4).optional(),
  typicalSensorySymptoms: z.number().min(0).max(2).optional(),
  experiencesDysphasia: z.number().min(0).max(1).optional(),
  experiencesDysarthria: z.number().min(0).max(1).optional(),
  experiencesVertigo: z.number().min(0).max(1).optional(),
  experiencesTinnitus: z.number().min(0).max(1).optional(),
  experiencesHypoacusis: z.number().min(0).max(1).optional(),
  experiencesDiplopia: z.number().min(0).max(1).optional(),
  experiencesDefect: z.number().min(0).max(1).optional(),
  experiencesAtaxia: z.number().min(0).max(1).optional(),
  experiencesConscience: z.number().min(0).max(1).optional(),
  experiencesParesthesia: z.number().min(0).max(1).optional(),
  familyHistory: z.number().min(0).max(1).optional(),
  diagnosedType: z.enum([
    'typical-aura-with-migraine',
    'migraine-without-aura',
    'typical-aura-without-migraine',
    'familial-hemiplegic-migraine',
    'sporadic-hemiplegic-migraine',
    'basilar-type-aura',
    'other',
  ]).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export const ProfilePage = () => {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch existing profile
  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => profileService.getProfile(),
  });

  // Form setup
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  // Populate form with existing data
  useEffect(() => {
    if (profile) {
      reset({
        typicalDuration: profile.typicalDuration,
        monthlyFrequency: profile.monthlyFrequency,
        typicalPainLocation: profile.typicalPainLocation,
        typicalPainCharacter: profile.typicalPainCharacter,
        typicalPainIntensity: profile.typicalPainIntensity,
        experiencesNausea: profile.experiencesNausea,
        experiencesVomit: profile.experiencesVomit,
        experiencesPhonophobia: profile.experiencesPhonophobia,
        experiencesPhotophobia: profile.experiencesPhotophobia,
        typicalVisualSymptoms: profile.typicalVisualSymptoms,
        typicalSensorySymptoms: profile.typicalSensorySymptoms,
        experiencesDysphasia: profile.experiencesDysphasia,
        experiencesDysarthria: profile.experiencesDysarthria,
        experiencesVertigo: profile.experiencesVertigo,
        experiencesTinnitus: profile.experiencesTinnitus,
        experiencesHypoacusis: profile.experiencesHypoacusis,
        experiencesDiplopia: profile.experiencesDiplopia,
        experiencesDefect: profile.experiencesDefect,
        experiencesAtaxia: profile.experiencesAtaxia,
        experiencesConscience: profile.experiencesConscience,
        experiencesParesthesia: profile.experiencesParesthesia,
        familyHistory: profile.familyHistory,
        diagnosedType: profile.diagnosedType,
      });
    }
  }, [profile, reset]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<UserProfile>) => profileService.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      // Also invalidate dashboard to update notification
      queryClient.invalidateQueries({ queryKey: ['migraine-stats'] });
      setSuccess(true);
      setError(null);
      setTimeout(() => setSuccess(false), 3000);
    },
    onError: (err: any) => {
      setError(err?.message || 'Failed to update profile');
      setSuccess(false);
    },
  });

  // Handle form submission
  const onSubmit = (data: ProfileFormData) => {
    setError(null);
    updateMutation.mutate(data as any);
  };

  const isLoading = updateMutation.isPending;

  if (loadingProfile) {
    return (
      <Layout>
        <Loading fullScreen text="Loading profile..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <User size={32} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Clinical Profile
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Your typical migraine characteristics for better tracking
            </p>
          </div>
        </div>

        {/* Form Card */}
        <Card padding="lg">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Success/Error Messages */}
            {success && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-green-800 dark:text-green-300 font-medium">
                  ✓ Profile updated successfully!
                </p>
              </div>
            )}
            
            {error && (
              <ErrorMessage
                variant="banner"
                message={error}
                onDismiss={() => setError(null)}
              />
            )}

            {/* Episode Characteristics */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">
                Typical Episode Characteristics
              </h2>
              
              <Controller
                name="typicalDuration"
                control={control}
                render={({ field }) => (
                  <ButtonGroup
                    label="Typical Duration (Days)"
                    value={field.value}
                    onChange={field.onChange}
                    options={[
                      { value: 1, label: '1 Day' },
                      { value: 2, label: '2 Days' },
                      { value: 3, label: '3 Days' },
                    ]}
                    disabled={isLoading}
                  />
                )}
              />

              <Controller
                name="monthlyFrequency"
                control={control}
                render={({ field }) => (
                  <ButtonGroup
                    label="Monthly Frequency"
                    value={field.value}
                    onChange={field.onChange}
                    options={[
                      { value: 1, label: '1' },
                      { value: 2, label: '2' },
                      { value: 3, label: '3' },
                      { value: 4, label: '4' },
                      { value: 5, label: '5' },
                      { value: 6, label: '6' },
                      { value: 7, label: '7' },
                      { value: 8, label: '8+' },
                    ]}
                    disabled={isLoading}
                  />
                )}
              />
            </div>

            {/* Pain Characteristics */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">
                Typical Pain Characteristics
              </h2>
              
              <Controller
                name="typicalPainLocation"
                control={control}
                render={({ field }) => (
                  <ButtonGroup
                    label="Typical Pain Location"
                    value={field.value}
                    onChange={field.onChange}
                    options={[
                      { value: 0, label: 'None' },
                      { value: 1, label: 'Unilateral (One Side)' },
                      { value: 2, label: 'Bilateral (Both Sides)' },
                    ]}
                    disabled={isLoading}
                  />
                )}
              />

              <Controller
                name="typicalPainCharacter"
                control={control}
                render={({ field }) => (
                  <ButtonGroup
                    label="Typical Pain Character"
                    value={field.value}
                    onChange={field.onChange}
                    options={[
                      { value: 0, label: 'None' },
                      { value: 1, label: 'Throbbing/Pulsating' },
                      { value: 2, label: 'Persistent/Steady' },
                    ]}
                    disabled={isLoading}
                  />
                )}
              />

              <Controller
                name="typicalPainIntensity"
                control={control}
                render={({ field }) => (
                  <ButtonGroup
                    label="Typical Pain Intensity"
                    value={field.value}
                    onChange={field.onChange}
                    options={[
                      { value: 0, label: 'None' },
                      { value: 1, label: 'Mild' },
                      { value: 2, label: 'Moderate' },
                      { value: 3, label: 'Severe' },
                    ]}
                    disabled={isLoading}
                  />
                )}
              />
            </div>

            {/* Common Symptoms */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">
                Common Symptoms You Experience
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Controller
                  name="experiencesNausea"
                  control={control}
                  render={({ field }) => (
                    <ToggleButton
                      label="Nausea"
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isLoading}
                    />
                  )}
                />

                <Controller
                  name="experiencesVomit"
                  control={control}
                  render={({ field }) => (
                    <ToggleButton
                      label="Vomiting"
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isLoading}
                    />
                  )}
                />

                <Controller
                  name="experiencesPhonophobia"
                  control={control}
                  render={({ field }) => (
                    <ToggleButton
                      label="Phonophobia (Sound Sensitivity)"
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isLoading}
                    />
                  )}
                />

                <Controller
                  name="experiencesPhotophobia"
                  control={control}
                  render={({ field }) => (
                    <ToggleButton
                      label="Photophobia (Light Sensitivity)"
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isLoading}
                    />
                  )}
                />
              </div>
            </div>

            {/* Aura Symptoms */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">
                Typical Aura Symptoms
              </h2>
              
              <Controller
                name="typicalVisualSymptoms"
                control={control}
                render={({ field }) => (
                  <ButtonGroup
                    label="Typical Visual Symptoms Count"
                    value={field.value}
                    onChange={field.onChange}
                    options={[
                      { value: 0, label: '0' },
                      { value: 1, label: '1' },
                      { value: 2, label: '2' },
                      { value: 3, label: '3' },
                      { value: 4, label: '4' },
                    ]}
                    disabled={isLoading}
                  />
                )}
              />

              <Controller
                name="typicalSensorySymptoms"
                control={control}
                render={({ field }) => (
                  <ButtonGroup
                    label="Typical Sensory Symptoms Count"
                    value={field.value}
                    onChange={field.onChange}
                    options={[
                      { value: 0, label: '0' },
                      { value: 1, label: '1' },
                      { value: 2, label: '2' },
                    ]}
                    disabled={isLoading}
                  />
                )}
              />
            </div>

            {/* Neurological Symptoms */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">
                Neurological Symptoms You Experience
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Controller
                  name="experiencesDysphasia"
                  control={control}
                  render={({ field }) => (
                    <ToggleButton
                      label="Dysphasia (Speech Difficulty)"
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isLoading}
                    />
                  )}
                />

                <Controller
                  name="experiencesDysarthria"
                  control={control}
                  render={({ field }) => (
                    <ToggleButton
                      label="Dysarthria (Slurred Speech)"
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isLoading}
                    />
                  )}
                />

                <Controller
                  name="experiencesVertigo"
                  control={control}
                  render={({ field }) => (
                    <ToggleButton
                      label="Vertigo (Dizziness)"
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isLoading}
                    />
                  )}
                />

                <Controller
                  name="experiencesTinnitus"
                  control={control}
                  render={({ field }) => (
                    <ToggleButton
                      label="Tinnitus (Ringing in Ears)"
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isLoading}
                    />
                  )}
                />

                <Controller
                  name="experiencesHypoacusis"
                  control={control}
                  render={({ field }) => (
                    <ToggleButton
                      label="Hypoacusis (Hearing Loss)"
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isLoading}
                    />
                  )}
                />

                <Controller
                  name="experiencesDiplopia"
                  control={control}
                  render={({ field }) => (
                    <ToggleButton
                      label="Diplopia (Double Vision)"
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isLoading}
                    />
                  )}
                />

                <Controller
                  name="experiencesDefect"
                  control={control}
                  render={({ field }) => (
                    <ToggleButton
                      label="Visual Field Defect"
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isLoading}
                    />
                  )}
                />

                <Controller
                  name="experiencesAtaxia"
                  control={control}
                  render={({ field }) => (
                    <ToggleButton
                      label="Ataxia (Loss of Coordination)"
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isLoading}
                    />
                  )}
                />

                <Controller
                  name="experiencesConscience"
                  control={control}
                  render={({ field }) => (
                    <ToggleButton
                      label="Compromised Awareness"
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isLoading}
                    />
                  )}
                />

                <Controller
                  name="experiencesParesthesia"
                  control={control}
                  render={({ field }) => (
                    <ToggleButton
                      label="Paresthesia (Tingling/Numbness)"
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isLoading}
                    />
                  )}
                />
              </div>
            </div>

            {/* Family History & Diagnosis */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">
                Additional Information
              </h2>
              
              <Controller
                name="familyHistory"
                control={control}
                render={({ field }) => (
                  <ToggleButton
                    label="Family History of Migraines"
                    value={field.value}
                    onChange={field.onChange}
                    disabled={isLoading}
                    helperText="Do any family members have migraines?"
                  />
                )}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Diagnosed Migraine Type
                </label>
                <select
                  {...register('diagnosedType')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  disabled={isLoading}
                >
                  <option value="">Not diagnosed / Unknown</option>
                  <option value="typical-aura-with-migraine">Typical Aura With Migraine</option>
                  <option value="migraine-without-aura">Migraine Without Aura</option>
                  <option value="typical-aura-without-migraine">Typical Aura Without Migraine</option>
                  <option value="familial-hemiplegic-migraine">Familial Hemiplegic Migraine</option>
                  <option value="sporadic-hemiplegic-migraine">Sporadic Hemiplegic Migraine</option>
                  <option value="basilar-type-aura">Basilar-Type Aura</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                type="submit"
                variant="primary"
                leftIcon={<Save size={20} />}
                isLoading={isLoading}
                disabled={isLoading}
                className="w-full md:w-auto"
              >
                Save Profile
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </Layout>
  );
};

export default ProfilePage;

