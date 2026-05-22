import * as navidromeProvider from './navidrome';

const DEFAULT_PROVIDER_KEY = 'navidrome';

type ProviderKey = 'navidrome';
type Provider = typeof navidromeProvider;
type ProviderData = {
  activeProvider?: ProviderKey;
  sources?: Partial<Record<ProviderKey, { enabled?: boolean }>>;
};

const providers: Record<ProviderKey, Provider> = {
  navidrome: navidromeProvider,
};

let activeProviderKey = readActiveProviderKey();

function readData(): ProviderData {
  try {
    return JSON.parse(localStorage.getItem('data')) || {};
  } catch (_error) {
    return {};
  }
}

function writeData(data: ProviderData): void {
  localStorage.setItem('data', JSON.stringify(data));
}

function readActiveProviderKey(): ProviderKey {
  const data = readData();
  const key = data.activeProvider || DEFAULT_PROVIDER_KEY;
  const source = data.sources?.[key];
  if (source && source.enabled === false) return DEFAULT_PROVIDER_KEY;
  return providers[key] ? key : DEFAULT_PROVIDER_KEY;
}

export function getProvider(key: string): Provider | null {
  return providers[key as ProviderKey] || null;
}

export function getActiveProvider(): Provider {
  activeProviderKey = readActiveProviderKey();
  return getProvider(activeProviderKey) || navidromeProvider;
}

export function setActiveProvider(
  key: ProviderKey,
  { persist = true }: { persist?: boolean } = {}
): void {
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

export function getActiveProviderKey(): ProviderKey {
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
