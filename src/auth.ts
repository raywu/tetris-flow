const SESSION_KEY = 'yt_token';
const ACTIVE_CLIENT_KEY = 'yt_active_client';
let token: string | null = null;

function loadGISScript(): Promise<void> {
  if (document.querySelector('script[src*="accounts.google.com/gsi/client"]')) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load GIS script'));
    document.head.appendChild(script);
  });
}

export function getActiveClientId(): string {
  const slot = sessionStorage.getItem(ACTIVE_CLIENT_KEY) ?? '1';
  if (slot === '2') {
    const id2 = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID_2 as string;
    if (id2) return id2;
  }
  return (import.meta as any).env.VITE_GOOGLE_CLIENT_ID as string;
}

export function switchClientId(): void {
  const current = sessionStorage.getItem(ACTIVE_CLIENT_KEY) ?? '1';
  sessionStorage.setItem(ACTIVE_CLIENT_KEY, current === '1' ? '2' : '1');
  token = null;
  sessionStorage.removeItem(SESSION_KEY);
}

export async function signIn(): Promise<string> {
  await loadGISScript();

  const clientId = getActiveClientId();
  if (!clientId) throw new Error('VITE_GOOGLE_CLIENT_ID is not set');

  return new Promise((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/youtube.readonly',
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error_description ?? response.error));
          return;
        }
        token = response.access_token;
        sessionStorage.setItem(SESSION_KEY, token);
        resolve(token);
      },
    });
    client.requestAccessToken({ prompt: 'consent' });
  });
}

export function signOut(): void {
  if (token) {
    google.accounts.oauth2.revoke(token, () => {});
    token = null;
  }
  sessionStorage.removeItem(SESSION_KEY);
}

export function getToken(): string | null {
  return token ?? sessionStorage.getItem(SESSION_KEY);
}
