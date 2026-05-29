import axios from 'axios';
import type { AxiosRequestConfig } from 'axios';
import md5 from 'crypto-js/md5';

const SESSION_KEY = 'navidromeSession';
const API_VERSION = '1.16.1';
const CLIENT_ID = 'SyfomDesktop';

export type NavidromeSession = {
  serverUrl: string;
  username: string;
  token: string;
  salt: string;
};

export type NavidromeRequestConfig = AxiosRequestConfig & {
  session?: NavidromeSession | null;
};

type AuthParams = {
  u: string;
  t: string;
  s: string;
  v: string;
  c: string;
  f: 'json';
};

type QueryParams = Record<string, string | number | boolean | null | undefined>;

export type SubsonicWrapper = {
  status?: string;
  error?: {
    code?: string | number;
    message?: string;
  };
} & Record<string, unknown>;

type SubsonicResponse = {
  'subsonic-response'?: SubsonicWrapper;
};

function randomSalt(length = 8): string {
  return Math.random()
    .toString(36)
    .slice(2, 2 + length);
}

function isNavidromeSession(value: unknown): value is NavidromeSession {
  if (!value || typeof value !== 'object') return false;
  const session = value as Partial<NavidromeSession>;
  return Boolean(
    session.serverUrl && session.username && session.token && session.salt
  );
}

export function normalizeServerUrl(serverUrl?: string): string {
  const input = (serverUrl || '').trim();
  if (!input) return '';
  const withProtocol = /^https?:\/\//i.test(input) ? input : `http://${input}`;
  return withProtocol.replace(/\/+$/, '');
}

export function readSession(): NavidromeSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isNavidromeSession(parsed)) {
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn('[navidrome] failed to parse session:', error);
    return null;
  }
}

export function writeSession(session: NavidromeSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function hasSession(): boolean {
  return Boolean(readSession());
}

export function createToken(password: string, salt: string): string {
  return md5(`${password}${salt}`).toString();
}

export function buildAuthParams(session = readSession()): AuthParams {
  if (!session) {
    throw new Error('No Navidrome session');
  }

  return {
    u: session.username,
    t: session.token,
    s: session.salt,
    v: API_VERSION,
    c: CLIENT_ID,
    f: 'json',
  };
}

function buildEndpointUrl(endpoint: string, session = readSession()): string {
  const activeSession = session || readSession();
  if (!activeSession?.serverUrl) {
    throw new Error('No Navidrome session');
  }
  return `${activeSession.serverUrl}/rest/${endpoint}.view`;
}

export function buildAuthenticatedUrl(
  endpoint: string,
  params: QueryParams = {},
  session = readSession()
): string {
  const activeSession = session || readSession();
  const url = buildEndpointUrl(endpoint, activeSession);
  const query = new URLSearchParams({
    ...buildAuthParams(activeSession),
    ...Object.entries(params).reduce<Record<string, string>>(
      (acc, [key, value]) => {
        if (value === undefined || value === null || value === '') return acc;
        acc[key] = String(value);
        return acc;
      },
      {}
    ),
  });
  return `${url}?${query.toString()}`;
}

function unwrapSubsonicResponse(data: SubsonicResponse): SubsonicWrapper {
  const wrapper = data?.['subsonic-response'];
  if (!wrapper) {
    throw new Error('Invalid OpenSubsonic response');
  }

  if (wrapper.status === 'failed') {
    const message = wrapper.error?.message || 'OpenSubsonic request failed';
    const code = wrapper.error?.code;
    const error = new Error(code ? `${message} (code: ${code})` : message);
    Object.assign(error, { code });
    throw error;
  }

  return wrapper;
}

export async function requestSubsonic(
  endpoint: string,
  params?: QueryParams,
  config?: NavidromeRequestConfig
): Promise<SubsonicWrapper>;
export async function requestSubsonic<T>(
  endpoint: string,
  params?: QueryParams,
  config?: NavidromeRequestConfig
): Promise<T>;
export async function requestSubsonic<T = SubsonicWrapper>(
  endpoint: string,
  params: QueryParams = {},
  config: NavidromeRequestConfig = {}
): Promise<T> {
  const { session: configSession, ...axiosConfig } = config;
  const session = configSession || readSession();
  const url = buildEndpointUrl(endpoint, session);
  const response = await axios({
    url,
    method: axiosConfig.method || 'get',
    params: {
      ...buildAuthParams(session),
      ...params,
    },
    timeout: 15000,
    ...axiosConfig,
  });

  return unwrapSubsonicResponse(response.data) as T;
}

export async function loginWithPassword({
  serverUrl,
  username,
  password,
}: {
  serverUrl: string;
  username: string;
  password: string;
}): Promise<NavidromeSession> {
  const normalizedServerUrl = normalizeServerUrl(serverUrl);
  if (!normalizedServerUrl) throw new Error('服务器地址不能为空');
  if (!username) throw new Error('用户名不能为空');
  if (!password) throw new Error('密码不能为空');

  const salt = randomSalt(8);
  const token = createToken(password, salt);

  const session = {
    serverUrl: normalizedServerUrl,
    username,
    token,
    salt,
  };

  const response = await axios({
    url: `${normalizedServerUrl}/rest/ping.view`,
    method: 'get',
    params: {
      ...buildAuthParams(session),
    },
    timeout: 15000,
  });

  unwrapSubsonicResponse(response.data);
  writeSession(session);
  return session;
}

export function buildCoverArtUrl(coverArtId?: string, size = 512): string {
  if (!coverArtId) return '';
  return buildAuthenticatedUrl('getCoverArt', {
    id: coverArtId,
    size,
  });
}

export function buildCoverArtUrlForSession(
  coverArtId?: string,
  size = 512,
  session?: NavidromeSession | null
): string {
  if (!coverArtId) return '';
  return buildAuthenticatedUrl(
    'getCoverArt',
    {
      id: coverArtId,
      size,
    },
    session || readSession()
  );
}

export function buildAvatarUrl(): string {
  return '/img/logos/yesplaymusic.png';
}

function getConfiguredMaxBitRate(): number | undefined {
  try {
    const settings = JSON.parse(localStorage.getItem('settings') || '{}') as {
      musicQuality?: string | number;
    };
    const quality = settings.musicQuality;
    if (quality === 'flac' || quality === '999000') return undefined;
    const bitRate = Number(quality || 320000);
    if (!Number.isFinite(bitRate) || bitRate <= 0) return undefined;
    return Math.round(bitRate / 1000);
  } catch (_error) {
    return undefined;
  }
}

export function buildStreamUrl(songId?: string): string {
  if (!songId) return '';
  return buildAuthenticatedUrl('stream', {
    id: songId,
    maxBitRate: getConfiguredMaxBitRate(),
  });
}

export function buildStreamUrlForSession(
  songId?: string,
  session?: NavidromeSession | null
): string {
  if (!songId) return '';
  return buildAuthenticatedUrl(
    'stream',
    {
      id: songId,
      maxBitRate: getConfiguredMaxBitRate(),
    },
    session || readSession()
  );
}
