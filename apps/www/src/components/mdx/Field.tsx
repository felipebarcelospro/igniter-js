import React, { ReactNode } from 'react';
import { Hash, Type, Calendar, ToggleLeft, List, FileText } from 'lucide-react';

interface FieldProps {
  name: string;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date';
  required?: boolean;
  default?: string;
  description?: ReactNode;
}

const typeIcons = {
  string: Type,
  number: Hash,
  boolean: ToggleLeft,
  array: List,
  object: FileText,
  date: Calendar
};

export const Field: React.FC<FieldProps> = ({ name, type = 'string', required = false, default: defaultValue, description }) => {
  const Icon = typeIcons[type];

  return (
    <div className="my-4 p-4 border border-border rounded-lg">
      <div className="flex items-center gap-3 mb-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <code className="font-mono text-sm font-semibold">{name}</code>
        {required && (
          <span className="text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 px-2 py-1 rounded">
            required
          </span>
        )}
        <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
          {type}
        </span>
      </div>
      {defaultValue && (
        <div className="mb-2 text-sm text-muted-foreground">
          Default: <code className="font-mono">{defaultValue}</code>
        </div>
      )}
      {description && (
        <div className="text-sm text-muted-foreground">
          {description}
        </div>
      )}
    </div>
  );
};