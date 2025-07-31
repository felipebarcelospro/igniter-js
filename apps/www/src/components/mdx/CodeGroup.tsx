'use client';

import React, { useState, ReactNode, Children, isValidElement } from 'react';

interface CodeGroupProps {
  children: ReactNode;
}

interface CodeProps {
  title?: string;
  children: ReactNode;
}

export const Code: React.FC<CodeProps> = ({ title, children }) => {
  return (
    <div data-title={title}>
      {children}
    </div>
  );
};

export const CodeGroup: React.FC<CodeGroupProps> = ({ children }) => {
  const [activeTab, setActiveTab] = useState(0);
  
  const childrenArray = Children.toArray(children);
  const tabs = childrenArray.map((child, index) => {
    if (isValidElement(child) && child.props.title) {
      return {
        title: child.props.title,
        content: child
      };
    }
    return {
      title: `Code ${index + 1}`,
      content: child
    };
  });

  return (
    <div className="my-6 border border-border rounded-lg overflow-hidden">
      <div className="flex bg-muted/30 border-b border-border">
        {tabs.map((tab, index) => (
          <button
            key={index}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === index
                ? 'bg-background text-foreground border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab(index)}
          >
            {tab.title}
          </button>
        ))}
      </div>
      <div className="relative">
        {tabs[activeTab]?.content}
      </div>
    </div>
  );
};