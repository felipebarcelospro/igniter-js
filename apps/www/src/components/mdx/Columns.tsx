import React, { ReactNode } from 'react';

interface ColumnsProps {
  children: ReactNode;
  cols?: number;
  gap?: 'sm' | 'md' | 'lg';
}

interface ColumnProps {
  children: ReactNode;
  span?: number;
}

const gapClasses = {
  sm: 'gap-4',
  md: 'gap-6',
  lg: 'gap-8'
};

export const Columns: React.FC<ColumnsProps> = ({ children, cols = 2, gap = 'md' }) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  };

  return (
    <div className={`grid ${gridCols[cols as keyof typeof gridCols] || gridCols[2]} ${gapClasses[gap]} my-6`}>
      {children}
    </div>
  );
};

export const Column: React.FC<ColumnProps> = ({ children, span = 1 }) => {
  const spanClasses = {
    1: 'col-span-1',
    2: 'col-span-2',
    3: 'col-span-3',
    4: 'col-span-4'
  };

  return (
    <div className={spanClasses[span as keyof typeof spanClasses] || spanClasses[1]}>
      {children}
    </div>
  );
};