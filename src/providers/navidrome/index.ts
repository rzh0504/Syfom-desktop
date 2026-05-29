import {
  buildAvatarUrl,
  clearSession,
  hasSession,
  loginWithPassword,
  readSession,
  requestSubsonic,
} from './client';
import type { NavidromeSession, NavidromeRequestConfig } from './client';
import {
  mapAlbum,
  mapArtist,
  mapLyrics,
  mapPlaylist,
  mapSong,
} from './mappers';
import type {
  NavidromeAlbum,
  NavidromeArtist,
  NavidromePlaylist,
  NavidromeSong,
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
type SourceState = {
  key: string;
  name?: string;
  provider?: string;
  enabled?: boolean;
  serverUrl?: string;
  username?: string;
  token?: string;
  salt?: string;
};
type MapContext = {
  sourceKey?: string;
  sourceName?: string;
  session?: NavidromeSession | null;
};

type SearchResultResponse = {
  song?: NavidromeSong[];
  artist?: NavidromeArtist[];
  album?: NavidromeAlbum[];
};

type SongListResponse = {
  song?: NavidromeSong[];
  songs?: { song?: NavidromeSong[] } | NavidromeSong[];
};

type AlbumListResponse = {
  album?: NavidromeAlbum[];
  albumList?: { album?: NavidromeAlbum[] };
  albumList2?: { album?: NavidromeAlbum[] };
};

type LyricsLine = {
  value?: string;
  start?: string | number;
};

function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

function readDataSources(): Record<string, SourceState> {
  try {
    const data = JSON.parse(localStorage.getItem('data') || '{}');
    return data.sources || {};
  } catch (_error) {
    return {};
  }
}

function sessionFromSource(source: SourceState): NavidromeSession | null {
  if (source.serverUrl && source.username && source.token && source.salt) {
    return {
      serverUrl: source.serverUrl,
      username: source.username,
      token: source.token,
      salt: source.salt,
    };
  }
  if (source.key === 'navidrome') return readSession();
  return null;
}

function getEnabledSources(): (SourceState & { session: NavidromeSession })[] {
  const sources = readDataSources();
  return Object.values(sources)
    .filter(
      source => source.provider === 'navidrome' || source.key === 'navidrome'
    )
    .filter(source => source.enabled !== false)
    .map(source => ({ ...source, session: sessionFromSource(source) }))
    .filter((source): source is SourceState & { session: NavidromeSession } =>
      Boolean(source.session)
    );
}

function contextForSource(
  source?: SourceState & { session?: NavidromeSession }
) {
  return {
    sourceKey: source?.key || 'navidrome',
    sourceName: source?.name || 'Navidrome',
    session: source?.session || readSession(),
  } as MapContext;
}

function parseScopedId(id: Id): { sourceKey?: string; id: string } {
  const value = String(id);
  const sources = readDataSources();
  const separator = value.indexOf(':');
  if (separator <= 0) return { id: value };
  const sourceKey = value.slice(0, separator);
  if (!sources[sourceKey]) return { id: value };
  return { sourceKey, id: value.slice(separator + 1) };
}

function configForContext(context: MapContext = {}): NavidromeRequestConfig {
  return context.session ? { session: context.session } : {};
}

function sourceForKey(sourceKey?: string) {
  if (!sourceKey) return null;
  const source = readDataSources()[sourceKey];
  const session = source ? sessionFromSource(source) : null;
  return source && session ? { ...source, session } : null;
}

async function allEnabled<T>(
  loader: (source: SourceState & { session: NavidromeSession }) => Promise<T[]>
): Promise<T[]> {
  const results = await Promise.all(
    getEnabledSources().map(source => loader(source).catch(() => []))
  );
  return results.flat();
}

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

type ArtistListParams = {
  limit?: number;
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

async function getSongsByAlbumIds(
  albumIds: Id[] = [],
  context: MapContext = {}
) {
  const unique = [...new Set(albumIds)].filter(Boolean).slice(0, 6);
  if (unique.length === 0) return [];

  const albums = await Promise.all(
    unique.map(id =>
      requestSubsonic<{ album?: NavidromeAlbum & { song?: NavidromeSong[] } }>(
        'getAlbum',
        { id },
        configForContext(context)
      )
        .then(response => response.album)
        .catch(() => null)
    )
  );

  return albums
    .filter(isPresent)
    .flatMap(album =>
      (album.song || []).slice(0, 5).map(song => mapSong(song, context))
    )
    .slice(0, 24);
}

function parseSongListResponse(response: SongListResponse): NavidromeSong[] {
  if (Array.isArray(response?.song)) return response.song;
  if (!Array.isArray(response?.songs) && Array.isArray(response?.songs?.song)) {
    return response.songs.song;
  }
  if (Array.isArray(response?.songs)) return response.songs;
  return [];
}

function parseAlbumListResponse(response: AlbumListResponse): NavidromeAlbum[] {
  if (Array.isArray(response?.albumList2?.album))
    return response.albumList2.album;
  if (Array.isArray(response?.albumList?.album))
    return response.albumList.album;
  if (Array.isArray(response?.album)) return response.album;
  return [];
}

export async function login(params: LoginParams) {
  const session = await loginWithPassword(params);
  const profile = await getProfile();
  return {
    code: 200,
    profile,
    session,
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

export function getSources() {
  return Object.values(readDataSources())
    .filter(
      source => source.provider === 'navidrome' || source.key === 'navidrome'
    )
    .map(source => ({
      key: source.key,
      name: source.name || 'Navidrome',
      serverUrl: source.serverUrl || sessionFromSource(source)?.serverUrl || '',
      username: source.username || sessionFromSource(source)?.username || '',
      enabled: source.enabled !== false,
    }));
}

export async function getPlaylistList(context: MapContext = {}) {
  const response = await requestSubsonic<{
    playlists?: { playlist?: NavidromePlaylist[] };
  }>('getPlaylists', {}, configForContext(context));
  const playlists = response.playlists?.playlist || [];
  return playlists.map(raw => ({
    ...mapPlaylist(raw, context),
    tracks: [],
    trackIds: [],
    trackCount: Number(raw.songCount || 0),
  }));
}

export async function getAllPlaylistList() {
  return allEnabled(source => getPlaylistList(contextForSource(source)));
}

export async function getPlaylistDetail(id: Id) {
  const scoped = parseScopedId(id);
  const source = sourceForKey(scoped.sourceKey);
  const context = source ? contextForSource(source) : {};
  const response = await requestSubsonic<{ playlist?: NavidromePlaylist }>(
    'getPlaylist',
    { id: scoped.id },
    configForContext(context)
  );
  return mapPlaylist(response.playlist || {}, context);
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
  const scoped = parseScopedId(id);
  const source = sourceForKey(scoped.sourceKey);
  const context = source ? contextForSource(source) : {};
  const response = await requestSubsonic<{
    album?: NavidromeAlbum & { song?: NavidromeSong[] };
  }>('getAlbum', { id: scoped.id }, configForContext(context));
  const album = mapAlbum(response.album || {}, context);
  const songs = (response.album?.song || []).map(song =>
    mapSong(song, context)
  );
  return {
    album,
    songs,
  };
}

export async function getArtistDetail(id: Id) {
  const scoped = parseScopedId(id);
  const source = sourceForKey(scoped.sourceKey);
  const context = source ? contextForSource(source) : {};
  const response = await requestSubsonic<{
    artist?: NavidromeArtist & { album?: NavidromeAlbum[] };
  }>('getArtist', { id: scoped.id }, configForContext(context));
  const artistRaw = response.artist || {};
  const artist = mapArtist(artistRaw, context);
  const hotSongs = await getSongsByAlbumIds(
    (artistRaw.album || []).map(album => album.id),
    context
  );
  return {
    artist,
    hotSongs,
  };
}

export async function getArtistAlbums(id: Id, limit = 200) {
  const scoped = parseScopedId(id);
  const source = sourceForKey(scoped.sourceKey);
  const context = source ? contextForSource(source) : {};
  const response = await requestSubsonic<{
    artist?: { album?: NavidromeAlbum[] };
  }>('getArtist', { id: scoped.id }, configForContext(context));
  const albums = (response.artist?.album || []).map(album =>
    mapAlbum(album, context)
  );
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

  const response = await requestSubsonic<{
    searchResult3?: SearchResultResponse;
  }>('search3', {
    query: keywords,
    songCount: type === 1 || type === 1018 ? limit : 0,
    songOffset: type === 1 || type === 1018 ? offset : 0,
    artistCount: type === 100 || type === 1018 ? limit : 0,
    artistOffset: type === 100 || type === 1018 ? offset : 0,
    albumCount: type === 10 || type === 1018 ? limit : 0,
    albumOffset: type === 10 || type === 1018 ? offset : 0,
  });

  const result = response.searchResult3 || {};
  const songs = (result.song || []).map(song => mapSong(song));
  const artists = (result.artist || []).map(artist => mapArtist(artist));
  const albums = (result.album || []).map(album => mapAlbum(album));

  return {
    result: {
      songs,
      artists,
      albums,
      playlists: [],
      hasMore: songs.length + artists.length + albums.length >= limit,
      songCount: songs.length,
      artistCount: artists.length,
      albumCount: albums.length,
    },
  };
}

export async function getLibrarySongs({
  offset = 0,
  limit = 100,
}: LibrarySongsParams = {}) {
  const safeOffset = Math.max(0, Number(offset) || 0);
  const safeLimit = Math.max(1, Number(limit) || 100);
  const sources = getEnabledSources();

  if (sources.length > 1) {
    const perSourceOffset = Math.floor(safeOffset / sources.length);
    const perSourceLimit = Math.ceil(safeLimit / sources.length);
    const songs = await allEnabled(source =>
      getLibrarySongsForContext(
        { offset: perSourceOffset, limit: perSourceLimit },
        contextForSource(source)
      ).then(result => result.songs)
    );
    return {
      songs: songs.slice(0, safeLimit),
      hasMore: songs.length >= safeLimit,
    };
  }

  return getLibrarySongsForContext({ offset: safeOffset, limit: safeLimit });
}

async function getLibrarySongsForContext(
  { offset = 0, limit = 100 }: LibrarySongsParams = {},
  context: MapContext = {}
) {
  const safeOffset = Math.max(0, Number(offset) || 0);
  const safeLimit = Math.max(1, Number(limit) || 100);

  try {
    const response = await requestSubsonic<SongListResponse>(
      'getSongs',
      {
        offset: safeOffset,
        limit: safeLimit,
      },
      configForContext(context)
    );
    const rawSongs = parseSongListResponse(response);
    return {
      songs: rawSongs.map(song => mapSong(song, context)),
      hasMore: rawSongs.length >= safeLimit,
    };
  } catch (_error) {
    try {
      const response = await requestSubsonic<{
        searchResult3?: SearchResultResponse;
      }>(
        'search3',
        {
          query: '',
          songCount: safeLimit,
          songOffset: safeOffset,
          artistCount: 0,
          albumCount: 0,
        },
        configForContext(context)
      );
      const rawSongs = response.searchResult3?.song || [];
      return {
        songs: rawSongs.map(song => mapSong(song, context)),
        hasMore: rawSongs.length >= safeLimit,
      };
    } catch (_fallbackError) {
      const response = await requestSubsonic<{
        randomSongs?: { song?: NavidromeSong[] };
      }>(
        'getRandomSongs',
        {
          size: safeLimit,
        },
        configForContext(context)
      );
      const rawSongs = response.randomSongs?.song || [];
      return {
        songs: rawSongs.map(song => mapSong(song, context)),
        hasMore: false,
      };
    }
  }
}

export async function refreshLibrary(sourceKey?: string) {
  const source = sourceForKey(sourceKey) || getEnabledSources()[0];
  const context = contextForSource(source);
  const response = await requestSubsonic<{
    scanStatus?: { scanning?: boolean; count?: number };
  }>('startScan', {}, configForContext(context));
  return {
    code: 200,
    scanning: Boolean(response.scanStatus?.scanning),
    count: response.scanStatus?.count || 0,
  };
}

export async function getRandomSongs(size = 24, context: MapContext = {}) {
  const safeSize = Math.max(1, Number(size) || 24);
  const response = await requestSubsonic<{
    randomSongs?: { song?: NavidromeSong[] };
  }>(
    'getRandomSongs',
    {
      size: safeSize,
    },
    configForContext(context)
  );
  const rawSongs = response.randomSongs?.song || [];
  return rawSongs.map(song => mapSong(song, context));
}

export async function getAllRandomSongs(size = 24) {
  const sources = getEnabledSources();
  const perSourceSize = Math.max(
    1,
    Math.ceil(size / Math.max(1, sources.length))
  );
  const songs = await allEnabled(source =>
    getRandomSongs(perSourceSize, contextForSource(source))
  );
  return songs.slice(0, size);
}

export async function getAlbumListByType(
  { type = 'random', size = 24, offset = 0 }: AlbumListParams = {},
  context: MapContext = {}
) {
  const safeSize = Math.max(1, Number(size) || 24);
  const safeOffset = Math.max(0, Number(offset) || 0);
  const response = await requestSubsonic<AlbumListResponse>(
    'getAlbumList2',
    {
      type,
      size: safeSize,
      offset: safeOffset,
    },
    configForContext(context)
  );
  const rawAlbums = parseAlbumListResponse(response);
  return rawAlbums.map(album => mapAlbum(album, context));
}

export async function getAllAlbumListByType(params: AlbumListParams = {}) {
  const { size = 24, offset = 0 } = params;
  const sources = getEnabledSources();
  const perSourceOffset = Math.floor(
    Number(offset || 0) / Math.max(1, sources.length)
  );
  const perSourceSize = Math.ceil(
    Number(size || 24) / Math.max(1, sources.length)
  );
  const albums = await allEnabled(source =>
    getAlbumListByType(
      { ...params, size: perSourceSize, offset: perSourceOffset },
      contextForSource(source)
    )
  );
  return albums.slice(0, Number(size || 24));
}

export async function getAllArtists(context: MapContext = {}) {
  const response = await requestSubsonic<{
    artists?: { index?: { artist?: NavidromeArtist[] }[] };
  }>('getArtists', {}, configForContext(context));
  const indexes = response.artists?.index || [];
  return indexes
    .flatMap(index => index.artist || [])
    .filter(Boolean)
    .map(artist => mapArtist(artist, context));
}

export async function getAllSourcesArtists() {
  return allEnabled(source => getAllArtists(contextForSource(source)));
}

export async function getArtistList({
  limit = 50,
  offset = 0,
}: ArtistListParams = {}) {
  const safeLimit = Math.max(1, Number(limit) || 50);
  const safeOffset = Math.max(0, Number(offset) || 0);

  try {
    const response = await requestSubsonic<{
      searchResult3?: SearchResultResponse;
    }>(
      'search3',
      {
        query: '',
        artistCount: safeLimit,
        artistOffset: safeOffset,
        albumCount: 0,
        songCount: 0,
      },
      configForContext({})
    );
    const rawArtists = response.searchResult3?.artist || [];
    return {
      artists: rawArtists.map(artist => mapArtist(artist)),
      hasMore: rawArtists.length >= safeLimit,
    };
  } catch (_error) {
    const artists = await getAllArtists();
    return {
      artists: artists.slice(safeOffset, safeOffset + safeLimit),
      hasMore: artists.length > safeOffset + safeLimit,
    };
  }
}

export async function getSongDetails(ids: string | number) {
  const idList = String(ids)
    .split(',')
    .map(id => id.trim())
    .filter(Boolean);

  const songs = await Promise.all(
    idList.map(id => {
      const scoped = parseScopedId(id);
      const source = sourceForKey(scoped.sourceKey);
      const context = source ? contextForSource(source) : {};
      return requestSubsonic<{ song?: NavidromeSong }>(
        'getSong',
        { id: scoped.id },
        configForContext(context)
      )
        .then(response => mapSong(response.song || {}, context))
        .catch(() => null);
    })
  );

  return {
    songs: songs.filter(isPresent),
    privileges: songs
      .filter(isPresent)
      .map(song => ({ id: song.id, pl: 320000 })),
  };
}

export async function getLyrics(id: Id) {
  const scoped = parseScopedId(id);
  const source = sourceForKey(scoped.sourceKey);
  const context = source ? contextForSource(source) : {};
  try {
    const response = await requestSubsonic<{
      lyricsList?: { structuredLyrics?: { line?: LyricsLine[] }[] };
    }>('getLyricsBySongId', { id: scoped.id }, configForContext(context));
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
  const scoped = parseScopedId(id);
  const source = sourceForKey(scoped.sourceKey);
  const context = source ? contextForSource(source) : {};
  if (like) {
    await requestSubsonic('star', { id: scoped.id }, configForContext(context));
  } else {
    await requestSubsonic(
      'unstar',
      { id: scoped.id },
      configForContext(context)
    );
  }
  return { code: 200 };
}

export async function starAlbum(id: Id, like = true) {
  const scoped = parseScopedId(id);
  const source = sourceForKey(scoped.sourceKey);
  const context = source ? contextForSource(source) : {};
  if (like) {
    await requestSubsonic(
      'star',
      { albumId: scoped.id },
      configForContext(context)
    );
  } else {
    await requestSubsonic(
      'unstar',
      { albumId: scoped.id },
      configForContext(context)
    );
  }
  return { code: 200 };
}

export async function starArtist(id: Id, like = true) {
  const scoped = parseScopedId(id);
  const source = sourceForKey(scoped.sourceKey);
  const context = source ? contextForSource(source) : {};
  if (like) {
    await requestSubsonic(
      'star',
      { artistId: scoped.id },
      configForContext(context)
    );
  } else {
    await requestSubsonic(
      'unstar',
      { artistId: scoped.id },
      configForContext(context)
    );
  }
  return { code: 200 };
}

export async function getStarred() {
  const sources = getEnabledSources();
  if (sources.length > 1) {
    const results = await Promise.all(
      sources.map(source =>
        getStarredForContext(contextForSource(source)).catch(() => ({
          songs: [],
          albums: [],
          artists: [],
        }))
      )
    );
    return {
      songs: results.flatMap(result => result.songs),
      albums: results.flatMap(result => result.albums),
      artists: results.flatMap(result => result.artists),
    };
  }
  return getStarredForContext(contextForSource(sources[0]));
}

async function getStarredForContext(context: MapContext = {}) {
  const response = await requestSubsonic<{
    starred2?: SearchResultResponse;
  }>('getStarred2', {}, configForContext(context));
  const starred = response.starred2 || {};

  return {
    songs: (starred.song || []).map(song => mapSong(song, context)),
    albums: (starred.album || []).map(album => mapAlbum(album, context)),
    artists: (starred.artist || []).map(artist => mapArtist(artist, context)),
  };
}

export async function scrobbleSong({
  id,
  time,
  submission = true,
}: ScrobbleSongParams) {
  const scoped = parseScopedId(id);
  const source = sourceForKey(scoped.sourceKey);
  const context = source ? contextForSource(source) : {};
  await requestSubsonic(
    'scrobble',
    {
      id: scoped.id,
      time: Number(time) > 1000000000000 ? Number(time) : Date.now(),
      submission: submission ? 'true' : 'false',
    },
    configForContext(context)
  );
  return { code: 200 };
}
