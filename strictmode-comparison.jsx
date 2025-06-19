import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

// 🎯 SIMPLE COMPONENT FOR TESTING
function TestComponent({ title }) {
  const [count, setCount] = useState(0);
  
  // This effect helps us see the difference
  useEffect(() => {
    console.log(`${title} - Effect ran! Count: ${count}`);
    
    return () => {
      console.log(`${title} - Cleanup ran! Count: ${count}`);
    };
  }, [count, title]);
  
  // This shows component rendering
  console.log(`${title} - Component rendered! Count: ${count}`);
  
  return (
    <div style={{ 
      border: '2px solid #333', 
      padding: '15px', 
      margin: '10px',
      backgroundColor: '#f9f9f9'
    }}>
      <h3>{title}</h3>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Click me! (+1)
      </button>
      <button onClick={() => setCount(0)} style={{ marginLeft: '10px' }}>
        Reset
      </button>
    </div>
  );
}

// 📊 COMPARISON APP
function ComparisonApp() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🔍 StrictMode vs Normal Mode</h1>
      
      {/* INSTRUCTIONS */}
      <div style={{ 
        backgroundColor: '#e7f3ff', 
        padding: '15px', 
        marginBottom: '20px',
        border: '1px solid #b3d9ff'
      }}>
        <h2>📋 How to see the difference:</h2>
        <ol>
          <li><strong>Open browser console</strong> (Press F12)</li>
          <li><strong>Click the buttons</strong> in both components below</li>
          <li><strong>Watch the console messages</strong> - you'll see the difference!</li>
        </ol>
        
        <p><strong>Expected results:</strong></p>
        <ul>
          <li>🔄 <strong>StrictMode component:</strong> Each action logs TWICE</li>
          <li>⚡ <strong>Normal component:</strong> Each action logs ONCE</li>
        </ul>
      </div>
      
      {/* STRICTMODE COMPONENT */}
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ color: '#d73527' }}>🔄 WITH StrictMode (Runs Twice)</h2>
        <div id="strictmode-root"></div>
      </div>
      
      {/* NORMAL COMPONENT */}
      <div>
        <h2 style={{ color: '#28a745' }}>⚡ WITHOUT StrictMode (Runs Once)</h2>
        <div id="normal-root"></div>
      </div>
      
      {/* EXPLANATION */}
      <div style={{ 
        backgroundColor: '#fff3cd', 
        padding: '15px', 
        marginTop: '20px',
        border: '1px solid #ffeaa7'
      }}>
        <h3>🤔 Why does StrictMode run things twice?</h3>
        <p>StrictMode intentionally runs your code twice to help you find bugs:</p>
        <ul>
          <li>🐛 <strong>Side effects:</strong> If your code breaks when run twice, it has a bug</li>
          <li>🔒 <strong>Pure functions:</strong> Good React code should work the same every time</li>
          <li>🧹 <strong>Cleanup testing:</strong> Makes sure you clean up properly</li>
          <li>⚠️ <strong>Problem detection:</strong> Finds issues before they cause crashes</li>
        </ul>
        
        <p><strong>💡 Remember:</strong> This only happens during development. Your live website runs normally!</p>
      </div>
    </div>
  );
}

// 🚀 RENDER BOTH VERSIONS
const mainRoot = ReactDOM.createRoot(document.getElementById('root'));
mainRoot.render(<ComparisonApp />);

// Create StrictMode version
setTimeout(() => {
  const strictRoot = ReactDOM.createRoot(document.getElementById('strictmode-root'));
  strictRoot.render(
    <React.StrictMode>
      <TestComponent title="🔄 StrictMode Component" />
    </React.StrictMode>
  );
  
  // Create normal version
  const normalRoot = ReactDOM.createRoot(document.getElementById('normal-root'));
  normalRoot.render(
    <TestComponent title="⚡ Normal Component" />
  );
}, 100);

// 📝 QUICK SUMMARY FOR BEGINNERS:
//
// 🎯 WHAT IS STRICTMODE?
// - A tool that helps you write better React code
// - Like a spell-checker, but for programming
// - Only works during development (not on live websites)
//
// 🔍 WHAT DOES IT DO?
// - Runs your components twice to find bugs
// - Shows warnings about old or unsafe code
// - Tests that your cleanup code works properly
// - Helps prepare for future React versions
//
// 🤷‍♂️ SHOULD I USE IT?
// - YES! Always keep it enabled
// - It makes your code more reliable
// - It catches bugs before users see them
// - It's free quality assurance
//
// 🚨 COMMON CONFUSION:
// - "My code runs twice!" - That's intentional and good!
// - "It's slower!" - Only during development, not in production
// - "Should I remove it?" - No, fix the underlying issues instead
//
// 💡 THINK OF IT LIKE:
// - A practice test before the real exam
// - A safety net that catches you when you fall
// - A helpful friend who points out your mistakes
// - Training wheels that make you a better developer 