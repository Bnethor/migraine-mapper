import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// ============================================
// MIGRAINE CHART COMPONENT
// ============================================

interface ChartData {
  [key: string]: string | number;
}

interface MigraineChartProps {
  data: ChartData[];
  type: 'intensity' | 'frequency';
}

/**
 * Reusable Chart Component using Recharts
 * Features:
 * - Line chart for intensity trends
 * - Bar chart for frequency data
 * - Responsive design
 * - Custom styling
 */
const MigraineChart = ({ data, type }: MigraineChartProps) => {
  // If no data, show empty state
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        <p>No data available</p>
      </div>
    );
  }

  // Chart configuration based on type
  const chartConfig = {
    intensity: {
      dataKey: 'intensity',
      stroke: '#ef4444',
      fill: '#ef4444',
      name: 'Intensity',
    },
    frequency: {
      dataKey: 'count',
      stroke: '#3b82f6',
      fill: '#3b82f6',
      name: 'Count',
    },
  };

  const config = chartConfig[type];

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {payload[0].payload.date || payload[0].payload.month}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {config.name}: <span className="font-semibold">{payload[0].value}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  // Render line chart for intensity
  if (type === 'intensity') {
    return (
      <div className="h-64 mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="date" 
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              domain={[0, 5]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey={config.dataKey}
              stroke={config.stroke}
              strokeWidth={2}
              name={config.name}
              dot={{ fill: config.fill, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Render bar chart for frequency
  return (
    <div className="h-64 mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="month" 
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar 
            dataKey={config.dataKey} 
            fill={config.fill}
            name={config.name}
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MigraineChart;

