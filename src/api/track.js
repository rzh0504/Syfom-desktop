import { getActiveProvider, getProvider } from '@/providers';
import {
  cacheTrackDetail,
  getTrackDetailFromCache,
  cacheLyric,
  getLyricFromCache,
} from '@/utils/db';

/**
 * 获取音乐 url
 * 说明 : 使用歌单详情接口后 , 能得到的音乐的 id, 但不能得到的音乐 url, 调用此接口, 传入的音乐 id( 可多个 , 用逗号隔开 ), 可以获取对应的音乐的 url,
 * !!!未登录状态返回试听片段(返回字段包含被截取的正常歌曲的开始时间和结束时间)
 * @param {string} id - 音乐的 id，例如 id=405998841,33894312
 */
export function getMP3(id) {
  return getActiveProvider()
    .getSongDetails(id)
    .then(result => {
      const song = result.songs[0];
      return {
        data: [
          {
            id: song?.id,
            url: song?.streamUrl,
            freeTrialInfo: null,
            br: 320000,
          },
        ],
      };
    })
    .catch(() => ({ data: [] }));
}

/**
 * 获取歌曲详情
 * 说明 : 调用此接口 , 传入音乐 id(支持多个 id, 用 , 隔开), 可获得歌曲详情(注意:歌曲封面现在需要通过专辑内容接口获取)
 * @param {string} ids - 音乐 id, 例如 ids=405998841,33894312
 */
export function getTrackDetail(ids) {
  const idsInArray = String(ids)
    .split(',')
    .map(id => id.trim())
    .filter(Boolean);
  const webdavIds = idsInArray.filter(id => id.startsWith('webdav:'));
  const activeIds = idsInArray.filter(id => !id.startsWith('webdav:'));

  const fetchLatest = () => {
    const requests = [];
    if (activeIds.length > 0) {
      requests.push(getActiveProvider().getSongDetails(activeIds.join(',')));
    }
    if (webdavIds.length > 0) {
      requests.push(getProvider('webdav').getSongDetails(webdavIds.join(',')));
    }

    return Promise.all(requests).then(results => {
      const songs = results.flatMap(data => data.songs || []);
      const privileges = results.flatMap(data => data.privileges || []);
      songs.forEach(song => {
        const privilege = privileges.find(t => t.id === song.id);
        cacheTrackDetail(song, privilege);
      });
      return {
        songs: idsInArray
          .map(id => songs.find(song => String(song.id) === id))
          .filter(Boolean),
        privileges: idsInArray
          .map(id => privileges.find(item => String(item.id) === id))
          .filter(Boolean),
      };
    });
  };
  fetchLatest();

  return getTrackDetailFromCache(idsInArray).then(result => {
    return result ?? fetchLatest();
  });
}

/**
 * 获取歌词
 * 说明 : 调用此接口 , 传入音乐 id 可获得对应音乐的歌词 ( 不需要登录 )
 * @param {number} id - 音乐 id
 */
export function getLyric(id) {
  const provider = String(id).startsWith('webdav:')
    ? getProvider('webdav')
    : getActiveProvider();
  const fetchLatest = () => {
    return provider.getLyrics(id).then(result => {
      cacheLyric(id, result);
      return result;
    });
  };

  fetchLatest();

  return getLyricFromCache(id).then(result => {
    return result ?? fetchLatest();
  });
}

/**
 * 获取服务器歌曲列表
 * @param {Object} params
 * @param {number=} params.offset
 * @param {number=} params.limit
 */
export function getLibrarySongs(params = {}) {
  const { offset = 0, limit = 100 } = params;
  return getActiveProvider().getLibrarySongs({ offset, limit });
}

export function getWebdavLibrarySongs(params = {}) {
  const { offset = 0, limit = 100 } = params;
  return getProvider('webdav').getLibrarySongs({ offset, limit });
}

/**
 * 新歌速递
 * 说明 : 调用此接口 , 可获取新歌速递
 * @param {number} type - 地区类型 id, 对应以下: 全部:0 华语:7 欧美:96 日本:8 韩国:16
 */
export function topSong() {
  return Promise.resolve({ data: [] });
}

/**
 * 喜欢音乐
 * 说明 : 调用此接口 , 传入音乐 id, 可喜欢该音乐
 * - id - 歌曲 id
 * - like - 默认为 true 即喜欢 , 若传 false, 则取消喜欢
 * @param {Object} params
 * @param {number} params.id
 * @param {boolean=} [params.like]
 */
export function likeATrack(params) {
  return getActiveProvider().starSong(params.id, params.like !== false);
}

/**
 * 听歌打卡
 * 说明 : 调用此接口 , 传入音乐 id, 来源 id，歌曲时间 time，更新听歌排行数据
 * - id - 歌曲 id
 * - sourceid - 歌单或专辑 id
 * - time - 歌曲播放时间,单位为秒
 * @param {Object} params
 * @param {number} params.id
 * @param {number} params.sourceid
 * @param {number=} params.time
 */
export function scrobble(params) {
  const provider = String(params.id).startsWith('webdav:')
    ? getProvider('webdav')
    : getActiveProvider();
  return provider.scrobbleSong({
    id: params.id,
    time: params.time,
    submission: params.submission !== false,
  });
}
