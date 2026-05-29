import { getActiveProvider } from '@/providers';
import { readDailyCache, writeDailyCache } from '@/utils/dailyRandom';

const HOME_DAILY_CACHE_PREFIX = 'syfom-home-daily';

type HomeAlbumsType = 'newest' | 'recent' | 'random' | 'frequent';

function readJsonStorage(key: string): Record<string, unknown> {
  if (typeof localStorage === 'undefined') return {};

  try {
    return JSON.parse(localStorage.getItem(key)) || {};
  } catch (error) {
    void error;
    return {};
  }
}

function getHomeDailyCacheScope(): string {
  const data = readJsonStorage('data');
  const session = readJsonStorage('navidromeSession');
  const activeProvider =
    typeof data.activeProvider === 'string' ? data.activeProvider : 'navidrome';
  const serverUrl =
    typeof session.serverUrl === 'string' ? session.serverUrl : '';
  const username = typeof session.username === 'string' ? session.username : '';
  const token = typeof session.token === 'string' ? session.token : '';
  return [activeProvider, serverUrl, username, token].join('|');
}

function requestWithHomeDailyCache<T>(
  cacheName: string,
  loader: () => Promise<T>
): Promise<T> {
  const cacheKey = `${HOME_DAILY_CACHE_PREFIX}:${cacheName}`;
  const scope = getHomeDailyCacheScope();
  const cached = readDailyCache<T>(cacheKey, scope);

  if (cached !== null) return Promise.resolve(cached);

  return loader().then(value => {
    writeDailyCache(cacheKey, value, scope);
    return value;
  });
}

/**
 * 搜索
 * 说明 : 调用此接口 , 传入搜索关键词可以搜索该音乐 / 专辑 / 歌手 / 歌单 / 用户 , 关键词可以多个 , 以空格隔开 ,
 * 如 " 周杰伦 搁浅 "( 不需要登录 ), 搜索获取的 mp3url 不能直接用 , 可通过 /song/url 接口传入歌曲 id 获取具体的播放链接
 * - keywords : 关键词
 * - limit : 返回数量 , 默认为 30
 * - offset : 偏移数量，用于分页 , 如 : 如 :( 页数 -1)*30, 其中 30 为 limit 的值 , 默认为 0
 * - type: 搜索类型；默认为 1 即单曲 , 取值意义 : 1: 单曲, 10: 专辑, 100: 歌手, 1000: 歌单, 1018:综合
 * - 调用例子 : /search?keywords=海阔天空 /cloudsearch?keywords=海阔天空(更全)
 * @param {Object} params
 * @param {string} params.keywords
 * @param {number=} params.limit
 * @param {number=} params.offset
 * @param {number=} params.type
 */
export function search(params: {
  keywords: string;
  limit?: number;
  offset?: number;
  type?: number;
}) {
  return getActiveProvider().searchAll(params);
}

export function personalFM() {
  return Promise.resolve({ data: [] });
}

export function fmTrash() {
  return Promise.resolve({ code: 200 });
}

/**
 * 首页：今日推荐（随机歌曲）
 * @param {number=} limit
 */
export function homeRecommendTracks(limit = 24) {
  const safeLimit = Math.max(1, Number(limit) || 24);

  return requestWithHomeDailyCache(`recommend-tracks:${safeLimit}`, () =>
    (
      getActiveProvider().getAllRandomSongs ||
      getActiveProvider().getRandomSongs
    )(safeLimit)
  )
    .then(songs => ({ songs }))
    .catch(() => ({ songs: [] }));
}

/**
 * 首页：按类型获取专辑
 * @param {Object} params
 * @param {'newest'|'recent'|'random'|'frequent'} params.type
 * @param {number=} params.limit
 * @param {number=} params.offset
 */
export function homeAlbumsByType(
  params: { type?: HomeAlbumsType; limit?: number; offset?: number } = {}
) {
  const { type = 'random', limit = 24, offset = 0 } = params;
  const safeLimit = Math.max(1, Number(limit) || 24);
  const safeOffset = Math.max(0, Number(offset) || 0);
  const loader = () =>
    (
      getActiveProvider().getAllAlbumListByType ||
      getActiveProvider().getAlbumListByType
    )({
      type,
      size: safeLimit,
      offset: safeOffset,
    });
  const request =
    type === 'random'
      ? requestWithHomeDailyCache(
          `random-albums:${safeLimit}:${safeOffset}`,
          loader
        )
      : loader();

  return request
    .then(albums => ({
      albums,
      hasMore: albums.length >= safeLimit,
    }))
    .catch(() => ({ albums: [], hasMore: false }));
}

/**
 * 首页：全部艺人（前端自行随机/分页）
 */
export function homeAllArtists() {
  return getActiveProvider()
    .getAllSourcesArtists()
    .then(artists => ({ artists }))
    .catch(() => ({ artists: [] }));
}
