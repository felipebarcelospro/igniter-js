#!/usr/bin/env tsx

import React from 'react';
import { render } from 'ink';
import { LiaDashboardTab } from './components/lia-dashboard-tab';

// Test component to verify the dashboard works
function TestDashboard() {
  return (
    <LiaDashboardTab 
      isActive={true}
      onTabSwitch={(tabIndex) => {
        console.log('Switched to tab:', tabIndex);
      }}
    />
  );
}

// Run the test dashboard
render(<TestDashboard />);