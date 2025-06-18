// Entry point for the React application. This file is responsible for bootstrapping
// the React component tree and rendering it into the DOM.

// Core React library for building component-based user interfaces.
import React from 'react';

// ReactDOM's modern client entry (introduced in React 18) that provides the new
// `createRoot` API for concurrent rendering capabilities.
import ReactDOM from 'react-dom/client';

// Global styles that apply to the entire application. Adjust this file to tweak
// your base CSS (resets, variables, typography, etc.).
import './index.css';

// The root component of your application. All other pages/components should be
// composed underneath `App`.
import App from './App';

// Obtain a reference to the root DOM element (a <div id="root"> in public/index.html)
// and tell React where it should mount the component tree.
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement // Non-null assertion ensures TS that the element exists.
);

// Kick off rendering!
// React.StrictMode is a development-only helper that activates additional
// warnings and checks to highlight potential problems in an application.
// It does NOT render any visible UI element itself.
root.render(
  <React.StrictMode>
    {/* Your entire app lives inside the App component */}
    <App />
  </React.StrictMode>
);