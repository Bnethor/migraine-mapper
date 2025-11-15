import csvParser from 'csv-parser';
import { Readable } from 'stream';

/**
 * Field mapping configuration for flexible CSV field recognition
 * Maps various possible column names to standardized field names
 */
const FIELD_MAPPINGS = {
  // Timestamp/Date fields
  timestamp: [
    'datetime', 'timestamp', 'date_time', 'date', 'time', 
    'recorded_at', 'measured_at', 'created_at'
  ],
  
  // Stress-related fields
  stress: [
    'stress', 'stress_value', 'stress_level', 'stress_score',
    'avg_stress_value', 'avg_stress', 'stress_measurement'
  ],
  
  // Recovery fields
  recovery: [
    'recovery', 'recovery_value', 'recovery_score', 'recovery_index',
    'avg_recovery_value', 'avg_recovery', 'readiness'
  ],
  
  // HRV (Heart Rate Variability) fields - MUST come before heartRate to avoid conflicts
  // These are checked first to ensure "hrv" matches HRV, not heart rate
  hrv: [
    'hrv', 'heart_rate_variability', 'hr_variability', 'hrv_value',
    'rmssd', 'sdnn', 'heart_rate_variability_ms', 'hrv_ms'
  ],
  
  // Heart rate fields - must NOT include "hr" alone to avoid matching "hrv"
  // Only include full terms like "heart_rate", "avg_heart_rate", etc.
  heartRate: [
    'heart_rate', 'heartrate', 'bpm', 'pulse', 'beats_per_minute',
    'avg_heart_rate', 'resting_heart_rate', 'rhr', 'resting_hr',
    'hr_bpm', 'heart_rate_bpm', 'avg_hr', 'average_heart_rate'
  ],
  
  // Sleep-related fields
  sleepEfficiency: [
    'sleep_efficiency', 'sleep_efficiency_percent', 'efficiency',
    'sleep_quality', 'sleep_score'
  ],
  
  sleepHeartRate: [
    'sleep_heart_rate', 'sleep_hr', 'sleep_bpm',
    'avg_sleep_heart_rate', 'avg_sleep_hr', 'nightly_heart_rate'
  ],
  
  // Temperature fields
  skinTemperature: [
    'skin_temperature', 'skin_temp', 'temperature', 'temp',
    'avg_skin_temp', 'avg_skin_temperature', 'body_temperature', 'body_temp'
  ],
  
  // Restless periods
  restlessPeriods: [
    'restless_periods', 'restlessness', 'restless_count',
    'movements', 'sleep_movements'
  ]
};

/**
 * Normalize column name for matching
 * Converts to lowercase and removes special characters
 */
const normalizeColumnName = (name) => {
  if (!name) return '';
  return name.toLowerCase()
    .trim()
    .replace(/[_\s-]/g, '_')
    .replace(/[^a-z0-9_]/g, '');
};

/**
 * Find matching field for a column name
 * Returns the standardized field name if a match is found
 * Prioritizes exact matches and prevents "hrv" from matching "hr"
 */
const findMatchingField = (columnName) => {
  const normalized = normalizeColumnName(columnName);
  
  // Special case: "hrv" should NEVER match heart rate fields
  // Check HRV first to ensure it takes priority
  if (normalized === 'hrv' || normalized.startsWith('hrv') || normalized.includes('hrv')) {
    for (const variation of FIELD_MAPPINGS.hrv) {
      const normalizedVariation = normalizeColumnName(variation);
      if (normalized === normalizedVariation || 
          normalized.startsWith(normalizedVariation) ||
          normalizedVariation.startsWith(normalized)) {
        return 'hrv';
      }
    }
  }
  
  // First pass: Check for exact matches (most specific)
  for (const [field, variations] of Object.entries(FIELD_MAPPINGS)) {
    for (const variation of variations) {
      const normalizedVariation = normalizeColumnName(variation);
      if (normalized === normalizedVariation) {
        return field;
      }
    }
  }
  
  // Second pass: Check for starts-with matches (more specific than contains)
  for (const [field, variations] of Object.entries(FIELD_MAPPINGS)) {
    for (const variation of variations) {
      const normalizedVariation = normalizeColumnName(variation);
      // Check if column starts with variation or variation starts with column
      if (normalized.startsWith(normalizedVariation) || normalizedVariation.startsWith(normalized)) {
        // But avoid false matches - e.g., "hrv" should not match "hr"
        // Only match if the variation is a significant part of the column name
        if (normalizedVariation.length >= 3 && normalized.length >= normalizedVariation.length) {
          // Additional safety: if normalized contains "hrv", don't match heart rate
          if (normalized.includes('hrv') && field === 'heartRate') {
            continue;
          }
          return field;
        }
      }
    }
  }
  
  // Third pass: Check for contains matches (least specific, but avoid conflicts)
  // Skip this pass for short variations to avoid false matches
  for (const [field, variations] of Object.entries(FIELD_MAPPINGS)) {
    for (const variation of variations) {
      const normalizedVariation = normalizeColumnName(variation);
      // Only match if variation is substantial (at least 4 chars) to avoid "hr" matching "hrv"
      if (normalizedVariation.length >= 4 && normalized.includes(normalizedVariation)) {
        // Critical: if column contains "hrv", never match heart rate fields
        if (normalized.includes('hrv') && field === 'heartRate') {
          continue;
        }
        // Make sure we're not matching a shorter substring incorrectly
        if (normalized.length >= normalizedVariation.length) {
          // Additional check: if normalized is longer, make sure it's not just a prefix
          const index = normalized.indexOf(normalizedVariation);
          if (index === 0 || normalized.endsWith(normalizedVariation) || 
              (index > 0 && normalized[index - 1] === '_')) {
            return field;
          }
        }
      }
    }
  }
  
  return null;
};

/**
 * Detect CSV separator from file content
 * @param {string} content - The CSV file content
 * @returns {string} - The detected separator (',' or ';')
 */
const detectSeparator = (content) => {
  const firstLine = content.split('\n')[0];
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  
  // If semicolon is used more or equally, use semicolon (common in European CSVs)
  // Otherwise use comma
  return semicolonCount >= commaCount ? ';' : ',';
};

/**
 * Parse CSV file and extract wearable data
 * @param {Buffer} fileBuffer - The CSV file buffer
 * @returns {Promise<{data: Array, fieldMapping: Object, unrecognizedFields: Array}>}
 */
export const parseWearableCSV = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const results = [];
    const fieldMapping = {};
    const unrecognizedFields = [];
    let headers = [];
    
    const fileContent = fileBuffer.toString('utf-8');
    const separator = detectSeparator(fileContent);

    const stream = Readable.from(fileContent);
    
    stream
      .pipe(csvParser({
        separator: separator,
        skipEmptyLines: true,
        skipLinesWithError: false
      }))
      .on('headers', (headerList) => {
        headers = headerList;
        
        // Map headers to standardized fields
        headers.forEach((header) => {
          const matchedField = findMatchingField(header);
          if (matchedField) {
            fieldMapping[header] = matchedField;
          } else {
            unrecognizedFields.push(header);
          }
        });
      })
      .on('data', (row) => {
        const parsedRow = {
          timestamp: null,
          stress_value: null,
          recovery_value: null,
          heart_rate: null,
          hrv: null,
          sleep_efficiency: null,
          sleep_heart_rate: null,
          skin_temperature: null,
          restless_periods: null,
          additional_data: {}
        };

        let hasValidTimestamp = false;

        // Parse each column
        for (const header of headers) {
          const value = row[header];
          if (value === undefined || value === null || value === '') {
            continue;
          }

          const matchedField = fieldMapping[header];
          
          if (matchedField) {
            // Map to standardized field
            let parsedValue = value;
            
            // Parse timestamp
            if (matchedField === 'timestamp') {
              try {
                // Clean the value (remove extra spaces, handle semicolon-separated dates)
                const cleanValue = value.trim().replace(/;/g, ' ');
                parsedValue = new Date(cleanValue);
                
                if (isNaN(parsedValue.getTime())) {
                  console.warn(`Failed to parse timestamp: ${value}`);
                  return; // Skip this row if timestamp is invalid
                }
                parsedRow.timestamp = parsedValue;
                hasValidTimestamp = true;
              } catch (e) {
                console.warn(`Failed to parse timestamp: ${value}`, e);
                return; // Skip this row if timestamp parsing fails
              }
            } else {
              // Parse numeric values
              const numericValue = parseFloat(value);
              if (!isNaN(numericValue)) {
                switch (matchedField) {
                  case 'stress':
                    parsedRow.stress_value = numericValue;
                    break;
                  case 'recovery':
                    parsedRow.recovery_value = numericValue;
                    break;
                  case 'heartRate':
                    parsedRow.heart_rate = numericValue;
                    break;
                  case 'hrv':
                    parsedRow.hrv = numericValue;
                    break;
                  case 'sleepEfficiency':
                    parsedRow.sleep_efficiency = numericValue;
                    break;
                  case 'sleepHeartRate':
                    parsedRow.sleep_heart_rate = numericValue;
                    break;
                  case 'skinTemperature':
                    parsedRow.skin_temperature = numericValue;
                    break;
                  case 'restlessPeriods':
                    parsedRow.restless_periods = numericValue;
                    break;
                }
              }
            }
          } else {
            // Store unrecognized fields in additional_data
            const numericValue = parseFloat(value);
            if (!isNaN(numericValue)) {
              parsedRow.additional_data[header] = numericValue;
            } else {
              parsedRow.additional_data[header] = value;
            }
          }
        }

        // Only add rows with valid timestamps
        if (hasValidTimestamp && parsedRow.timestamp && !isNaN(parsedRow.timestamp.getTime())) {
          results.push(parsedRow);
        }
      })
      .on('end', () => {
        resolve({
          data: results,
          fieldMapping,
          unrecognizedFields,
          totalRows: results.length
        });
      })
      .on('error', (error) => {
        reject(error);
      });
  });
};

/**
 * Detect source device from CSV headers or filename
 */
export const detectSource = (headers, filename = '') => {
  const lowerFilename = filename.toLowerCase();
  const lowerHeaders = headers.map(h => h.toLowerCase()).join(' ');
  
  if (lowerFilename.includes('oura') || lowerHeaders.includes('oura')) {
    return 'oura';
  }
  if (lowerFilename.includes('fitbit') || lowerHeaders.includes('fitbit')) {
    return 'fitbit';
  }
  if (lowerFilename.includes('garmin') || lowerHeaders.includes('garmin')) {
    return 'garmin';
  }
  if (lowerFilename.includes('apple') || lowerHeaders.includes('apple')) {
    return 'apple_watch';
  }
  
  return 'manual_upload';
};

