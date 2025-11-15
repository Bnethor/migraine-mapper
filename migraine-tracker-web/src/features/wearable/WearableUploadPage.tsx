import { useState, useCallback, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, FileText, CheckCircle2, AlertCircle, X, Loader2, Clock, Trash2, History } from 'lucide-react';
import { uploadWearableCSV, getUploadSessions, deleteUploadSession, type UploadResponse, type UploadSession } from '../../api/wearableService';
import {
  Layout,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  ErrorMessage,
} from '../../components/common';

// ============================================
// WEARABLE UPLOAD PAGE
// ============================================

export const WearableUploadPage = () => {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [actualUploadProgress, setActualUploadProgress] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);
  const [processingPhase, setProcessingPhase] = useState(false);
  const uploadStartTime = useRef<number | null>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();

  // Fetch upload history
  const { data: uploadsData, refetch: refetchUploads } = useQuery({
    queryKey: ['upload-sessions'],
    queryFn: () => getUploadSessions(),
  });

  // Delete upload mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUploadSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upload-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['wearable-data'] });
      queryClient.invalidateQueries({ queryKey: ['wearable-statistics'] });
    },
  });

  // Calculate estimated processing time based on file size
  const estimateProcessingTime = (fileSize: number, rowCount?: number): number => {
    // Base estimate: ~100ms per KB for upload + ~10ms per row for processing
    // For a 542KB file with ~7000 rows: ~54s upload + ~70s processing = ~2 minutes
    const uploadTime = (fileSize / 1024) * 100; // ms
    const processingTime = rowCount ? rowCount * 10 : (fileSize / 1024) * 50; // ms
    return Math.ceil((uploadTime + processingTime) / 1000); // seconds
  };

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      uploadStartTime.current = Date.now();
      setUploadProgress(0);
      setActualUploadProgress(0);
      setProcessingPhase(false);
      
      // Estimate row count from file size (rough estimate: ~100 bytes per row)
      const estimatedRows = Math.ceil(file.size / 100);
      setEstimatedTime(estimateProcessingTime(file.size, estimatedRows));

      return uploadWearableCSV(file, (progress) => {
        setActualUploadProgress(progress);
        // Upload phase: 0-80%, Processing phase: 80-100%
        // We track upload progress, then show processing
        if (progress < 100) {
          // Scale upload progress to 0-80%
          setUploadProgress(progress * 0.8);
          setProcessingPhase(false);
          
          // Calculate estimated time remaining for upload
          if (uploadStartTime.current && progress > 0) {
            const elapsed = (Date.now() - uploadStartTime.current) / 1000; // seconds
            const uploadTotalEstimated = elapsed / (progress / 100);
            const uploadRemaining = Math.max(0, uploadTotalEstimated - elapsed);
            
            // Add estimated processing time
            const estimatedRows = Math.ceil(file.size / 100);
            const processingTime = estimatedRows * 0.01; // seconds per row
            setEstimatedTime(Math.ceil(uploadRemaining + processingTime));
          }
        } else {
          // Upload complete, now processing
          setUploadProgress(80);
          setProcessingPhase(true);
          // Estimate processing time based on file size
          const estimatedRows = Math.ceil(file.size / 100);
          const processingTime = estimatedRows * 0.01; // seconds
          setEstimatedTime(Math.ceil(processingTime));
        }
      });
    },
    onSuccess: (response) => {
      setUploadProgress(100);
      setActualUploadProgress(100);
      setProcessingPhase(false);
      if (response.data?.data) {
        setUploadResult(response.data.data);
        setFile(null);
      }
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
      uploadStartTime.current = null;
      setEstimatedTime(null);
      // Refresh upload history
      refetchUploads();
    },
    onError: (error: Error) => {
      console.error('Upload error:', error);
      setUploadProgress(0);
      setActualUploadProgress(0);
      setEstimatedTime(null);
      setProcessingPhase(false);
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
      uploadStartTime.current = null;
    },
  });

  // Handle drag events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.toLowerCase().endsWith('.csv')) {
        setFile(droppedFile);
        setUploadResult(null);
      } else {
        alert('Please upload a CSV file');
      }
    }
  }, []);

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadResult(null);
    }
  };

  // Handle upload
  const handleUpload = () => {
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  // Reset
  const handleReset = () => {
    setFile(null);
    setUploadResult(null);
    setUploadProgress(0);
    setActualUploadProgress(0);
    setEstimatedTime(null);
    setProcessingPhase(false);
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    uploadStartTime.current = null;
  };

  // Format time estimate
  const formatTimeEstimate = (seconds: number | null): string => {
    if (seconds === null || seconds === 0) return '';
    if (seconds < 60) return `~${seconds}s remaining`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `~${minutes}m ${secs}s remaining`;
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Upload Wearable Data</h1>
          <p className="mt-2 text-gray-600">
            Upload CSV files from your wearable devices (Oura Ring, Fitbit, Garmin, etc.)
            to track metrics like stress, HRV, heart rate, and sleep data.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>CSV File Upload</CardTitle>
            <CardDescription>
              Drag and drop your CSV file or click to browse. The system will automatically
              recognize relevant fields like stress, HRV, heart rate, and more.
            </CardDescription>
          </CardHeader>

          <div className="p-6">
            {/* Upload Area */}
            {!uploadResult && (
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`
                  border-2 border-dashed rounded-lg p-12 text-center transition-colors
                  ${dragActive
                    ? 'border-blue-500 bg-blue-50'
                    : file
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 bg-gray-50 hover:border-gray-400'
                  }
                `}
              >
                {file ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center">
                      <FileText className="w-16 h-16 text-green-600" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {(file.size / 1024).toFixed(2)} KB
                        {file.size > 100000 && (
                          <span className="ml-2 text-xs text-gray-400">
                            (Large file - processing may take a few minutes)
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Progress Bar */}
                    {uploadMutation.isPending && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">
                            {processingPhase ? 'Processing CSV file...' : 'Uploading file...'}
                          </span>
                          <span className="text-gray-500">{Math.round(uploadProgress)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden relative">
                          <div
                            className="bg-blue-600 h-full rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${uploadProgress}%` }}
                          />
                          {processingPhase && uploadProgress < 100 && (
                            <div className="absolute inset-0 bg-blue-400 animate-pulse" style={{ width: '80%' }} />
                          )}
                        </div>
                        {estimatedTime !== null && estimatedTime > 0 && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span>{formatTimeEstimate(estimatedTime)}</span>
                          </div>
                        )}
                        <p className="text-xs text-gray-400 text-center">
                          {processingPhase ? (
                            <>
                              Parsing CSV and inserting {Math.ceil(file.size / 100)} estimated rows into database...
                            </>
                          ) : (
                            <>
                              Uploading file ({((file.size / 1024) * actualUploadProgress / 100).toFixed(1)} KB of {(file.size / 1024).toFixed(1)} KB)
                            </>
                          )}
                        </p>
                      </div>
                    )}

                    <div className="flex gap-3 justify-center">
                      <Button
                        onClick={handleUpload}
                        disabled={uploadMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {uploadMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Upload File
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => {
                          setFile(null);
                          setUploadProgress(0);
                          setEstimatedTime(null);
                        }}
                        variant="outline"
                        disabled={uploadMutation.isPending}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center">
                      <Upload className="w-16 h-16 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-gray-900">
                        Drag and drop your CSV file here
                      </p>
                      <p className="text-sm text-gray-500 mt-1">or</p>
                      <label className="inline-block mt-2">
                        <input
                          type="file"
                          accept=".csv"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <Button variant="outline" as="span">
                          Browse Files
                        </Button>
                      </label>
                    </div>
                    <p className="text-xs text-gray-400 mt-4">
                      Supported formats: CSV (comma or semicolon separated)
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Upload Result */}
            {uploadResult && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                  <div className="flex-1">
                    <p className="font-medium text-green-900">
                      Upload Successful!
                    </p>
                    <p className="text-sm text-green-700">
                      Successfully processed {uploadResult.inserted + (uploadResult.updated || 0)} of {uploadResult.total} rows
                      {uploadResult.inserted > 0 && ` (${uploadResult.inserted} new`}
                      {uploadResult.updated && uploadResult.updated > 0 && `, ${uploadResult.updated} updated`}
                      {uploadResult.skipped && uploadResult.skipped > 0 && `, ${uploadResult.skipped} skipped`}
                      {uploadResult.inserted > 0 && ')'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Total Rows</p>
                    <p className="text-2xl font-bold text-gray-900">{uploadResult.total}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-600">New</p>
                    <p className="text-2xl font-bold text-green-900">{uploadResult.inserted}</p>
                  </div>
                  {uploadResult.updated !== undefined && uploadResult.updated > 0 && (
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-600">Updated</p>
                      <p className="text-2xl font-bold text-blue-900">{uploadResult.updated}</p>
                    </div>
                  )}
                  {uploadResult.skipped !== undefined && uploadResult.skipped > 0 && (
                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <p className="text-sm text-yellow-600">Skipped</p>
                      <p className="text-2xl font-bold text-yellow-900">{uploadResult.skipped}</p>
                    </div>
                  )}
                  {uploadResult.errors > 0 && (
                    <div className="p-4 bg-red-50 rounded-lg">
                      <p className="text-sm text-red-600">Errors</p>
                      <p className="text-2xl font-bold text-red-900">{uploadResult.errors}</p>
                    </div>
                  )}
                </div>

                {uploadResult.source && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-900">
                      Detected Source: <span className="capitalize">{uploadResult.source}</span>
                    </p>
                  </div>
                )}

                {Object.keys(uploadResult.fieldMapping).length > 0 && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-900 mb-2">
                      Recognized Fields:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(uploadResult.fieldMapping).map(([original, mapped]) => (
                        <span
                          key={original}
                          className="px-2 py-1 bg-white border border-gray-200 rounded text-xs"
                        >
                          <span className="text-gray-600">{original}</span>
                          <span className="text-gray-400 mx-1">→</span>
                          <span className="text-blue-600 font-medium">{mapped}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {uploadResult.unrecognizedFields.length > 0 && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-yellow-900 mb-1">
                          Unrecognized Fields (stored in additional_data):
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {uploadResult.unrecognizedFields.map((field) => (
                            <span
                              key={field}
                              className="px-2 py-1 bg-white border border-yellow-200 rounded text-xs text-yellow-800"
                            >
                              {field}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button onClick={handleReset} variant="outline">
                    Upload Another File
                  </Button>
                </div>
              </div>
            )}

            {/* Error Message */}
            {uploadMutation.isError && (
              <div className="mt-4">
                <ErrorMessage
                  message={
                    (uploadMutation.error as Error)?.message ||
                    'Failed to upload file. Please try again.'
                  }
                />
              </div>
            )}
          </div>
        </Card>

        {/* Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>Supported Data Fields</CardTitle>
            <CardDescription>
              The system automatically recognizes these common wearable device metrics:
            </CardDescription>
          </CardHeader>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                'Stress Value',
                'Recovery Value',
                'Heart Rate',
                'HRV (Heart Rate Variability)',
                'Sleep Efficiency',
                'Sleep Heart Rate',
                'Skin Temperature',
                'Restless Periods',
              ].map((field) => (
                <div
                  key={field}
                  className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700"
                >
                  {field}
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-gray-600">
              <strong>Note:</strong> Field names can vary (e.g., "stress", "stress_value", "stress_level").
              The system will automatically map them to the correct fields. Any unrecognized fields
              will be stored in the additional_data field for future analysis.
            </p>
          </div>
        </Card>

        {/* Upload History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Upload History
            </CardTitle>
            <CardDescription>
              View and manage your previous CSV uploads. You can delete uploads to remove all associated data.
            </CardDescription>
          </CardHeader>
          <div className="p-6">
            {uploadsData?.data?.data?.uploads && uploadsData.data.data.uploads.length > 0 ? (
              <div className="space-y-3">
                {uploadsData.data.data.uploads.map((upload: UploadSession) => (
                  <div
                    key={upload.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <p className="font-medium text-gray-900 truncate">{upload.filename}</p>
                        {upload.source && (
                          <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded capitalize">
                            {upload.source}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 text-xs rounded ${
                          upload.status === 'completed' ? 'bg-green-100 text-green-700' :
                          upload.status === 'failed' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {upload.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600 ml-6">
                        <span>{(upload.fileSize / 1024).toFixed(1)} KB</span>
                        <span>•</span>
                        <span>{upload.totalRows} rows</span>
                        <span>•</span>
                        <span className="text-green-600">{upload.insertedRows} new</span>
                        {upload.updatedRows > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-blue-600">{upload.updatedRows} updated</span>
                          </>
                        )}
                        {upload.skippedRows > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-yellow-600">{upload.skippedRows} skipped</span>
                          </>
                        )}
                        {upload.errorRows > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-red-600">{upload.errorRows} errors</span>
                          </>
                        )}
                        <span>•</span>
                        <span>{new Date(upload.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        if (window.confirm(`Delete this upload? This will remove ${upload.insertedRows} data records.`)) {
                          deleteMutation.mutate(upload.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                      className="ml-4"
                    >
                      {deleteMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">
                No uploads yet. Upload a CSV file to get started.
              </p>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default WearableUploadPage;

