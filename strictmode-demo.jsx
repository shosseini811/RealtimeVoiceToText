import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

// 🎯 WHAT IS STRICTMODE?
// StrictMode is like a "safety checker" for your React code
// It helps you find problems BEFORE they become bugs in production
// Think of it like spell-check for your React components!

// 📝 SIMPLE EXAMPLE COMPONENT
function CounterExample() {
  const [count, setCount] = useState(0);
  
  // This useEffect will help us see what StrictMode does
  useEffect(() => {
    console.log('🔄 Effect ran! Count is:', count);
    
    // Cleanup function - runs when component unmounts or effect re-runs
    return () => {
      console.log('🧹 Cleanup ran for count:', count);
    };
  }, [count]); // This effect runs whenever 'count' changes
  
  // This console.log will also show us StrictMode behavior
  console.log('🎨 Component rendered with count:', count);
  
  return (
    <div style={{ padding: '20px', border: '2px solid blue', margin: '10px' }}>
      <h3>Counter Example</h3>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Add 1
      </button>
      <button onClick={() => setCount(0)} style={{ marginLeft: '10px' }}>
        Reset
      </button>
    </div>
  );
}

// 🐛 PROBLEMATIC COMPONENT - Shows what StrictMode catches
function ProblematicTimer() {
  const [seconds, setSeconds] = useState(0);
  
  useEffect(() => {
    console.log('⏰ Timer effect started');
    
    // This creates a timer that updates every second
    const timer = setInterval(() => {
      setSeconds(prev => prev + 1);
      console.log('⏰ Timer tick');
    }, 1000);
    
    // IMPORTANT: We return a cleanup function
    // This stops the timer when component unmounts
    return () => {
      console.log('🛑 Timer cleanup - stopping timer');
      clearInterval(timer);
    };
  }, []); // Empty array = run once when component mounts
  
  return (
    <div style={{ padding: '20px', border: '2px solid red', margin: '10px' }}>
      <h3>Timer Example</h3>
      <p>Seconds: {seconds}</p>
      <p>Watch the console to see timer behavior!</p>
    </div>
  );
}

// 🎭 MAIN DEMO APP
function StrictModeDemo() {
  const [showTimer, setShowTimer] = useState(false);
  const [useStrictMode, setUseStrictMode] = useState(true);
  
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>🎯 React StrictMode Demo</h1>
      
      {/* EXPLANATION SECTION */}
      <div style={{ backgroundColor: '#f0f8ff', padding: '15px', marginBottom: '20px' }}>
        <h2>What does StrictMode do?</h2>
        <ul>
          <li>🔍 <strong>Finds bugs early:</strong> Runs your code twice to catch problems</li>
          <li>⚠️ <strong>Shows warnings:</strong> Alerts you about old or unsafe code</li>
          <li>🧹 <strong>Tests cleanup:</strong> Makes sure you clean up properly</li>
          <li>🚀 <strong>Only in development:</strong> Doesn't affect your live website</li>
        </ul>
      </div>
      
      {/* CONTROLS */}
      <div style={{ marginBottom: '20px' }}>
        <label>
          <input 
            type="checkbox" 
            checked={useStrictMode}
            onChange={(e) => setUseStrictMode(e.target.checked)}
          />
          Use StrictMode (toggle to see difference)
        </label>
        
        <button 
          onClick={() => setShowTimer(!showTimer)}
          style={{ marginLeft: '20px', padding: '5px 10px' }}
        >
          {showTimer ? 'Hide Timer' : 'Show Timer'}
        </button>
      </div>
      
      {/* INSTRUCTIONS */}
      <div style={{ backgroundColor: '#fff3cd', padding: '15px', marginBottom: '20px' }}>
        <h3>📋 Instructions:</h3>
        <ol>
          <li>Open your browser's console (F12)</li>
          <li>Click the counter button and watch console messages</li>
          <li>Toggle StrictMode on/off and notice the difference</li>
          <li>Show/hide the timer to see cleanup behavior</li>
        </ol>
      </div>
      
      {/* DEMO COMPONENTS */}
      <CounterExample />
      
      {showTimer && <ProblematicTimer />}
      
      {/* EXPLANATION OF WHAT YOU'LL SEE */}
      <div style={{ backgroundColor: '#d4edda', padding: '15px', marginTop: '20px' }}>
        <h3>🔍 What you'll see in console:</h3>
        <p><strong>With StrictMode ON:</strong></p>
        <ul>
          <li>Components render TWICE (you'll see double console.log messages)</li>
          <li>Effects run TWICE (you'll see double "Effect ran" messages)</li>
          <li>This helps catch bugs where you depend on things running only once</li>
        </ul>
        
        <p><strong>With StrictMode OFF:</strong></p>
        <ul>
          <li>Components render ONCE (normal behavior)</li>
          <li>Effects run ONCE (normal behavior)</li>
          <li>But you might miss bugs that only show up in certain conditions</li>
        </ul>
      </div>
    </div>
  );
}

// 🚀 RENDER THE APP
const root = ReactDOM.createRoot(document.getElementById('root'));

// You can switch between these two to see the difference:
root.render(
  <React.StrictMode>
    <StrictModeDemo />
  </React.StrictMode>
);

// Try commenting out the StrictMode wrapper above and uncommenting this:
// root.render(<StrictModeDemo />);

// 📚 SIMPLE EXPLANATION:
// 
// StrictMode is like having a helpful teacher who:
// 1. Makes you do your homework twice to catch mistakes
// 2. Warns you when you're using old or dangerous methods
// 3. Makes sure you clean up your mess properly
// 4. Only does this during practice (development), not during the real test (production)
//
// WHY IS THIS HELPFUL?
// - Catches bugs early when they're easier to fix
// - Prepares your code for future React versions
// - Makes your app more reliable and faster
// - Teaches you good coding habits
//
// WHEN DOES IT RUN?
// - Only during development (when you're coding)
// - Never affects your live website
// - Automatically disabled in production builds
//
// WHAT SHOULD YOU DO?
// - Keep StrictMode enabled (it's good for you!)
// - Fix any warnings it shows you
// - Don't worry about the double rendering - it's intentional
// - Think of it as free quality assurance for your code 