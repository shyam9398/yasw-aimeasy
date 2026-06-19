import React from 'react';
import { Analytics } from '@vercel/analytics/react';
import { AuthProvider } from './services/auth/AuthProvider.jsx';
import AuthenticatedLegacyApp from './components/legacy-shell/LegacyAppShell.jsx';
import { supabase } from './services/supabase/client.js';

if (window.location.search.includes('ssg')) {
  // Disable all scripts for SSG
} else {
  window.supabase = supabase;
  window.__AIMEASY_SUPABASE__ = supabase;
  window.dispatchEvent(new CustomEvent('__aimeasy_supabase_ready__'));
}

function App() {
  return (
    <React.Fragment>
      <AuthProvider>
        <AuthenticatedLegacyApp />
      </AuthProvider>
      <Analytics />
    </React.Fragment>
  );
}

export default App;
