export interface DashboardSpec {
  type: string;
  title: string;
  layout: LayoutSpec;
  widgets: WidgetSpec[];
  dataSources: DataSourceSpec[];
}

export interface LayoutSpec {
  type: 'Grid' | 'Section';
  columns?: number;
}

export interface WidgetSpec {
  id: string;
  type: WidgetType;
  title: string;
  description?: string;
  dataSource?: string;
  
  // KPI specific
  valueField?: string;
  trendField?: string;
  label?: string;

  // Chart specific
  xField?: string;
  yField?: string;
  groupBy?: string;
  
  // Table specific
  columns?: string[];

  // Filter specific
  targetWidgetIds?: string[];
  filterType?: 'dateRange' | 'select' | 'checkbox';
}

export type WidgetType = 'KPI' | 'BarChart' | 'LineChart' | 'AreaChart' | 'PieChart' | 'Table' | 'Filter';

export interface DataSourceSpec {
  id: string;
  sql: string;
  primaryKey?: string;
}

export interface DashboardData {
  spec: DashboardSpec;
  data: Record<string, any[]>;
}
