const UINT32_SIZE = 4294967296;

export function getDailyDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function hashString(value: unknown): number {
  const input = String(value);
  let hash = 2166136261;

  for (let index = 0; index < input.length; index++) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function createSeededRandom(seed: number): () => number {
  let state = seed || 1;

  return function () {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / UINT32_SIZE;
  };
}

export function dailyShuffle<T>(list: T[] = [], seedSuffix = ''): T[] {
  const result = [...list];
  const random = createSeededRandom(
    hashString(`${getDailyDateKey()}:${seedSuffix}`)
  );

  for (let index = result.length - 1; index > 0; index--) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }

  return result;
}

function canUseLocalStorage(): boolean {
  return typeof localStorage !== 'undefined';
}

export function readDailyCache<T = unknown>(
  cacheKey: string,
  scope = ''
): T | null {
  if (!canUseLocalStorage()) return null;

  try {
    const raw = localStorage.getItem(cacheKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (parsed?.dateKey !== getDailyDateKey()) return null;
    if ((parsed.scope || '') !== scope) return null;
    return parsed.value === undefined ? null : parsed.value;
  } catch (error) {
    void error;
    return null;
  }
}

export function writeDailyCache(
  cacheKey: string,
  value: unknown,
  scope = ''
): void {
  if (!canUseLocalStorage()) return;

  try {
    localStorage.setItem(
      cacheKey,
      JSON.stringify({
        dateKey: getDailyDateKey(),
        scope,
        value,
      })
    );
  } catch (error) {
    void error;
  }
}
