// src/utils/backup/googleAuth.js
// Google Identity Services (GIS) OAuth token management
// Handles sign-in, token storage, and automatic refresh for Google Drive backup

const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const TOKEN_STORAGE_KEY = 'safeneighbor_google_tokens';

const getTokenStorage = () => sessionStorage;

let tokenClient = null;

/**
 * Dynamically load the Google Identity Services script
 */
export const loadGisScript = () => {
  if (window.google?.accounts?.oauth2) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    // Check if script already exists
    if (document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
      // Script tag exists but hasn't loaded yet — wait for it
      const check = setInterval(() => {
        if (window.google?.accounts?.oauth2) {
          clearInterval(check);
          resolve();
        }
      }, 100);
      setTimeout(() => {
        clearInterval(check);
        reject(new Error('GIS script load timeout'));
      }, 10000);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      // GIS may need a moment after script load
      const check = setInterval(() => {
        if (window.google?.accounts?.oauth2) {
          clearInterval(check);
          resolve();
        }
      }, 50);
      setTimeout(() => {
        clearInterval(check);
        reject(new Error('GIS not available after script load'));
      }, 5000);
    };
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
};

/**
 * Sign in with Google via OAuth popup
 * Must be called from a direct user click handler (browser popup policy)
 * @returns {Promise<{accessToken: string, expiresAt: number, email: string}>}
 */
export const signIn = () => {
  return new Promise(async (resolve, reject) => {
    try {
      await loadGisScript();

      const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
      if (!clientId) {
        reject(new Error('Google Client ID not configured. Set REACT_APP_GOOGLE_CLIENT_ID in .env'));
        return;
      }

      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: async (response) => {
          if (response.error) {
            reject(new Error(response.error_description || response.error));
            return;
          }

          // Fetch user email from userinfo endpoint
          let email = '';
          try {
            const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${response.access_token}` },
            });
            const userInfo = await userInfoRes.json();
            email = userInfo.email || '';
          } catch {
            // Email fetch is best-effort
          }

          const tokenData = {
            accessToken: response.access_token,
            expiresAt: Date.now() + (response.expires_in * 1000),
            email,
          };

          getTokenStorage().setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokenData));
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          resolve(tokenData);
        },
        error_callback: (error) => {
          reject(new Error(error.message || 'OAuth popup error'));
        },
      });

      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Sign out and revoke the Google token
 */
export const signOut = () => {
  const tokenData = getStoredToken();
  if (tokenData?.accessToken && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(tokenData.accessToken, () => {
      console.log('Google token revoked');
    });
  }
  getTokenStorage().removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  tokenClient = null;
};

/**
 * Get a valid access token, attempting silent re-auth if expired
 * @returns {Promise<string|null>} Access token or null if unavailable
 */
export const getAccessToken = async () => {
  const tokenData = getStoredToken();

  if (!tokenData) {
    return null;
  }

  // Token still valid (with 60s buffer)
  if (tokenData.expiresAt > Date.now() + 60000) {
    return tokenData.accessToken;
  }

  // Token expired — try silent re-auth
  try {
    const refreshed = await silentRefresh();
    return refreshed?.accessToken || null;
  } catch {
    return null;
  }
};

/**
 * Attempt silent token refresh (no popup)
 * Works when user has an active Google session
 */
const silentRefresh = () => {
  return new Promise(async (resolve, reject) => {
    try {
      await loadGisScript();

      const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
      if (!clientId) {
        reject(new Error('No client ID'));
        return;
      }

      const storedData = getStoredToken();

      const refreshClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: (response) => {
          if (response.error) {
            reject(new Error(response.error));
            return;
          }

          const tokenData = {
            accessToken: response.access_token,
            expiresAt: Date.now() + (response.expires_in * 1000),
            email: storedData?.email || '',
          };

          getTokenStorage().setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokenData));
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          resolve(tokenData);
        },
        error_callback: (error) => {
          reject(new Error(error.message || 'Silent refresh failed'));
        },
      });

      // prompt: 'none' for silent refresh (no popup)
      refreshClient.requestAccessToken({ prompt: 'none' });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Check if user is signed in with a non-expired token
 */
export const isSignedIn = () => {
  const tokenData = getStoredToken();
  return tokenData !== null && tokenData.expiresAt > Date.now();
};

/**
 * Get stored Google user info
 * @returns {{ email: string } | null}
 */
export const getGoogleUserInfo = () => {
  const tokenData = getStoredToken();
  if (!tokenData) return null;
  return { email: tokenData.email };
};

/**
 * Get raw stored token data
 */
const getStoredToken = () => {
  try {
    const sessionValue = getTokenStorage().getItem(TOKEN_STORAGE_KEY);
    if (sessionValue) {
      return JSON.parse(sessionValue);
    }

    const legacyValue = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!legacyValue) return null;

    const parsed = JSON.parse(legacyValue);
    getTokenStorage().setItem(TOKEN_STORAGE_KEY, legacyValue);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    return parsed;
  } catch {
    return null;
  }
};
