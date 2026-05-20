import axios from 'axios';
import md5 from 'crypto-js/md5';

const SESSION_KEY = 'navidromeSession';
const API_VERSION = '1.16.1';
const CLIENT_ID = 'SyfomDesktop';

function randomSalt(length = 8) {
  return Math.random()
    .toString(36)
    .slice(2, 2 + length);
}

export function normalizeServerUrl(serverUrl) {
  const input = (serverUrl || '').trim();
  if (!input) return '';
  const withProtocol = /^https?:\/\//i.test(input) ? input : `http://${input}`;
  return withProtocol.replace(/\/+$/, '');
}

export function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      !parsed?.serverUrl ||
      !parsed?.username ||
      !parsed?.token ||
      !parsed?.salt
    ) {
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn('[navidrome] failed to parse session:', error);
    return null;
  }
}

export function writeSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function hasSession() {
  return Boolean(readSession());
}

export function createToken(password, salt) {
  return md5(`${password}${salt}`).toString();
}

export function buildAuthParams(session = readSession()) {
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

function buildEndpointUrl(endpoint, session = readSession()) {
  const activeSession = session || readSession();
  if (!activeSession?.serverUrl) {
    throw new Error('No Navidrome session');
  }
  return `${activeSession.serverUrl}/rest/${endpoint}.view`;
}

export function buildAuthenticatedUrl(
  endpoint,
  params = {},
  session = readSession()
) {
  const activeSession = session || readSession();
  const url = buildEndpointUrl(endpoint, activeSession);
  const query = new URLSearchParams({
    ...buildAuthParams(activeSession),
    ...Object.entries(params).reduce((acc, [key, value]) => {
      if (value === undefined || value === null || value === '') return acc;
      acc[key] = String(value);
      return acc;
    }, {}),
  });
  return `${url}?${query.toString()}`;
}

function unwrapSubsonicResponse(data) {
  const wrapper = data?.['subsonic-response'];
  if (!wrapper) {
    throw new Error('Invalid OpenSubsonic response');
  }

  if (wrapper.status === 'failed') {
    const message = wrapper.error?.message || 'OpenSubsonic request failed';
    const code = wrapper.error?.code;
    const error = new Error(code ? `${message} (code: ${code})` : message);
    error.code = code;
    throw error;
  }

  return wrapper;
}

export async function requestSubsonic(endpoint, params = {}, config = {}) {
  const session = readSession();
  const url = buildEndpointUrl(endpoint, session);
  const response = await axios({
    url,
    method: config.method || 'get',
    params: {
      ...buildAuthParams(session),
      ...params,
    },
    timeout: 15000,
    ...config,
  });

  return unwrapSubsonicResponse(response.data);
}

export async function loginWithPassword({ serverUrl, username, password }) {
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

export function buildCoverArtUrl(coverArtId, size = 512) {
  if (!coverArtId) return '';
  return buildAuthenticatedUrl('getCoverArt', {
    id: coverArtId,
    size,
  });
}

export function buildAvatarUrl() {
  return '/img/logos/yesplaymusic.png';
}

function getConfiguredMaxBitRate() {
  try {
    const settings = JSON.parse(localStorage.getItem('settings')) || {};
    const quality = settings.musicQuality;
    if (quality === 'flac' || quality === '999000') return undefined;
    const bitRate = Number(quality || 320000);
    if (!Number.isFinite(bitRate) || bitRate <= 0) return undefined;
    return Math.round(bitRate / 1000);
  } catch (error) {
    return undefined;
  }
}

export function buildStreamUrl(songId) {
  if (!songId) return '';
  return buildAuthenticatedUrl('stream', {
    id: songId,
    maxBitRate: getConfiguredMaxBitRate(),
  });
}
