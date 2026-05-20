import {
  buildWebdavSourceKey,
  listDirectory,
  normalizeWebdavPath,
  normalizeWebdavUrl,
  testConnection,
} from './client';
import {
  cacheWebdavDirectoryEntries,
  cacheWebdavTracks,
  getCachedWebdavDirectoryEntries,
  getWebdavTracksByIds,
  getWebdavTracks,
  searchWebdavTracks,
} from '@/utils/db';
import { mapEntryToTrack } from './mappers';

export const key = 'webdav';

export const name = 'WebDAV';

export const capabilities = {
  canBrowseFiles: true,
  canLocalIndex: true,
  canScrobble: false,
  canServerPlaylist: false,
  canStar: false,
  requiresLocalIndex: true,
};

export async function login(params = {}) {
  const result = await testConnection(params);
  return {
    code: 200,
    profile: {
      userId: params.username || result.serverUrl,
      nickname: params.username || 'WebDAV',
      avatarUrl: '/img/logos/yesplaymusic.png',
      signature: `${normalizeWebdavUrl(params.serverUrl)}${normalizeWebdavPath(
        params.path
      )}`,
      vipType: 0,
    },
  };
}

export function logout() {
  return Promise.resolve({ code: 200 });
}

export function isLoggedIn() {
  return false;
}

export function getProfile() {
  return Promise.resolve({
    userId: '',
    nickname: 'WebDAV',
    avatarUrl: '/img/logos/yesplaymusic.png',
    signature: '',
    vipType: 0,
  });
}

function notImplemented(feature) {
  return Promise.reject(new Error(`WebDAV ${feature} is not implemented yet`));
}

export function getLibrarySongs({ offset = 0, limit = 100, sourceKey } = {}) {
  return getWebdavTracks({ sourceKey, offset, limit }).then(songs => ({
    songs,
    hasMore: songs.length >= limit,
  }));
}

export function browseDirectory(params) {
  const sourceKey = buildWebdavSourceKey(params);
  const parentPath = normalizeWebdavPath(params?.path || '/');
  return listDirectory(params)
    .then(entries => {
      cacheWebdavDirectoryEntries(sourceKey, parentPath, entries);
      return entries;
    })
    .catch(error =>
      getCachedWebdavDirectoryEntries(sourceKey, parentPath).then(entries => {
        if (entries.length > 0) return entries;
        throw error;
      })
    );
}

export function indexDirectoryTracks(params, entries = []) {
  const sourceKey = buildWebdavSourceKey(params);
  const parentPath = normalizeWebdavPath(params?.path || '/');
  const tracks = entries
    .filter(entry => entry.isAudio)
    .map(entry => mapEntryToTrack(entry, params));

  return cacheWebdavTracks(sourceKey, parentPath, tracks).then(() => tracks);
}

export function getSongDetails(ids) {
  return getWebdavTracksByIds(ids).then(songs => ({
    songs,
    privileges: songs.map(song => ({ id: song.id, pl: 320000 })),
  }));
}

export function getLyrics() {
  return Promise.resolve({
    lrc: { lyric: '' },
    tlyric: { lyric: '' },
    romalrc: { lyric: '' },
  });
}

export function searchAll({ keywords, type, limit = 30, offset = 0 } = {}) {
  if (type && ![1, 1018].includes(Number(type))) {
    return Promise.resolve({ result: { songs: [], hasMore: false } });
  }

  return searchWebdavTracks({ keywords, limit, offset }).then(songs => ({
    result: {
      songs,
      artists: [],
      albums: [],
      playlists: [],
      mvs: [],
      hasMore: songs.length >= limit,
      songCount: songs.length,
      artistCount: 0,
      albumCount: 0,
      mvCount: 0,
    },
  }));
}

export function getPlaylistList() {
  return Promise.resolve([]);
}

export function getPlaylistDetail() {
  return notImplemented('playlist detail');
}

export function createPlaylist() {
  return notImplemented('playlist creation');
}

export function deletePlaylist() {
  return notImplemented('playlist deletion');
}

export function updatePlaylistTracks() {
  return notImplemented('playlist updates');
}

export function getAlbumDetail() {
  return notImplemented('album detail');
}

export function getArtistDetail() {
  return notImplemented('artist detail');
}

export function getArtistAlbums() {
  return Promise.resolve({ hotAlbums: [] });
}

export function getRandomSongs() {
  return Promise.resolve([]);
}

export function getAlbumListByType() {
  return Promise.resolve([]);
}

export function getAllArtists() {
  return Promise.resolve([]);
}

export function getStarred() {
  return Promise.resolve({ songs: [], albums: [], artists: [] });
}

export function starSong() {
  return notImplemented('favorites');
}

export function starAlbum() {
  return notImplemented('album favorites');
}

export function starArtist() {
  return notImplemented('artist favorites');
}

export function scrobbleSong() {
  return Promise.resolve({ code: 200 });
}
