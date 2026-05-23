import { getActiveProvider } from '@/providers';
import { cacheAlbum, getAlbumFromCache } from '@/utils/db';

type LikeAlbumParams = {
  id: string | number;
  t: string | number;
};

type NewAlbumsParams = {
  area?: string;
  limit?: number;
  offset?: number;
};

/**
 * 获取专辑内容
 * 说明 : 调用此接口 , 传入专辑 id, 可获得专辑内容
 * @param {number} id
 */
export function getAlbum(id: string | number) {
  const fetchLatest = () => {
    return getActiveProvider()
      .getAlbumDetail(id)
      .then(data => {
        cacheAlbum(id, data);
        return data;
      });
  };
  fetchLatest();

  return getAlbumFromCache(id).then(result => {
    return result ?? fetchLatest();
  });
}

/**
 * 全部新碟
 * 说明 : 登录后调用此接口 ,可获取全部新碟
 * - limit - 返回数量 , 默认为 30
 * - offset - 偏移数量，用于分页 , 如 :( 页数 -1)*30, 其中 30 为 limit 的值 , 默认为 0
 * - area - ALL:全部,ZH:华语,EA:欧美,KR:韩国,JP:日本
 * @param {Object} params
 * @param {number} params.limit
 * @param {number=} params.offset
 * @param {string} params.area
 */
export function newAlbums(_params?: NewAlbumsParams) {
  return Promise.resolve({ albums: [] });
}

/**
 * 专辑动态信息
 * 说明 : 调用此接口 , 传入专辑 id, 可获得专辑动态信息,如是否收藏,收藏数,评论数,分享数
 * - id - 专辑id
 * @param {number} id
 */
export function albumDynamicDetail(_id?: string | number) {
  return Promise.resolve({
    isSub: false,
    commentCount: 0,
    shareCount: 0,
    subCount: 0,
  });
}

/**
 * 收藏/取消收藏专辑
 * 说明 : 调用此接口,可收藏/取消收藏专辑
 * - id - 返专辑 id
 * - t - 1 为收藏,其他为取消收藏
 * @param {Object} params
 * @param {number} params.id
 * @param {number} params.t
 */
export function likeAAlbum(params: LikeAlbumParams) {
  return getActiveProvider().starAlbum(params.id, Number(params.t) === 1);
}
