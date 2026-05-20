import * as navidromeProvider from './navidrome';
import * as webdavProvider from './webdav';

const DEFAULT_PROVIDER_KEY = 'navidrome';

const providers = {
  navidrome: navidromeProvider,
  webdav: webdavProvider,
};

let activeProviderKey = readActiveProviderKey();

function readData() {
  try {
    return JSON.parse(localStorage.getItem('data')) || {};
  } catch (error) {
    return {};
  }
}

function writeData(data) {
  localStorage.setItem('data', JSON.stringify(data));
}

function readActiveProviderKey() {
  const data = readData();
  const key = data.activeProvider || DEFAULT_PROVIDER_KEY;
  const source = data.sources?.[key];
  if (source && source.enabled === false) return DEFAULT_PROVIDER_KEY;
  return providers[key] ? key : DEFAULT_PROVIDER_KEY;
}

export function getProvider(key) {
  return providers[key] || null;
}

export function getActiveProvider() {
  activeProviderKey = readActiveProviderKey();
  return getProvider(activeProviderKey) || navidromeProvider;
}

export function setActiveProvider(key, { persist = true } = {}) {
  if (!providers[key]) {
    throw new Error(`Unknown provider: ${key}`);
  }
  activeProviderKey = key;
  if (persist) {
    writeData({
      ...readData(),
      activeProvider: key,
    });
  }
}

export function getActiveProviderKey() {
  activeProviderKey = readActiveProviderKey();
  return activeProviderKey;
}

export function listProviders() {
  return Object.keys(providers).map(key => ({
    key,
    provider: providers[key],
    capabilities: providers[key].capabilities || {},
    name: providers[key].name || key,
  }));
}
