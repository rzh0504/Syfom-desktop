import { getActiveProvider } from '@/providers';
type StarredSong = {
  id: string | number;
};

/**
 * 获取用户详情
 * 说明 : 登录后调用此接口 , 传入用户 id, 可以获取用户详情
 * - uid : 用户 id
 * @param {number} uid
 */
export function userDetail() {
  return getActiveProvider()
    .getProfile()
    .then(profile => ({ profile }));
}

/**
 * 获取账号详情
 * 说明 : 登录后调用此接口 ,可获取用户账号信息
 */
export function userAccount() {
  return getActiveProvider()
    .getProfile()
    .then(profile => ({ code: 200, profile }));
}

/**
 * 获取用户歌单
 * 说明 : 登录后调用此接口 , 传入用户 id, 可以获取用户歌单
 * - uid : 用户 id
 * - limit : 返回数量 , 默认为 30
 * - offset : 偏移数量，用于分页 , 如 :( 页数 -1)*30, 其中 30 为 limit 的值 , 默认为 0
 * @param {Object} params
 * @param {number} params.uid
 * @param {number} params.limit
 * @param {number=} params.offset
 */
export function userPlaylist(_params?: {
  uid?: string | number;
  limit?: number;
  offset?: number;
  timestamp?: number;
}) {
  return getActiveProvider()
    .getAllPlaylistList()
    .then(playlist => ({ playlist }));
}

/**
 * 获取用户播放记录
 * 说明 : 登录后调用此接口 , 传入用户 id, 可获取用户播放记录
 * - uid : 用户 id
 * - type : type=1 时只返回 weekData, type=0 时返回 allData
 * @param {Object} params
 * @param {number} params.uid
 * @param {number} params.type
 */
export function userPlayHistory() {
  return Promise.resolve({ allData: [], weekData: [] });
}

/**
 * 喜欢音乐列表（需要登录）
 * 说明 : 调用此接口 , 传入用户 id, 可获取已喜欢音乐id列表(id数组)
 * - uid: 用户 id
 * @param {number} uid
 */
export function userLikedSongsIDs(_params?: { uid?: string | number }) {
  return getActiveProvider()
    .getStarred()
    .then((starred: { songs: StarredSong[] }) => ({
      ids: starred.songs.map(song => song.id),
    }));
}

/**
 * 获取收藏的专辑（需要登录）
 * 说明 : 调用此接口可获取到用户收藏的专辑
 * - limit : 返回数量 , 默认为 25
 * - offset : 偏移数量，用于分页 , 如 :( 页数 -1)*25, 其中 25 为 limit 的值 , 默认为 0
 * @param {Object} params
 * @param {number} params.limit
 * @param {number=} params.offset
 */
export function likedAlbums(_params?: { limit?: number; offset?: number }) {
  const { limit = 50, offset = 0 } = _params || {};
  const provider = getActiveProvider();
  return (provider.getAllAlbumListByType || provider.getAlbumListByType)({
    type: 'alphabeticalByName',
    size: limit,
    offset,
  }).then(albums => ({ data: albums, hasMore: albums.length >= limit }));
}

/**
 * 获取收藏的歌手（需要登录）
 * 说明 : 调用此接口可获取到用户收藏的歌手
 */
export function likedArtists(_params?: { limit?: number; offset?: number }) {
  const { limit = 50, offset = 0 } = _params || {};
  const provider = getActiveProvider();
  if (provider.getAllSourcesArtists) {
    return provider.getAllSourcesArtists().then(artists => ({
      data: artists.slice(offset, offset + limit),
      hasMore: artists.length > offset + limit,
    }));
  }
  return provider.getArtistList({ limit, offset }).then(result => ({
    data: result.artists,
    hasMore: result.hasMore,
  }));
}
