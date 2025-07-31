import React, { ReactNode } from 'react';
import { Info, AlertTriangle, AlertCircle, CheckCircle, Lightbulb, FileText } from 'lucide-react';

interface PanelProps {
  children: ReactNode;
  type?: 'info' | 'warning' | 'error' | 'success' | 'tip' | 'note';
  title?: string;
}

const panelConfig = {
  info: {
    icon: Info,
    className: 'border-border bg-accent/30 text-foreground'
  },
  warning: {
    icon: AlertTriangle,
    className: 'border-destructive/40 bg-destructive/10 text-foreground'
  },
  error: {
    icon: AlertCircle,
    className: 'border-destructive/60 bg-destructive/20 text-foreground'
  },
  success: {
    icon: CheckCircle,
    className: 'border-border bg-secondary/50 text-foreground'
  },
  tip: {
    icon: Lightbulb,
    className: 'border-border bg-muted/50 text-foreground'
  },
  note: {
    icon: FileText,
    className: 'border-border/40 bg-muted/30 text-foreground'
  }
};

export const Panel: React.FC<PanelProps> = ({ children, type = 'info', title }) => {
  const config = panelConfig[type];
  const Icon = config.icon;

  return (
    <div className={`border rounded-lg p-4 my-4 ${config.className}`}>
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          {title && <div className="font-semibold mb-2">{title}</div>}
          <div>{children}</div>
        </div>
      </div>
    </div>
  );
};