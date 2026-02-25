// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Must mock GIS before importing auth
vi.stubGlobal('google', {
  accounts: {
    oauth2: {
      initTokenClient: vi.fn(() => ({ requestAccessToken: vi.fn() })),
      revoke: vi.fn(),
    },
  },
});

// sessionStorage is already available in jsdom; we just need to reset between tests
beforeEach(() => {
  sessionStorage.clear();
  vi.clearAllMocks();
});

describe('getUserInfo', () => {
  it('fetches from userinfo endpoint with Bearer token', async () => {
    sessionStorage.setItem('yt_token', 'tok123');
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ id: 'u1', name: 'Alice', email: 'a@b.com' }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const { getUserInfo } = await import('./auth.ts');
    await getUserInfo();

    expect(fetchMock).toHaveBeenCalledWith(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      { headers: { Authorization: 'Bearer tok123' } },
    );
  });

  it('returns UserInfo shaped object', async () => {
    sessionStorage.setItem('yt_token', 'tok123');
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ id: 'u1', name: 'Alice', email: 'a@b.com' }),
    })));

    const { getUserInfo } = await import('./auth.ts');
    const info = await getUserInfo();
    expect(info).toMatchObject({ id: 'u1', name: 'Alice', email: 'a@b.com' });
  });

  it('throws when getToken() is null', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { getUserInfo } = await import('./auth.ts');
    await expect(getUserInfo()).rejects.toThrow('Not signed in');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('caches result so fetch is called only once', async () => {
    sessionStorage.setItem('yt_token', 'tok123');
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ id: 'u1', name: 'Alice', email: 'a@b.com' }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const { getUserInfo } = await import('./auth.ts');
    await getUserInfo();
    await getUserInfo();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('returns the same object from cache on second call', async () => {
    sessionStorage.setItem('yt_token', 'tok123');
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ id: 'u1', name: 'Alice', email: 'a@b.com' }),
    })));

    const { getUserInfo } = await import('./auth.ts');
    const first = await getUserInfo();
    const second = await getUserInfo();
    expect(first).toEqual(second);
  });

  it('throws on non-OK response (401)', async () => {
    sessionStorage.setItem('yt_token', 'badtok');
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 401 })));

    const { getUserInfo } = await import('./auth.ts');
    await expect(getUserInfo()).rejects.toThrow('401');
  });

  it('throws on 500 response', async () => {
    sessionStorage.setItem('yt_token', 'badtok');
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500 })));

    const { getUserInfo } = await import('./auth.ts');
    await expect(getUserInfo()).rejects.toThrow('500');
  });
});

describe('switchClientId clears yt_userinfo', () => {
  it('removes yt_userinfo from sessionStorage', async () => {
    sessionStorage.setItem('yt_userinfo', '{"value":{},"timestamp":0}');
    sessionStorage.setItem('yt_active_client', '1');
    const { switchClientId } = await import('./auth.ts');
    switchClientId();
    expect(sessionStorage.getItem('yt_userinfo')).toBeNull();
  });
});

describe('signOut clears yt_userinfo', () => {
  it('removes yt_userinfo from sessionStorage', async () => {
    sessionStorage.setItem('yt_userinfo', '{"value":{},"timestamp":0}');
    const { signOut } = await import('./auth.ts');
    signOut();
    expect(sessionStorage.getItem('yt_userinfo')).toBeNull();
  });
});
