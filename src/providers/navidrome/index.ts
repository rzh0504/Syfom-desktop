import {
  buildAvatarUrl,
  clearSession,
  hasSession,
  loginWithPassword,
  readSession,
  requestSubsonic,
} from './client';
import {
  mapAlbum,
  mapArtist,
  mapLyrics,
  mapPlaylist,
  mapSong,
} from './mappers';

export const key = 'navidrome';

export const name = 'Navidrome';

export const capabilities = {
  canBrowseFiles: false,
  canLocalIndex: false,
  canScrobble: true,
  canServerPlaylist: true,
  canStar: true,
  requiresLocalIndex: false,
};

type Id = string | number;
type RawRecord = Record<string, any>;

type LoginParams = {
  serverUrl: string;
  username: string;
  password: string;
};

type SearchParams = {
  keywords?: string;
  type?: number;
  limit?: number;
  offset?: number;
};

type LibrarySongsParams = {
  offset?: number;
  limit?: number;
};

type AlbumListParams = {
  type?: string;
  size?: number;
  offset?: number;
};

type UpdatePlaylistTracksParams = {
  pid: Id;
  op: 'add' | 'del' | string;
  tracks: string | number;
};

type ScrobbleSongParams = {
  id: Id;
  time?: number;
  submission?: boolean;
};

async function getSongsByAlbumIds(albumIds: Id[] = []) {
  const unique = [...new Set(albumIds)].filter(Boolean).slice(0, 6);
  if (unique.length === 0) return [];

  const albums = await Promise.all(
    unique.map(id =>
      requestSubsonic('getAlbum', { id })
        .then(response => response.album)
        .catch(() => null)
    )
  );

  return albums
    .filter(Boolean)
    .flatMap(album => (album.song || []).slice(0, 5).map(mapSong))
    .slice(0, 24);
}

function parseSongListResponse(response: RawRecord) {
  if (Array.isArray(response?.song)) return response.song;
  if (Array.isArray(response?.songs?.song)) return response.songs.song;
  if (Array.isArray(response?.songs)) return response.songs;
  return [];
}

function parseAlbumListResponse(response: RawRecord) {
  if (Array.isArray(response?.albumList2?.album))
    return response.albumList2.album;
  if (Array.isArray(response?.albumList?.album))
    return response.albumList.album;
  if (Array.isArray(response?.album)) return response.album;
  return [];
}

export async function login(params: LoginParams) {
  await loginWithPassword(params);
  const profile = await getProfile();
  return {
    code: 200,
    profile,
  };
}

export function logout() {
  clearSession();
  return Promise.resolve({ code: 200 });
}

export function isLoggedIn() {
  return hasSession();
}

export async function getProfile() {
  const session = readSession();
  if (!session) {
    return {
      userId: '',
      nickname: '',
      avatarUrl: buildAvatarUrl(),
      signature: '',
      vipType: 0,
    };
  }

  return {
    userId: session.username,
    nickname: session.username,
    avatarUrl: buildAvatarUrl(),
    signature: session.serverUrl,
    vipType: 0,
  };
}

export async function getPlaylistList() {
  const response = await requestSubsonic('getPlaylists');
  const playlists = response.playlists?.playlist || [];
  return playlists.map(raw => ({
    ...mapPlaylist(raw),
    tracks: [],
    trackIds: [],
    trackCount: Number(raw.songCount || 0),
  }));
}

export async function getPlaylistDetail(id: Id) {
  const response = await requestSubsonic('getPlaylist', { id });
  return mapPlaylist(response.playlist || {});
}

export async function createPlaylist(name: string) {
  await requestSubsonic('createPlaylist', { name });
  return { code: 200 };
}

export async function deletePlaylist(id: Id) {
  await requestSubsonic('deletePlaylist', { id });
  return { code: 200 };
}

export async function updatePlaylistTracks({
  pid,
  op,
  tracks,
}: UpdatePlaylistTracksParams) {
  const ids = String(tracks)
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);

  if (op === 'add') {
    await Promise.all(
      ids.map(songId =>
        requestSubsonic('updatePlaylist', {
          playlistId: pid,
          songIdToAdd: songId,
        })
      )
    );
  } else {
    const detail = await getPlaylistDetail(pid);
    const indexesToRemove = detail.trackIds
      .map((item, index) => (ids.includes(String(item.id)) ? index : -1))
      .filter(index => index >= 0)
      .reverse();

    await Promise.all(
      indexesToRemove.map(index =>
        requestSubsonic('updatePlaylist', {
          playlistId: pid,
          songIndexToRemove: index,
        })
      )
    );
  }

  return { code: 200, body: { code: 200 } };
}

export async function getAlbumDetail(id: Id) {
  const response = await requestSubsonic('getAlbum', { id });
  const album = mapAlbum(response.album || {});
  const songs = (response.album?.song || []).map(mapSong);
  return {
    album,
    songs,
  };
}

export async function getArtistDetail(id: Id) {
  const response = await requestSubsonic('getArtist', { id });
  const artistRaw = response.artist || {};
  const artist = mapArtist(artistRaw);
  const hotSongs = await getSongsByAlbumIds(
    (artistRaw.album || []).map(album => album.id)
  );
  return {
    artist,
    hotSongs,
  };
}

export async function getArtistAlbums(id: Id, limit = 200) {
  const response = await requestSubsonic('getArtist', { id });
  const albums = (response.artist?.album || []).map(mapAlbum);
  return {
    hotAlbums: albums.slice(0, limit),
  };
}

export async function searchAll({
  keywords,
  type,
  limit = 30,
  offset = 0,
}: SearchParams) {
  if (!keywords) {
    return { result: {} };
  }

  if (type === 1000) {
    const playlists = await getPlaylistList();
    const normalizedKeyword = keywords.toLowerCase();
    const filtered = playlists.filter(item =>
      item.name.toLowerCase().includes(normalizedKeyword)
    );
    return {
      result: {
        playlists: filtered.slice(offset, offset + limit),
        hasMore: offset + limit < filtered.length,
      },
    };
  }

  const response = await requestSubsonic('search3', {
    query: keywords,
    songCount: type === 1 || type === 1018 ? limit : 0,
    songOffset: type === 1 || type === 1018 ? offset : 0,
    artistCount: type === 100 || type === 1018 ? limit : 0,
    artistOffset: type === 100 || type === 1018 ? offset : 0,
    albumCount: type === 10 || type === 1018 ? limit : 0,
    albumOffset: type === 10 || type === 1018 ? offset : 0,
  });

  const result = response.searchResult3 || {};
  const songs = (result.song || []).map(mapSong);
  const artists = (result.artist || []).map(mapArtist);
  const albums = (result.album || []).map(mapAlbum);

  if (type === 1004) {
    return {
      result: {
        mvs: [],
        hasMore: false,
      },
    };
  }

  return {
    result: {
      songs,
      artists,
      albums,
      playlists: [],
      mvs: [],
      hasMore: songs.length + artists.length + albums.length >= limit,
      songCount: songs.length,
      artistCount: artists.length,
      albumCount: albums.length,
      mvCount: 0,
    },
  };
}

export async function getLibrarySongs({
  offset = 0,
  limit = 100,
}: LibrarySongsParams = {}) {
  const safeOffset = Math.max(0, Number(offset) || 0);
  const safeLimit = Math.max(1, Number(limit) || 100);

  try {
    const response = await requestSubsonic('getSongs', {
      offset: safeOffset,
      limit: safeLimit,
    });
    const rawSongs = parseSongListResponse(response);
    return {
      songs: rawSongs.map(mapSong),
      hasMore: rawSongs.length >= safeLimit,
    };
  } catch (_error) {
    try {
      const response = await requestSubsonic('search3', {
        query: '',
        songCount: safeLimit,
        songOffset: safeOffset,
        artistCount: 0,
        albumCount: 0,
      });
      const rawSongs = response.searchResult3?.song || [];
      return {
        songs: rawSongs.map(mapSong),
        hasMore: rawSongs.length >= safeLimit,
      };
    } catch (_fallbackError) {
      const response = await requestSubsonic('getRandomSongs', {
        size: safeLimit,
      });
      const rawSongs = response.randomSongs?.song || [];
      return {
        songs: rawSongs.map(mapSong),
        hasMore: false,
      };
    }
  }
}

export async function refreshLibrary() {
  const response = await requestSubsonic('startScan');
  return {
    code: 200,
    scanning: Boolean(response.scanStatus?.scanning),
    count: response.scanStatus?.count || 0,
  };
}

export async function getRandomSongs(size = 24) {
  const safeSize = Math.max(1, Number(size) || 24);
  const response = await requestSubsonic('getRandomSongs', {
    size: safeSize,
  });
  const rawSongs = response.randomSongs?.song || [];
  return rawSongs.map(mapSong);
}

export async function getAlbumListByType({
  type = 'random',
  size = 24,
  offset = 0,
}: AlbumListParams = {}) {
  const safeSize = Math.max(1, Number(size) || 24);
  const safeOffset = Math.max(0, Number(offset) || 0);
  const response = await requestSubsonic('getAlbumList2', {
    type,
    size: safeSize,
    offset: safeOffset,
  });
  const rawAlbums = parseAlbumListResponse(response);
  return rawAlbums.map(mapAlbum);
}

export async function getAllArtists() {
  const response = await requestSubsonic('getArtists');
  const indexes = response.artists?.index || [];
  return indexes
    .flatMap(index => index.artist || [])
    .filter(Boolean)
    .map(mapArtist);
}

export async function getSongDetails(ids: string | number) {
  const idList = String(ids)
    .split(',')
    .map(id => id.trim())
    .filter(Boolean);

  const songs = await Promise.all(
    idList.map(id =>
      requestSubsonic('getSong', { id })
        .then(response => mapSong(response.song || {}))
        .catch(() => null)
    )
  );

  return {
    songs: songs.filter(Boolean),
    privileges: songs
      .filter(Boolean)
      .map(song => ({ id: song.id, pl: 320000 })),
  };
}

export async function getLyrics(id: Id) {
  try {
    const response = await requestSubsonic('getLyricsBySongId', { id });
    const structuredLyrics = response.lyricsList?.structuredLyrics;
    if (Array.isArray(structuredLyrics) && structuredLyrics.length > 0) {
      const lines = structuredLyrics[0].line || [];
      const lyric = lines
        .map(line => {
          if (!line.value) return '';
          const start = Number(line.start || 0);
          const minute = String(Math.floor(start / 60000)).padStart(2, '0');
          const second = String(Math.floor((start % 60000) / 1000)).padStart(
            2,
            '0'
          );
          const centisecond = String(Math.floor((start % 1000) / 10)).padStart(
            2,
            '0'
          );
          return `[${minute}:${second}.${centisecond}]${line.value}`;
        })
        .join('\n');
      return mapLyrics({ value: lyric });
    }
  } catch (_error) {
    // fallback below
  }

  return mapLyrics({ value: '' });
}

export async function starSong(id: Id, like = true) {
  if (like) {
    await requestSubsonic('star', { id });
  } else {
    await requestSubsonic('unstar', { id });
  }
  return { code: 200 };
}

export async function starAlbum(id: Id, like = true) {
  if (like) {
    await requestSubsonic('star', { albumId: id });
  } else {
    await requestSubsonic('unstar', { albumId: id });
  }
  return { code: 200 };
}

export async function starArtist(id: Id, like = true) {
  if (like) {
    await requestSubsonic('star', { artistId: id });
  } else {
    await requestSubsonic('unstar', { artistId: id });
  }
  return { code: 200 };
}

export async function getStarred() {
  const response = await requestSubsonic('getStarred2');
  const starred = response.starred2 || {};

  return {
    songs: (starred.song || []).map(mapSong),
    albums: (starred.album || []).map(mapAlbum),
    artists: (starred.artist || []).map(mapArtist),
  };
}

export async function scrobbleSong({
  id,
  time,
  submission = true,
}: ScrobbleSongParams) {
  await requestSubsonic('scrobble', {
    id,
    time: Number(time) > 1000000000000 ? Number(time) : Date.now(),
    submission: submission ? 'true' : 'false',
  });
  return { code: 200 };
}
