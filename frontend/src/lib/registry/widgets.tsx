import React, { useState } from 'react';
import { 
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { WidgetSpec } from '@/types/dashboard';

// --- Types ---
interface WidgetProps {
  spec: WidgetSpec;
  data: any[];
}

// --- KPI Component ---
export const KPIWidget: React.FC<WidgetProps> = ({ spec, data }) => {
  const latestRow = data && data.length > 0 ? data[data.length - 1] : {};
  const value = spec.valueField ? latestRow[spec.valueField] : 0;
  const trend = spec.trendField ? latestRow[spec.trendField] : null;

  // Formatting helper
  const formatValue = (val: any) => {
    if (typeof val === 'number') {
      return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(val);
    }
    return val;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{spec.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue(value)}</div>
        {trend !== null && trend !== undefined && (
          <p className={cn("text-xs mt-1", trend >= 0 ? "text-green-600" : "text-red-600")}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% from previous
          </p>
        )}
      </CardContent>
    </Card>
  );
};

// --- Chart Components ---
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export const BarChartWidget: React.FC<WidgetProps> = ({ spec, data }) => (
  <Card className="h-full flex flex-col">
    <CardHeader>
      <CardTitle>{spec.title}</CardTitle>
      {spec.description && <CardDescription>{spec.description}</CardDescription>}
    </CardHeader>
    <CardContent className="flex-1 min-h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={spec.xField} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey={spec.yField || 'value'} fill="#0f4a28" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
);

export const LineChartWidget: React.FC<WidgetProps> = ({ spec, data }) => (
  <Card className="h-full flex flex-col">
    <CardHeader>
      <CardTitle>{spec.title}</CardTitle>
      {spec.description && <CardDescription>{spec.description}</CardDescription>}
    </CardHeader>
    <CardContent className="flex-1 min-h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={spec.xField} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey={spec.yField} stroke="#0f4a28" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
);

export const AreaChartWidget: React.FC<WidgetProps> = ({ spec, data }) => (
  <Card className="h-full flex flex-col">
    <CardHeader>
      <CardTitle>{spec.title}</CardTitle>
      {spec.description && <CardDescription>{spec.description}</CardDescription>}
    </CardHeader>
    <CardContent className="flex-1 min-h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={spec.xField} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Area type="monotone" dataKey={spec.yField || 'value'} stroke="#0f4a28" fill="#0f4a28" fillOpacity={0.2} />
        </AreaChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
);

export const PieChartWidget: React.FC<WidgetProps> = ({ spec, data }) => (
  <Card className="h-full flex flex-col">
    <CardHeader>
      <CardTitle>{spec.title}</CardTitle>
      {spec.description && <CardDescription>{spec.description}</CardDescription>}
    </CardHeader>
    <CardContent className="flex-1 min-h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey={spec.valueField || 'value'} // Fallback if yField isn't appropriate
            nameKey={spec.xField || 'name'} // Fallback
          >
            {data.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </CardContent>
  </Card>
);

export const TableWidget: React.FC<WidgetProps> = ({ spec, data }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const INITIAL_ROWS = 5;

  // Get columns from spec or data
  // Handle both string[] and object[] formats
  const rawColumns = spec.columns || Object.keys(data[0] || {});
  const columns = rawColumns.map((col: any) =>
    typeof col === 'string' ? col : (col?.field || col?.name || String(col))
  );
  const columnLabels = rawColumns.map((col: any) =>
    typeof col === 'string' ? col : (col?.name || col?.field || String(col))
  );

  // Handle column header click
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle direction if clicking the same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Sort data
  const sortedData = React.useMemo(() => {
    if (!sortColumn) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      // Handle null/undefined values
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      // Try to parse as numbers for numeric sorting
      const aNum = Number(aVal);
      const bNum = Number(bVal);

      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
      }

      // String comparison
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();

      if (sortDirection === 'asc') {
        return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
      } else {
        return aStr > bStr ? -1 : aStr < bStr ? 1 : 0;
      }
    });
  }, [data, sortColumn, sortDirection]);

  const displayData = isExpanded ? sortedData : sortedData.slice(0, INITIAL_ROWS);
  const hasMoreRows = data.length > INITIAL_ROWS;

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardHeader>
        <CardTitle>{spec.title}</CardTitle>
        {spec.description && <CardDescription>{spec.description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex-1 overflow-auto p-0">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={`header-${col}-${idx}`}
                  className="px-6 py-3 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                  onClick={() => handleSort(col)}
                >
                  <div className="flex items-center gap-1">
                    <span>{columnLabels[idx]}</span>
                    {sortColumn === col && (
                      <span className="text-gray-500">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayData.map((row, i) => (
              <tr key={i} className="bg-white border-b hover:bg-gray-50">
                {columns.map((col, idx) => (
                  <td key={`cell-${i}-${idx}`} className="px-6 py-4">{row[col]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {hasMoreRows && (
          <div className="flex justify-center py-3 bg-gray-50 border-t sticky bottom-0">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              {isExpanded ? `Show Less (${INITIAL_ROWS} rows)` : `Show More (${data.length} total rows)`}
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

