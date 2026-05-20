import axios from 'axios';
import { withAudioMetadata } from './audio';

const DEFAULT_TIMEOUT = 15000;

const sessionCredentials = new Map();

export function normalizeWebdavUrl(serverUrl) {
  const input = (serverUrl || '').trim();
  if (!input) return '';
  const withProtocol = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  return withProtocol.replace(/\/+$/, '');
}

export function normalizeWebdavPath(path = '/') {
  const input = String(path || '/').trim();
  if (!input || input === '/') return '/';
  return `/${input.replace(/^\/+|\/+$/g, '')}`;
}

export function joinWebdavUrl(serverUrl, path = '/') {
  const normalizedServerUrl = normalizeWebdavUrl(serverUrl);
  const normalizedPath = normalizeWebdavPath(path);
  return `${normalizedServerUrl}${
    normalizedPath === '/' ? '' : normalizedPath
  }`;
}

export function buildWebdavSourceKey({ serverUrl, username } = {}) {
  return `webdav:${normalizeWebdavUrl(serverUrl)}:${username || ''}`;
}

export function rememberWebdavCredentials(params = {}) {
  const sourceKey = buildWebdavSourceKey(params);
  sessionCredentials.set(sourceKey, {
    serverUrl: normalizeWebdavUrl(params.serverUrl),
    username: params.username || '',
    password: params.password || '',
  });
  return sourceKey;
}

export function getRememberedWebdavCredentials(sourceKey) {
  return sessionCredentials.get(sourceKey) || null;
}

function buildAuthHeader({ username, password } = {}) {
  if (!username && !password) return undefined;
  return `Basic ${encodeBase64(`${username || ''}:${password || ''}`)}`;
}

function encodeBase64(value) {
  if (typeof TextEncoder === 'function' && typeof btoa === 'function') {
    const bytes = new TextEncoder().encode(value);
    let binary = '';
    bytes.forEach(byte => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  }

  return btoa(value);
}

export function createWebdavConfig({ username, password, headers } = {}) {
  const authorization = buildAuthHeader({ username, password });
  return {
    timeout: DEFAULT_TIMEOUT,
    headers: {
      ...(authorization ? { Authorization: authorization } : {}),
      ...(headers || {}),
    },
  };
}

export function requestWebdav({ method = 'GET', serverUrl, path, ...config }) {
  const url = joinWebdavUrl(serverUrl, path);
  if (!url) throw new Error('WebDAV server URL is required');

  return axios({
    url,
    method,
    ...config,
  });
}

export async function propfind({
  serverUrl,
  path = '/',
  depth = 1,
  ...config
}) {
  return requestWebdav({
    method: 'PROPFIND',
    serverUrl,
    path,
    data: `<?xml version="1.0" encoding="utf-8" ?><D:propfind xmlns:D="DAV:"><D:prop><D:resourcetype/><D:getcontentlength/><D:getlastmodified/><D:getetag/><D:getcontenttype/></D:prop></D:propfind>`,
    ...config,
    headers: {
      Depth: String(depth),
      'Content-Type': 'application/xml; charset=utf-8',
      ...(config.headers || {}),
    },
  });
}

function getFirstElement(node, localName) {
  return Array.from(node.getElementsByTagName('*')).find(
    child => child.localName === localName
  );
}

function getNodeText(node, localName) {
  const child = getFirstElement(node, localName);
  return child?.textContent || '';
}

function parseWebdavDate(value) {
  const time = Date.parse(value);
  return Number.isNaN(time) ? 0 : time;
}

function decodeHrefPath(href) {
  try {
    const url = new URL(href, 'http://webdav.local');
    return decodeURIComponent(url.pathname);
  } catch (error) {
    return decodeURIComponent(href.split('?')[0] || href);
  }
}

function stripServerRootPath(path, serverUrl) {
  const normalizedPath = normalizeWebdavPath(path);
  if (!serverUrl) return normalizedPath;

  try {
    const rootPath = normalizeWebdavPath(
      new URL(normalizeWebdavUrl(serverUrl)).pathname
    );
    if (rootPath === '/') return normalizedPath;
    if (normalizedPath === rootPath) return '/';
    if (normalizedPath.startsWith(`${rootPath}/`)) {
      return normalizeWebdavPath(normalizedPath.slice(rootPath.length));
    }
  } catch (error) {
    return normalizedPath;
  }

  return normalizedPath;
}

export function parsePropfindResponse(
  xml,
  requestedPath = '/',
  serverUrl = ''
) {
  const parser = new DOMParser();
  const document = parser.parseFromString(xml || '', 'application/xml');
  const parserError = document.querySelector('parsererror');
  if (parserError) {
    throw new Error('Invalid WebDAV PROPFIND response');
  }

  const basePath = normalizeWebdavPath(requestedPath);
  const responses = Array.from(
    document.getElementsByTagNameNS('DAV:', 'response')
  );

  return responses
    .map(response => {
      const href = getNodeText(response, 'href');
      const path = stripServerRootPath(decodeHrefPath(href), serverUrl);
      const resourceType = getFirstElement(response, 'resourcetype');
      const isDirectory = Boolean(
        getFirstElement(resourceType || response, 'collection')
      );
      const name = path === '/' ? '/' : path.split('/').filter(Boolean).pop();

      return withAudioMetadata({
        href,
        path,
        name,
        isDirectory,
        contentLength: Number(getNodeText(response, 'getcontentlength')) || 0,
        contentType: getNodeText(response, 'getcontenttype'),
        etag: getNodeText(response, 'getetag'),
        lastModified: parseWebdavDate(getNodeText(response, 'getlastmodified')),
      });
    })
    .filter(item => item.path !== basePath);
}

export async function listDirectory({
  serverUrl,
  username,
  password,
  path = '/',
}) {
  const response = await propfind({
    serverUrl,
    path,
    depth: 1,
    ...createWebdavConfig({ username, password }),
  });

  return parsePropfindResponse(response.data, path, serverUrl).sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export async function downloadFile({
  serverUrl,
  username,
  password,
  path,
  responseType = 'arraybuffer',
}) {
  const response = await requestWebdav({
    method: 'GET',
    serverUrl,
    path,
    responseType,
    ...createWebdavConfig({ username, password }),
  });

  return response.data;
}

export async function testConnection({ serverUrl, username, password, path }) {
  const response = await propfind({
    serverUrl,
    path,
    depth: 0,
    ...createWebdavConfig({ username, password }),
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`WebDAV connection failed with status ${response.status}`);
  }

  return {
    ok: true,
    status: response.status,
    serverUrl: normalizeWebdavUrl(serverUrl),
    path: normalizeWebdavPath(path),
  };
}
