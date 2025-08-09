import React, { ReactNode } from 'react';
import { Hash, Type, Calendar, ToggleLeft, List, FileText } from 'lucide-react';

interface FieldProps {
  name: string;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date';
  required?: boolean;
  default?: string;
  children?: ReactNode;
}

const typeIcons = {
  string: Type,
  number: Hash,
  boolean: ToggleLeft,
  array: List,
  object: FileText,
  date: Calendar
};

export const Field: React.FC<FieldProps> = ({ name, type = 'string', required = false, default: defaultValue, children }) => {
  const Icon = typeIcons[type];

  return (
    <div className="my-6">
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <div className="flex items-center gap-2 flex-wrap">
          <code className="font-mono text-sm font-semibold">{name}</code>
          {required && (
            <span className="text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 px-2 py-0.5 rounded-full">
              required
            </span>
          )}
          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
            {type}
          </span>
          {defaultValue && (
            <span className="text-xs text-muted-foreground">
              (default: <code className="font-mono">{defaultValue}</code>)
            </span>
          )}
        </div>
      </div>
      {children && (
        <div className="pl-7 pt-2 text-sm text-muted-foreground">
          {children}
        </div>
      )}
    </div>
  );
};
