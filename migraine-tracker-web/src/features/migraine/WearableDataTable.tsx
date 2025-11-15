import { useState } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, Activity, Heart, Brain, Moon, Thermometer } from 'lucide-react';
import type { WearableDataEntry } from '../../api/wearableService';

// ============================================
// WEARABLE DATA TABLE
// ============================================

interface WearableDataTableProps {
  entries: WearableDataEntry[];
}

/**
 * Wearable Data Table Component
 * Displays wearable data entries in an expandable table format
 */
const WearableDataTable = ({ entries }: WearableDataTableProps) => {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const toggleRow = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  // Group entries by date
  const groupedEntries = entries.reduce((acc, entry) => {
    const date = entry.timestamp.split('T')[0];
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(entry);
    return acc;
  }, {} as Record<string, WearableDataEntry[]>);

  // Sort dates in descending order
  const sortedDates = Object.keys(groupedEntries).sort((a, b) => b.localeCompare(a));

  const formatMetric = (value: number | undefined, unit: string = '') => {
    if (value === undefined || value === null) return '-';
    return `${value.toFixed(2)}${unit}`;
  };

  const getMetricColor = (value: number | undefined, metric: string) => {
    if (!value) return 'text-gray-400';
    
    // Color coding based on typical healthy ranges
    switch (metric) {
      case 'stress':
        if (value < 30) return 'text-green-600';
        if (value < 60) return 'text-yellow-600';
        return 'text-red-600';
      case 'recovery':
        if (value >= 70) return 'text-green-600';
        if (value >= 40) return 'text-yellow-600';
        return 'text-red-600';
      case 'hrv':
        if (value >= 50) return 'text-green-600';
        if (value >= 30) return 'text-yellow-600';
        return 'text-red-600';
      case 'heartRate':
        if (value >= 60 && value <= 100) return 'text-green-600';
        if (value >= 50 && value <= 120) return 'text-yellow-600';
        return 'text-red-600';
      default:
        return 'text-gray-700';
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Data Points
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Avg Stress
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Avg Heart Rate
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Avg HRV
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Source
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedDates.map((date) => {
            const dayEntries = groupedEntries[date];
            const isExpanded = expandedRow === date;
            
            // Calculate averages for the day
            const avgStress = dayEntries
              .filter(e => e.stressValue)
              .reduce((sum, e) => sum + (e.stressValue || 0), 0) / dayEntries.filter(e => e.stressValue).length;
            
            const avgHeartRate = dayEntries
              .filter(e => e.heartRate)
              .reduce((sum, e) => sum + (e.heartRate || 0), 0) / dayEntries.filter(e => e.heartRate).length;
            
            const avgHrv = dayEntries
              .filter(e => e.hrv)
              .reduce((sum, e) => sum + (e.hrv || 0), 0) / dayEntries.filter(e => e.hrv).length;

            const sources = [...new Set(dayEntries.map(e => e.source).filter(Boolean))];

            return (
              <>
                <tr key={date} className="hover:bg-gray-50 dark:bg-gray-800 cursor-pointer" onClick={() => toggleRow(date)}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {format(new Date(date), 'MMM dd, yyyy')}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {format(new Date(date), 'EEEE')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-gray-100">{dayEntries.length}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium ${getMetricColor(avgStress, 'stress')}`}>
                      {formatMetric(avgStress)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium ${getMetricColor(avgHeartRate, 'heartRate')}`}>
                      {formatMetric(avgHeartRate, ' bpm')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium ${getMetricColor(avgHrv, 'hrv')}`}>
                      {formatMetric(avgHrv, ' ms')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {sources.map((source, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 capitalize"
                        >
                          {source}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900">
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                  </td>
                </tr>
                
                {/* Expanded details */}
                {isExpanded && (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 bg-gray-50 dark:bg-gray-800">
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                          Detailed Metrics ({dayEntries.length} data points)
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {/* Stress */}
                          {dayEntries.some(e => e.stressValue) && (
                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                              <div className="flex items-center gap-2 mb-2">
                                <Brain className="text-purple-500" size={18} />
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Stress</span>
                              </div>
                              <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600 dark:text-gray-400">Average:</span>
                                  <span className={`font-semibold ${getMetricColor(avgStress, 'stress')}`}>
                                    {formatMetric(avgStress)}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600 dark:text-gray-400">Min:</span>
                                  <span className="text-gray-900 dark:text-gray-100">
                                    {formatMetric(Math.min(...dayEntries.filter(e => e.stressValue).map(e => e.stressValue!)))}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600 dark:text-gray-400">Max:</span>
                                  <span className="text-gray-900 dark:text-gray-100">
                                    {formatMetric(Math.max(...dayEntries.filter(e => e.stressValue).map(e => e.stressValue!)))}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Heart Rate */}
                          {dayEntries.some(e => e.heartRate) && (
                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                              <div className="flex items-center gap-2 mb-2">
                                <Heart className="text-red-500" size={18} />
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Heart Rate</span>
                              </div>
                              <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600 dark:text-gray-400">Average:</span>
                                  <span className={`font-semibold ${getMetricColor(avgHeartRate, 'heartRate')}`}>
                                    {formatMetric(avgHeartRate, ' bpm')}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600 dark:text-gray-400">Min:</span>
                                  <span className="text-gray-900 dark:text-gray-100">
                                    {formatMetric(Math.min(...dayEntries.filter(e => e.heartRate).map(e => e.heartRate!)), ' bpm')}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600 dark:text-gray-400">Max:</span>
                                  <span className="text-gray-900 dark:text-gray-100">
                                    {formatMetric(Math.max(...dayEntries.filter(e => e.heartRate).map(e => e.heartRate!)), ' bpm')}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* HRV */}
                          {dayEntries.some(e => e.hrv) && (
                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                              <div className="flex items-center gap-2 mb-2">
                                <Activity className="text-blue-500" size={18} />
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">HRV</span>
                              </div>
                              <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600 dark:text-gray-400">Average:</span>
                                  <span className={`font-semibold ${getMetricColor(avgHrv, 'hrv')}`}>
                                    {formatMetric(avgHrv, ' ms')}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600 dark:text-gray-400">Min:</span>
                                  <span className="text-gray-900 dark:text-gray-100">
                                    {formatMetric(Math.min(...dayEntries.filter(e => e.hrv).map(e => e.hrv!)), ' ms')}
                                  </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600 dark:text-gray-400">Max:</span>
                                  <span className="text-gray-900 dark:text-gray-100">
                                    {formatMetric(Math.max(...dayEntries.filter(e => e.hrv).map(e => e.hrv!)), ' ms')}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Recovery */}
                          {dayEntries.some(e => e.recoveryValue) && (
                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                              <div className="flex items-center gap-2 mb-2">
                                <Activity className="text-green-500" size={18} />
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Recovery</span>
                              </div>
                              <div className="space-y-1">
                                {(() => {
                                  const recoveryEntries = dayEntries.filter(e => e.recoveryValue);
                                  const avgRecovery = recoveryEntries.reduce((sum, e) => sum + (e.recoveryValue || 0), 0) / recoveryEntries.length;
                                  return (
                                    <>
                                      <div className="flex justify-between text-sm">
                                        <span className="text-gray-600 dark:text-gray-400">Average:</span>
                                        <span className={`font-semibold ${getMetricColor(avgRecovery, 'recovery')}`}>
                                          {formatMetric(avgRecovery)}
                                        </span>
                                      </div>
                                      <div className="flex justify-between text-sm">
                                        <span className="text-gray-600 dark:text-gray-400">Min:</span>
                                        <span className="text-gray-900 dark:text-gray-100">
                                          {formatMetric(Math.min(...recoveryEntries.map(e => e.recoveryValue!)))}
                                        </span>
                                      </div>
                                      <div className="flex justify-between text-sm">
                                        <span className="text-gray-600 dark:text-gray-400">Max:</span>
                                        <span className="text-gray-900 dark:text-gray-100">
                                          {formatMetric(Math.max(...recoveryEntries.map(e => e.recoveryValue!)))}
                                        </span>
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          )}

                          {/* Sleep Efficiency */}
                          {dayEntries.some(e => e.sleepEfficiency) && (
                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                              <div className="flex items-center gap-2 mb-2">
                                <Moon className="text-indigo-500" size={18} />
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Sleep Efficiency</span>
                              </div>
                              <div className="space-y-1">
                                {(() => {
                                  const sleepEntries = dayEntries.filter(e => e.sleepEfficiency);
                                  const avgSleep = sleepEntries.reduce((sum, e) => sum + (e.sleepEfficiency || 0), 0) / sleepEntries.length;
                                  return (
                                    <>
                                      <div className="flex justify-between text-sm">
                                        <span className="text-gray-600 dark:text-gray-400">Average:</span>
                                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                                          {formatMetric(avgSleep, '%')}
                                        </span>
                                      </div>
                                      <div className="flex justify-between text-sm">
                                        <span className="text-gray-600 dark:text-gray-400">Min:</span>
                                        <span className="text-gray-900 dark:text-gray-100">
                                          {formatMetric(Math.min(...sleepEntries.map(e => e.sleepEfficiency!)), '%')}
                                        </span>
                                      </div>
                                      <div className="flex justify-between text-sm">
                                        <span className="text-gray-600 dark:text-gray-400">Max:</span>
                                        <span className="text-gray-900 dark:text-gray-100">
                                          {formatMetric(Math.max(...sleepEntries.map(e => e.sleepEfficiency!)), '%')}
                                        </span>
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          )}

                          {/* Skin Temperature */}
                          {dayEntries.some(e => e.skinTemperature) && (
                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                              <div className="flex items-center gap-2 mb-2">
                                <Thermometer className="text-orange-500" size={18} />
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Skin Temp</span>
                              </div>
                              <div className="space-y-1">
                                {(() => {
                                  const tempEntries = dayEntries.filter(e => e.skinTemperature);
                                  const avgTemp = tempEntries.reduce((sum, e) => sum + (e.skinTemperature || 0), 0) / tempEntries.length;
                                  return (
                                    <>
                                      <div className="flex justify-between text-sm">
                                        <span className="text-gray-600 dark:text-gray-400">Average:</span>
                                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                                          {formatMetric(avgTemp, '°C')}
                                        </span>
                                      </div>
                                      <div className="flex justify-between text-sm">
                                        <span className="text-gray-600 dark:text-gray-400">Min:</span>
                                        <span className="text-gray-900 dark:text-gray-100">
                                          {formatMetric(Math.min(...tempEntries.map(e => e.skinTemperature!)), '°C')}
                                        </span>
                                      </div>
                                      <div className="flex justify-between text-sm">
                                        <span className="text-gray-600 dark:text-gray-400">Max:</span>
                                        <span className="text-gray-900 dark:text-gray-100">
                                          {formatMetric(Math.max(...tempEntries.map(e => e.skinTemperature!)), '°C')}
                                        </span>
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default WearableDataTable;

