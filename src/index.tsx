// Entry point for the React application. This file is responsible for bootstrapping
// This is the entry point of our React application - it's responsible for
// "bootstrapping" (starting up) the React component tree and rendering it into the DOM.
// "Bootstrapping" means "getting things started."

// Core React library for building component-based user interfaces.
// This gives us access to React components, hooks, and other React features.
import React from 'react';

// ReactDOM's modern client entry (introduced in React 18) that provides the new
// `createRoot` API for concurrent rendering capabilities and better performance.
// This is what connects React to the actual HTML DOM in the browser.
import ReactDOM from 'react-dom/client';

// Global styles that apply to the entire application. Adjust this file to tweak
// your base CSS (resets, variables, typography, etc.).
import './index.css';

// The root component of your application. All other pages/components should be
// composed underneath `App`. Think of App as the top-level container for everything.
import App from './App';

// STEP 1: Create a React "root" that will manage our component tree
// This connects React to the HTML <div id="root"></div> element in public/index.html
// Think of this as telling React: "Use this HTML element as your canvas"
const root = ReactDOM.createRoot(
  // Find the HTML element with id="root" in the DOM
  document.getElementById('root') as HTMLElement // TypeScript assertion: we're confident this element exists
);

// STEP 2: Start rendering our React components into that root element!
// This is where the magic happens - React takes over the empty <div id="root">
// and fills it with all our dynamic components and content.
root.render(
  // StrictMode is a development helper that:
  // - Detects unsafe lifecycles and deprecated APIs
  // - Warns about legacy string ref API usage  
  // - Helps identify components with unsafe side effects
  // It's invisible in production and doesn't affect the actual UI
  <React.StrictMode>
    {/* 
      Your entire application starts here with the App component.
      Everything you see on the webpage will be rendered through this component tree.
      App -> other components -> more components -> etc.
    */}
    <App />
  </React.StrictMode>
);