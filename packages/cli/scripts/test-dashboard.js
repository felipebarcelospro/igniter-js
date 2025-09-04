#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Testing Igniter.js Ink Dashboard...\n');

// Test if the dashboard can be built
console.log('1. Testing TypeScript compilation...');
const tsc = spawn('npx', ['tsc', '--noEmit'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit'
});

tsc.on('close', (code) => {
  if (code === 0) {
    console.log('✅ TypeScript compilation successful\n');
    
    // Test if the dashboard can be imported
    console.log('2. Testing dashboard import...');
    try {
      const { LiaDashboardTab } = require('../dist/dashboard/components/lia-dashboard-tab');
      console.log('✅ Dashboard components imported successfully\n');
      
      console.log('3. Testing Ink dependencies...');
      try {
        require('ink');
        require('react');
        console.log('✅ Ink and React dependencies available\n');
        
        console.log('🎉 All tests passed! The Ink dashboard is ready to use.');
        console.log('\nTo test the dashboard:');
        console.log('1. Run: npm run build');
        console.log('2. Run: igniter dev');
        console.log('3. Press "l" to switch to the Lia Dashboard tab');
        
      } catch (error) {
        console.log('❌ Missing Ink or React dependencies:', error.message);
        console.log('Run: npm install ink react @types/react');
      }
    } catch (error) {
      console.log('❌ Dashboard components not found:', error.message);
      console.log('Run: npm run build first');
    }
  } else {
    console.log('❌ TypeScript compilation failed');
    process.exit(1);
  }
});