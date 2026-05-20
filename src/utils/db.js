import axios from 'axios';
import Dexie from 'dexie';
import store from '@/store';
// import pkg from "../../package.json";

const db = new Dexie('syfom-desktop');

db.version(4).stores({
  trackDetail: '&id, updateTime',
  lyric: '&id, updateTime',
  album: '&id, updateTime',
});

db.version(5).stores({
  trackSources: '&id, createTime',
  trackDetail: '&id, updateTime',
  lyric: '&id, updateTime',
  album: '&id, updateTime',
  webdavEntries:
    '&id, sourceKey, parentPath, [sourceKey+parentPath], path, isDirectory, updatedAt',
});

db.version(6).stores({
  trackSources: '&id, createTime',
  trackDetail: '&id, updateTime',
  lyric: '&id, updateTime',
  album: '&id, updateTime',
  webdavEntries:
    '&id, sourceKey, parentPath, [sourceKey+parentPath], path, isDirectory, updatedAt',
  webdavTracks: '&id, sourceKey, path, parentPath, updatedAt',
});

db.version(3)
  .stores({
    trackSources: '&id, createTime',
  })
  .upgrade(tx =>
    tx
      .table('trackSources')
      .toCollection()
      .modify(
        track => !track.createTime && (track.createTime = new Date().getTime())
      )
  );

db.version(1).stores({
  trackSources: '&id',
});

let tracksCacheBytes = 0;

function getTrackCacheKey(track) {
  if (track && typeof track === 'object') {
    return track.uid || track.cacheKey || track.id;
  }
  return track;
}

async function deleteExcessCache() {
  if (
    store.state.settings.cacheLimit === false ||
    tracksCacheBytes < store.state.settings.cacheLimit * Math.pow(1024, 2)
  ) {
    return;
  }
  try {
    const delCache = await db.trackSources.orderBy('createTime').first();
    await db.trackSources.delete(delCache.id);
    tracksCacheBytes -= delCache.source.byteLength;
    console.debug(
      `[debug][db.js] deleteExcessCacheSucces, track: ${delCache.name}, size: ${delCache.source.byteLength}, cacheSize:${tracksCacheBytes}`
    );
    deleteExcessCache();
  } catch (error) {
    console.debug('[debug][db.js] deleteExcessCacheFailed', error);
  }
}

export function cacheTrackSource(trackInfo, url, bitRate, from = 'navidrome') {
  if (!process.env.IS_ELECTRON) return;
  const cacheKey = getTrackCacheKey(trackInfo);
  if (!cacheKey) return;
  const name = trackInfo.name;
  const artist =
    (trackInfo.ar && trackInfo.ar[0]?.name) ||
    (trackInfo.artists && trackInfo.artists[0]?.name) ||
    'Unknown';
  let cover = trackInfo.al?.picUrl || '';
  if (cover && cover.slice(0, 5) !== 'https') {
    cover = 'https' + cover.slice(4);
  }
  if (cover) {
    const separator = cover.includes('?') ? '&' : '?';
    axios.get(`${cover}${separator}size=512`).catch(() => {});
    axios.get(`${cover}${separator}size=224`).catch(() => {});
    axios.get(`${cover}${separator}size=1024`).catch(() => {});
  }
  return axios
    .get(url, {
      responseType: 'arraybuffer',
    })
    .then(response => {
      db.trackSources.put({
        id: cacheKey,
        sourceId: trackInfo.sourceId || trackInfo.id,
        source: response.data,
        bitRate,
        from: trackInfo.source || from,
        name,
        artist,
        createTime: new Date().getTime(),
      });
      console.debug(`[debug][db.js] cached track 👉 ${name} by ${artist}`);
      tracksCacheBytes += response.data.byteLength;
      deleteExcessCache();
      return { trackID: trackInfo.id, source: response.data, bitRate };
    });
}

export function getTrackSource(id) {
  const cacheKey = getTrackCacheKey(id);
  const legacyKey = id && typeof id === 'object' ? id.id : id;

  if (cacheKey === undefined || cacheKey === null) {
    return Promise.resolve(undefined);
  }

  return db.trackSources.get(cacheKey).then(track => {
    if (track) {
      console.debug(
        `[debug][db.js] get track from cache 👉 ${track.name} by ${track.artist}`
      );
      return track;
    }

    if (legacyKey === undefined || legacyKey === null) return undefined;
    return db.trackSources.get(String(legacyKey));
  });
}

export function cacheTrackDetail(track, privileges) {
  db.trackDetail.put({
    id: track.id,
    detail: track,
    privileges: privileges,
    updateTime: new Date().getTime(),
  });
}

export function getTrackDetailFromCache(ids) {
  return db.trackDetail
    .filter(track => {
      return ids.includes(String(track.id));
    })
    .toArray()
    .then(tracks => {
      const result = { songs: [], privileges: [] };
      ids.map(id => {
        const one = tracks.find(t => String(t.id) === id);
        result.songs.push(one?.detail);
        result.privileges.push(one?.privileges);
      });
      if (result.songs.includes(undefined)) {
        return undefined;
      }
      return result;
    });
}

export function cacheLyric(id, lyrics) {
  db.lyric.put({
    id,
    lyrics,
    updateTime: new Date().getTime(),
  });
}

export function getLyricFromCache(id) {
  return db.lyric.get(id).then(result => {
    if (result) return result.lyrics;
    return db.lyric.get(String(id)).then(fallback => fallback?.lyrics);
  });
}

export function cacheAlbum(id, album) {
  db.album.put({
    id: String(id),
    album,
    updateTime: new Date().getTime(),
  });
}

export function getAlbumFromCache(id) {
  return db.album.get(id).then(result => {
    if (result) return result.album;
    return db.album.get(String(id)).then(fallback => fallback?.album);
  });
}

export function countDBSize() {
  const trackSizes = [];
  return db.trackSources
    .each(track => {
      trackSizes.push(track.source.byteLength);
    })
    .then(() => {
      const res = {
        bytes: trackSizes.reduce((s1, s2) => s1 + s2, 0),
        length: trackSizes.length,
      };
      tracksCacheBytes = res.bytes;
      console.debug(
        `[debug][db.js] load tracksCacheBytes: ${tracksCacheBytes}`
      );
      return res;
    });
}

export function clearDB() {
  return new Promise(resolve => {
    db.tables.forEach(function (table) {
      table.clear();
    });
    resolve();
  });
}

export function cacheWebdavDirectoryEntries(
  sourceKey,
  parentPath,
  entries = []
) {
  if (!sourceKey || !parentPath) return Promise.resolve([]);
  const normalizedParentPath = normalizePath(parentPath);
  const updatedAt = Date.now();
  const records = entries.map(entry => ({
    ...entry,
    id: `${sourceKey}:${entry.path}`,
    sourceKey,
    parentPath: normalizedParentPath,
    updatedAt,
  }));

  return db.transaction('rw', db.webdavEntries, async () => {
    await db.webdavEntries
      .where('[sourceKey+parentPath]')
      .equals([sourceKey, normalizedParentPath])
      .delete()
      .catch(() =>
        db.webdavEntries
          .where('sourceKey')
          .equals(sourceKey)
          .filter(entry => entry.parentPath === normalizedParentPath)
          .delete()
      );
    await db.webdavEntries.bulkPut(records);
    return records;
  });
}

export function getCachedWebdavDirectoryEntries(sourceKey, parentPath) {
  if (!sourceKey || !parentPath) return Promise.resolve([]);
  const normalizedParentPath = normalizePath(parentPath);
  return db.webdavEntries
    .where('sourceKey')
    .equals(sourceKey)
    .filter(entry => entry.parentPath === normalizedParentPath)
    .sortBy('name')
    .then(entries =>
      entries.sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
        return a.name.localeCompare(b.name);
      })
    );
}

export function cacheWebdavTracks(sourceKey, parentPath, tracks = []) {
  if (!sourceKey || !parentPath) return Promise.resolve([]);
  const normalizedParentPath = normalizePath(parentPath);
  const updatedAt = Date.now();
  const records = tracks.map(track => ({
    ...track,
    id: track.uid || track.id,
    sourceKey,
    parentPath: normalizedParentPath,
    updatedAt,
  }));

  return db.transaction('rw', db.webdavTracks, async () => {
    await db.webdavTracks.bulkPut(records);
    return records;
  });
}

export function getWebdavTracks({ sourceKey, offset = 0, limit = 100 } = {}) {
  const query = sourceKey
    ? db.webdavTracks.where('sourceKey').equals(sourceKey)
    : db.webdavTracks.toCollection();

  return query
    .offset(Math.max(0, Number(offset) || 0))
    .limit(Math.max(1, Number(limit) || 100))
    .toArray();
}

export function getWebdavTracksByIds(ids = []) {
  const idList = String(ids)
    .split(',')
    .map(id => id.trim())
    .filter(Boolean);

  return db.webdavTracks.bulkGet(idList).then(tracks =>
    tracks.filter(Boolean).map(track => ({
      ...track,
      privilege: track.privilege || {
        id: track.id,
        pl: 320000,
        fee: 0,
        st: 0,
        cs: false,
      },
    }))
  );
}

export function searchWebdavTracks({
  keywords = '',
  offset = 0,
  limit = 30,
} = {}) {
  const normalizedKeywords = String(keywords).trim().toLowerCase();
  if (!normalizedKeywords) return Promise.resolve([]);

  return db.webdavTracks
    .filter(track => {
      const haystack = [
        track.name,
        track.path,
        track.extension,
        track.ar?.map(artist => artist.name).join(' '),
        track.al?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedKeywords);
    })
    .offset(Math.max(0, Number(offset) || 0))
    .limit(Math.max(1, Number(limit) || 30))
    .toArray();
}

function normalizePath(path) {
  const input = String(path || '/').trim();
  if (!input || input === '/') return '/';
  return `/${input.replace(/^\/+|\/+$/g, '')}`;
}
