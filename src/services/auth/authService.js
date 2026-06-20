import { supabase } from '../supabase/client.js';

let sessionCache = null;

/**
 * Exchanges an OAuth authorization code for a Supabase session.
 * Ensures the operation is only attempted once for a given code.
 *
 * @param {string} code The authorization code from the OAuth provider.
 * @returns {Promise<any>}
 */
export async function exchangeOAuthCodeOnce(code) {
  console.log('STEP 5 exchangeCodeForSession');
  const key = `pkce:${code}`;
  if (window.__aimeasyOAuthCallbackKey === key) {
    return window.__aimeasyOAuthCallbackPromise;
  }
  window.__aimeasyOAuthCallbackKey = key;

  console.log('=== EXCHANGE START ===');
  console.log('CODE:', code);
  const resultPromise = supabase.auth.exchangeCodeForSession(code);
  
  window.__aimeasyOAuthCallbackPromise = resultPromise.then(result => {
    console.log('=== EXCHANGE RESULT ===');
    console.log(result);
    return result;
  });

  return window.__aimeasyOAuthCallbackPromise;
}

/**
 * Clears the session cache.
 */
export function invalidateSessionCache() {
  sessionCache = null;
}

/**
 * Retrieves the Supabase session, caching the result to avoid redundant calls.
 * @returns {Promise<any>}
 */
export function getSessionOnce() {
  if (sessionCache) {
    return sessionCache;
  }
  sessionCache = supabase.auth.getSession();
  return sessionCache;
}

/**
 * Wraps an auth-related promise with a timeout.
 * @param {Promise<any>} promise The promise to wrap.
 * @param {string} label A label for the operation for logging purposes.
 * @returns {Promise<any>}
 */
export async function withAuthTimeout(promise, label = 'operation') {
  const timeout = 15000; // 15 seconds
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const error = new Error(`Supabase auth timeout: ${label}`);
      console.warn(error.message);
      reject(error);
    }, timeout);

    Promise.resolve(promise)
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

/**
 * Initiates the Google OAuth sign-in flow.
 * @param {string} role The role selected by the user.
 */
export async function signInWithGoogle(role) {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            queryParams: {
                access_type: 'offline',
                prompt: 'consent',
            },
            redirectTo: 'http://127.0.0.1:5173',
        },
    });

    if (error) {
        console.error('Google Sign-In Error:', error);
        throw error;
    }

    return data;
}
