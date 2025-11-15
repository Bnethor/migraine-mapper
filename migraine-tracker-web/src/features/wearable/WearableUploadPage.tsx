import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Upload, FileText, CheckCircle2, AlertCircle, X, Loader2 } from 'lucide-react';
import { uploadWearableCSV, type UploadResponse } from '../../api/wearableService';
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

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadWearableCSV(file),
    onSuccess: (response) => {
      if (response.data?.data) {
        setUploadResult(response.data.data);
        setFile(null);
      }
    },
    onError: (error: Error) => {
      console.error('Upload error:', error);
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
                      </p>
                    </div>
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
                        onClick={() => setFile(null)}
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
                      Successfully processed {uploadResult.inserted} of {uploadResult.total} rows
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Total Rows</p>
                    <p className="text-2xl font-bold text-gray-900">{uploadResult.total}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-600">Inserted</p>
                    <p className="text-2xl font-bold text-green-900">{uploadResult.inserted}</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <p className="text-sm text-red-600">Errors</p>
                    <p className="text-2xl font-bold text-red-900">{uploadResult.errors}</p>
                  </div>
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
      </div>
    </Layout>
  );
};

export default WearableUploadPage;

