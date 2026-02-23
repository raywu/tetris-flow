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

export function getActiveSlot(): '1' | '2' {
  return (sessionStorage.getItem(ACTIVE_CLIENT_KEY) ?? '1') as '1' | '2';
}

export function getActiveClientId(): string {
  const slot = sessionStorage.getItem(ACTIVE_CLIENT_KEY) ?? '1';
  const id1 = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID as string;
  const id2 = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID_2 as string;
  if ((import.meta as any).env.DEV) console.log('[auth] getActiveClientId slot=%s id1=%s id2=%s', slot, id1?.slice(0, 8), id2?.slice(0, 8));
  if (slot === '2' && id2) return id2;
  return id1;
}

export function switchClientId(): void {
  const current = sessionStorage.getItem(ACTIVE_CLIENT_KEY) ?? '1';
  const next = current === '1' ? '2' : '1';
  sessionStorage.setItem(ACTIVE_CLIENT_KEY, next);
  token = null;
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem('yt_recommendations');
  localStorage.removeItem('yt_subscriptions');
  if ((import.meta as any).env.DEV) console.log('[auth] switchClientId %s → %s, token + caches cleared', current, next);
}

export async function signIn(): Promise<string> {
  await loadGISScript();

  const clientId = getActiveClientId();
  if ((import.meta as any).env.DEV) console.log('[auth] signIn using clientId=%s', clientId?.slice(0, 20));
  if (!clientId) throw new Error('VITE_GOOGLE_CLIENT_ID is not set');

  return new Promise((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/youtube.force-ssl',
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
