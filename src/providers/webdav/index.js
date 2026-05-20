import {
  buildWebdavSourceKey,
  downloadFile,
  getStoredWebdavCredentials,
  forgetWebdavCredentials,
  listDirectory,
  normalizeWebdavPath,
  normalizeWebdavUrl,
  readWebdavAudioMetadata,
  rememberWebdavCredentials,
  testConnection,
} from './client';
import {
  cacheWebdavDirectoryEntries,
  cacheWebdavTracks,
  getCachedWebdavDirectoryEntries,
  getWebdavAlbumsByArtistId,
  getWebdavArtists,
  getWebdavTracksByAlbumId,
  getWebdavTracksByArtistId,
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
  rememberWebdavCredentials(params);
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

function emptyAlbum(id) {
  return {
    id,
    uid: id,
    source: 'webdav',
    sourceId: id,
    sourceType: 'webdav',
    name: 'Unknown Album',
    picUrl: '/img/logos/yesplaymusic.png',
    artist: { id: '', name: 'Unknown Artist' },
    artists: [{ id: '', name: 'Unknown Artist' }],
    publishTime: 0,
    size: 0,
    type: '专辑',
    company: '',
    description: '',
    mark: 0,
  };
}

function albumFromTracks(id, tracks = []) {
  if (tracks.length === 0) return emptyAlbum(id);
  const first = tracks[0];
  const album = first.al || first.album || {};
  return {
    ...emptyAlbum(id),
    id: album.id || id,
    uid: album.id || id,
    sourceId: album.id || id,
    name: album.name || 'Unknown Album',
    picUrl: album.picUrl || '/img/logos/yesplaymusic.png',
    artist: first.ar?.[0] || { id: '', name: 'Unknown Artist' },
    artists: first.ar || [],
    publishTime: first.lastModified || 0,
    size: tracks.length,
    description: first.folderPath || '',
  };
}

function artistFromTracks(id, tracks = []) {
  const firstArtist = tracks[0]?.ar?.find(artist => artist.id === id) || {
    id,
    name: 'Unknown Artist',
  };
  const albumIds = new Set(tracks.map(track => track.al?.id).filter(Boolean));
  return {
    id,
    uid: id,
    source: 'webdav',
    sourceId: id,
    sourceType: 'webdav',
    name: firstArtist.name,
    img1v1Url: tracks[0]?.al?.picUrl || '/img/default-user.jpg',
    briefDesc: '',
    musicSize: tracks.length,
    albumSize: albumIds.size,
    mvSize: 0,
    followed: false,
  };
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

export function rememberCredentials(params) {
  return rememberWebdavCredentials(params);
}

export function forgetCredentials(sourceKey) {
  return forgetWebdavCredentials(sourceKey);
}

export async function indexDirectoryTracks(params, entries = []) {
  const sourceKey = buildWebdavSourceKey(params);
  const parentPath = normalizeWebdavPath(params?.path || '/');
  const tracks = [];

  for (const entry of entries.filter(item => item.isAudio)) {
    const metadata = await readWebdavAudioMetadata({
      sourceKey,
      path: entry.path,
      contentType: entry.contentType,
    });
    tracks.push(mapEntryToTrack(entry, params, entries, metadata));
  }

  await cacheWebdavTracks(sourceKey, parentPath, tracks);
  return tracks;
}

export async function scanDirectory(params, { onProgress } = {}) {
  const visited = new Set();
  const stats = {
    directories: 0,
    audio: 0,
    failed: 0,
    tracks: [],
  };

  async function scan(path) {
    const normalizedPath = normalizeWebdavPath(path);
    if (visited.has(normalizedPath)) return;
    visited.add(normalizedPath);
    stats.directories += 1;
    onProgress?.({ ...stats, currentPath: normalizedPath });

    let entries = [];
    try {
      entries = await browseDirectory({
        ...params,
        path: normalizedPath,
      });
    } catch (error) {
      stats.failed += 1;
      onProgress?.({ ...stats, currentPath: normalizedPath, error });
      return;
    }

    const tracks = await indexDirectoryTracks(
      {
        ...params,
        path: normalizedPath,
      },
      entries
    );
    stats.audio += tracks.length;
    stats.tracks.push(...tracks);
    onProgress?.({ ...stats, currentPath: normalizedPath });

    for (const entry of entries) {
      if (entry.isDirectory) {
        await scan(entry.path);
      }
    }
  }

  await scan(params?.path || '/');
  return stats;
}

export function getSongDetails(ids) {
  return getWebdavTracksByIds(ids).then(songs => ({
    songs,
    privileges: songs.map(song => ({ id: song.id, pl: 320000 })),
  }));
}

export async function getAudioSource(track) {
  const sourceKey = track.sourceKey;
  const credentials = await getStoredWebdavCredentials(sourceKey);
  if (!credentials) {
    throw new Error('WebDAV 凭据不可用，请先在设置页重新连接');
  }

  if (track.streamUrl) return track.streamUrl;

  return downloadFile({
    ...credentials,
    path: track.path,
  });
}

export async function getLyrics(id) {
  const [track] = await getWebdavTracksByIds([id]);
  if (!track?.lyricsPath) {
    return {
      lrc: { lyric: '' },
      tlyric: { lyric: '' },
      romalrc: { lyric: '' },
    };
  }

  const credentials = await getStoredWebdavCredentials(track.sourceKey);
  if (!credentials) {
    return {
      lrc: { lyric: '' },
      tlyric: { lyric: '' },
      romalrc: { lyric: '' },
    };
  }

  const lyric = await downloadFile({
    ...credentials,
    path: track.lyricsPath,
    responseType: 'text',
  });

  return {
    lrc: { lyric: lyric || '' },
    tlyric: { lyric: '' },
    romalrc: { lyric: '' },
  };
}

export function getEmptyLyrics() {
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

export function getAlbumDetail(id) {
  return getWebdavTracksByAlbumId(id).then(tracks => ({
    album: albumFromTracks(id, tracks),
    songs: tracks.sort((a, b) => (a.no || 0) - (b.no || 0)),
  }));
}

export function getArtistDetail(id) {
  return getWebdavTracksByArtistId(id).then(tracks => ({
    artist: artistFromTracks(id, tracks),
    hotSongs: tracks.slice(0, 24),
  }));
}

export function getArtistAlbums(id, limit = 200) {
  return getWebdavAlbumsByArtistId(id).then(albums => ({
    hotAlbums: albums.slice(0, limit),
  }));
}

export function getRandomSongs() {
  return Promise.resolve([]);
}

export function getAlbumListByType() {
  return Promise.resolve([]);
}

export function getAllArtists() {
  return getWebdavArtists();
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
