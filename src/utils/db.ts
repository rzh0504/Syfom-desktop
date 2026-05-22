import axios from 'axios';
import Dexie from 'dexie';
import store from '@/store';
// import pkg from "../../package.json";

type TrackLike = {
  id?: string | number;
  uid?: string | number;
  cacheKey?: string | number;
  sourceId?: string | number;
  source?: string;
  name?: string;
  ar?: { name?: string }[];
  artists?: { name?: string }[];
  al?: { picUrl?: string };
};

type TrackSource = {
  id: string | number;
  sourceId?: string | number;
  source: ArrayBuffer;
  bitRate?: number;
  from?: string;
  name?: string;
  artist?: string;
  createTime: number;
};

type TrackDetailCache = {
  id: string | number;
  detail: any;
  privileges: any;
  updateTime: number;
};

type LyricCache = { id: string | number; lyrics: any; updateTime: number };
type AlbumCache = { id: string; album: any; updateTime: number };

type AppDexie = Dexie & {
  trackSources: Dexie.Table<TrackSource, string | number>;
  trackDetail: Dexie.Table<TrackDetailCache, string | number>;
  lyric: Dexie.Table<LyricCache, string | number>;
  album: Dexie.Table<AlbumCache, string>;
};

const db = new Dexie('syfom-desktop') as AppDexie;

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
});

db.version(6).stores({
  trackSources: '&id, createTime',
  trackDetail: '&id, updateTime',
  lyric: '&id, updateTime',
  album: '&id, updateTime',
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

function getTrackCacheKey(
  track: TrackLike | string | number
): string | number | undefined {
  if (track && typeof track === 'object') {
    return track.uid || track.cacheKey || track.id;
  }
  return typeof track === 'string' || typeof track === 'number'
    ? track
    : undefined;
}

async function deleteExcessCache(): Promise<void> {
  if (
    store.state.settings.cacheLimit === false ||
    tracksCacheBytes < store.state.settings.cacheLimit * Math.pow(1024, 2)
  ) {
    return;
  }
  try {
    const delCache = await db.trackSources.orderBy('createTime').first();
    if (!delCache) return;
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

export function cacheTrackSource(
  trackInfo: TrackLike,
  url: string,
  bitRate?: number,
  from = 'navidrome'
) {
  if (!process.env.IS_ELECTRON) return;
  const cacheKey = getTrackCacheKey(trackInfo);
  if (!cacheKey) return;
  const name = trackInfo.name || '';
  const artist =
    (trackInfo.ar && trackInfo.ar[0]?.name) ||
    (trackInfo.artists && trackInfo.artists[0]?.name) ||
    'Unknown';
  let cover = trackInfo.al?.picUrl || '';
  if (cover.startsWith('http://127.0.0.1:') || cover.startsWith('data:')) {
    cover = '';
  }
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

export function getTrackSource(id: TrackLike | string | number) {
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

export function cacheTrackDetail(track: TrackLike, privileges: any): void {
  db.trackDetail.put({
    id: track.id,
    detail: track,
    privileges: privileges,
    updateTime: new Date().getTime(),
  });
}

export function getTrackDetailFromCache(ids: string[]) {
  return db.trackDetail
    .filter(track => {
      return ids.includes(String(track.id));
    })
    .toArray()
    .then(tracks => {
      const result: { songs: any[]; privileges: any[] } = {
        songs: [],
        privileges: [],
      };
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

export function cacheLyric(id: string | number, lyrics: any): void {
  db.lyric.put({
    id,
    lyrics,
    updateTime: new Date().getTime(),
  });
}

export function getLyricFromCache(id: string | number) {
  return db.lyric.get(id).then(result => {
    if (result) return result.lyrics;
    return db.lyric.get(String(id)).then(fallback => fallback?.lyrics);
  });
}

export function cacheAlbum(id: string | number, album: any): void {
  db.album.put({
    id: String(id),
    album,
    updateTime: new Date().getTime(),
  });
}

export function getAlbumFromCache(id: string | number) {
  return db.album.get(String(id)).then(result => {
    if (result) return result.album;
    return db.album.get(String(id)).then(fallback => fallback?.album);
  });
}

export function countDBSize() {
  const trackSizes: number[] = [];
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
  return new Promise<void>(resolve => {
    db.tables.forEach(function (table) {
      table.clear();
    });
    resolve();
  });
}
