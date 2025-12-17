import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WidgetSpec } from '@/types/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FilterWidgetProps {
  spec: WidgetSpec;
  onFilterChange: (widgetId: string, filterValue: any) => void;
  currentValue: any;
}

export const DateRangeFilterWidget: React.FC<FilterWidgetProps> = ({ spec, onFilterChange, currentValue }) => {
  const startDate = currentValue?.start || '';
  const endDate = currentValue?.end || '';

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange(spec.id, { ...currentValue, start: e.target.value });
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange(spec.id, { ...currentValue, end: e.target.value });
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{spec.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-4 pt-2">
        <div className="flex-1 min-w-[150px] space-y-1">
          <Label htmlFor={`${spec.id}-start`} className="text-xs">Start Date</Label>
          <Input
            id={`${spec.id}-start`}
            type="date"
            value={startDate}
            onChange={handleStartChange}
            className="h-8 text-sm"
          />
        </div>
        <div className="flex-1 min-w-[150px] space-y-1">
          <Label htmlFor={`${spec.id}-end`} className="text-xs">End Date</Label>
          <Input
            id={`${spec.id}-end`}
            type="date"
            value={endDate}
            onChange={handleEndChange}
            className="h-8 text-sm"
          />
        </div>
      </CardContent>
    </Card>
  );
};


