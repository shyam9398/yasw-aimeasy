
console.log('STEP 1 main.jsx');
import './main.js';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/global.css';
import { AuthProvider } from './services/auth/AuthProvider.jsx';

console.log('[main.jsx] Initializing React...');

const root = document.getElementById('root');

if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </React.StrictMode>
  );
} else {
  console.error('Root element not found. React app cannot be mounted.');
}

window.__aimeasyStarted = true;
console.log('[main.jsx] React app initialized and mounted.');
