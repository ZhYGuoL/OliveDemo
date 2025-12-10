import React, { useState } from 'react';
import { DashboardSpec, WidgetSpec } from '@/types/dashboard';
import { 
  KPIWidget, BarChartWidget, LineChartWidget, AreaChartWidget, PieChartWidget, TableWidget 
} from '@/lib/registry/widgets';
import { DateRangeFilterWidget } from '@/lib/registry/filters';

interface SchemaRendererProps {
  spec: DashboardSpec;
  data: Record<string, any[]>;
}

export const SchemaRenderer: React.FC<SchemaRendererProps> = ({ spec, data }) => {
  const [filterValues, setFilterValues] = useState<Record<string, any>>({});

  const handleFilterChange = (widgetId: string, value: any) => {
    setFilterValues(prev => ({ ...prev, [widgetId]: value }));
  };

  // Helper to filter data based on active filters
  const getFilteredData = (dataSourceId: string | undefined, widgetId: string) => {
    if (!dataSourceId) return [];
    
    let rawData = data[dataSourceId] || [];
    
    // Find all filter widgets that target this widget
    const activeFilters = spec.widgets.filter(
      w => w.type === 'Filter' && w.targetWidgetIds?.includes(widgetId)
    );

    // Apply filters
    if (activeFilters.length > 0) {
      activeFilters.forEach(filterWidget => {
        const value = filterValues[filterWidget.id];
        if (value && filterWidget.filterType === 'dateRange') {
          const { start, end } = value;
          if (start && end) {
            // Assume the first date-like column is the one to filter on
            // In a real app, the spec should specify which column to filter
            const dateColumn = Object.keys(rawData[0] || {}).find(
              key => key.toLowerCase().includes('date') || key.toLowerCase().includes('time')
            );
            
            if (dateColumn) {
              rawData = rawData.filter(row => {
                const rowDate = row[dateColumn];
                return rowDate >= start && rowDate <= end;
              });
            }
          }
        }
      });
    }

    return rawData;
  };

  if (!spec) return null;

  return (
    <div className="w-full h-full p-6 flex flex-col overflow-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{spec.title}</h1>
      </div>

      <div className={`grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-${spec.layout.columns || 3}`}>
        {spec.widgets.map((widget) => {
          if (widget.type === 'Filter') {
            return (
              <div key={widget.id} className={getGridSpan(widget.type)}>
                {renderFilterWidget(widget, filterValues[widget.id], handleFilterChange)}
              </div>
            );
          }

          const widgetData = getFilteredData(widget.dataSource, widget.id);
          return (
            <div key={widget.id} className={getGridSpan(widget.type)}>
              {renderWidget(widget, widgetData)}
            </div>
          );
        })}
      </div>
    </div>
  );
};

function renderFilterWidget(
  widget: WidgetSpec, 
  currentValue: any, 
  onFilterChange: (id: string, val: any) => void
) {
  switch (widget.filterType) {
    case 'dateRange':
      return (
        <DateRangeFilterWidget 
          spec={widget} 
          currentValue={currentValue} 
          onFilterChange={onFilterChange} 
        />
      );
    default:
      return null;
  }
}

function renderWidget(widget: WidgetSpec, data: any[]) {
  switch (widget.type) {
    case 'KPI':
      return <KPIWidget spec={widget} data={data} />;
    case 'BarChart':
      return <BarChartWidget spec={widget} data={data} />;
    case 'LineChart':
      return <LineChartWidget spec={widget} data={data} />;
    case 'AreaChart':
      return <AreaChartWidget spec={widget} data={data} />;
    case 'PieChart':
      return <PieChartWidget spec={widget} data={data} />;
    case 'Table':
      return <TableWidget spec={widget} data={data} />;
    default:
      return (
        <div className="p-4 border border-red-200 bg-red-50 rounded text-red-600">
          Unknown widget type: {widget.type}
        </div>
      );
  }
}

function getGridSpan(type: string): string {
  switch (type) {
    case 'Table':
    case 'LineChart':
    case 'AreaChart':
      return 'col-span-1 md:col-span-2 lg:col-span-2'; // Take up 2 columns
    case 'KPI':
    case 'Filter':
      return 'col-span-1'; // Take up 1 column
    default:
      return 'col-span-1';
  }
}
