import {
  buildCoverArtUrl,
  buildCoverArtUrlForSession,
  buildStreamUrl,
  buildStreamUrlForSession,
} from './client';
import type { NavidromeSession } from './client';

const SOURCE = 'navidrome';

type MapContext = {
  sourceKey?: string;
  sourceName?: string;
  session?: NavidromeSession | null;
};

export type NavidromeArtist = {
  id?: string;
  name?: string;
  coverArt?: string;
  songCount?: number;
  albumCount?: number;
  album?: NavidromeAlbum[];
  starred?: string | boolean;
};

export type NavidromeAlbum = {
  id?: string;
  name?: string;
  title?: string;
  artist?: string | { id?: string; name?: string };
  artistId?: string;
  artistName?: string;
  year?: string | number;
  coverArt?: string;
  songCount?: number;
  song?: NavidromeSong[];
  comment?: string;
};

export type NavidromeSong = {
  id?: string;
  title?: string;
  name?: string;
  artists?: { id?: string; name?: string }[];
  artistId?: string;
  artist?: string;
  albumId?: string;
  album?: string;
  coverArt?: string;
  duration?: string | number;
  track?: number;
  discNumber?: number;
  created?: string;
  starred?: string | boolean;
  played?: string;
  playCount?: string | number;
};

export type NavidromePlaylist = {
  id?: string;
  name?: string;
  entry?: NavidromeSong[];
  owner?: string;
  username?: string;
  coverArt?: string;
  changed?: string;
  created?: string;
  songCount?: string | number;
  comment?: string;
  public?: boolean;
};

function scopedId(id?: string, context: MapContext = {}) {
  if (!id) return id;
  if (!context.sourceKey || context.sourceKey === SOURCE) return id;
  return `${context.sourceKey}:${id}`;
}

function sourceUid(type: string, id?: string, context: MapContext = {}) {
  const itemId = scopedId(id, context);
  return itemId ? `${SOURCE}:${type}:${itemId}` : '';
}

function coverArtUrl(id?: string, size = 512, context: MapContext = {}) {
  if (!context.session) return buildCoverArtUrl(id, size);
  return buildCoverArtUrlForSession(id, size, context.session);
}

function streamUrl(id?: string, context: MapContext = {}) {
  if (!context.session) return buildStreamUrl(id);
  return buildStreamUrlForSession(id, context.session);
}

export function mapArtist(raw: NavidromeArtist = {}, context: MapContext = {}) {
  return {
    id: scopedId(raw.id, context),
    uid: sourceUid('artist', raw.id, context),
    source: SOURCE,
    sourceId: raw.id,
    sourceKey: context.sourceKey || SOURCE,
    sourceName: context.sourceName || 'Navidrome',
    sourceType: context.sourceKey || SOURCE,
    name: raw.name || 'Unknown Artist',
    img1v1Url: coverArtUrl(raw.coverArt, 1024, context),
    briefDesc: '',
    musicSize: raw.songCount || 0,
    albumSize: raw.albumCount || (raw.album?.length ?? 0),
    mvSize: 0,
    followed: Boolean(raw.starred),
  };
}

export function mapAlbum(raw: NavidromeAlbum = {}, context: MapContext = {}) {
  const artistObject = typeof raw.artist === 'object' ? raw.artist : undefined;
  const artistId = raw.artistId || artistObject?.id || '';
  const artistName =
    (typeof raw.artist === 'string' ? raw.artist : undefined) ||
    raw.artistName ||
    artistObject?.name ||
    'Unknown Artist';
  const year = Number(raw.year) || new Date().getFullYear();

  return {
    id: scopedId(raw.id, context),
    uid: sourceUid('album', raw.id, context),
    source: SOURCE,
    sourceId: raw.id,
    sourceKey: context.sourceKey || SOURCE,
    sourceName: context.sourceName || 'Navidrome',
    sourceType: context.sourceKey || SOURCE,
    name: raw.name || raw.title || 'Unknown Album',
    picUrl: coverArtUrl(raw.coverArt, 1024, context),
    artist: {
      id: scopedId(artistId, context),
      name: artistName,
    },
    artists: [
      {
        id: scopedId(artistId, context),
        name: artistName,
      },
    ],
    publishTime: new Date(`${year}-01-01T00:00:00.000Z`).getTime(),
    size: raw.songCount || raw.song?.length || 0,
    type: '专辑',
    company: '',
    description: raw.comment || '',
    mark: 0,
  };
}

export function mapSong(raw: NavidromeSong = {}, context: MapContext = {}) {
  const artists =
    raw.artists?.length > 0
      ? raw.artists.map(artist => ({
          id: scopedId(artist.id, context),
          name: artist.name,
        }))
      : [
          {
            id: scopedId(raw.artistId || '', context),
            name: raw.artist || 'Unknown Artist',
          },
        ];

  const album = {
    id: scopedId(raw.albumId || '', context),
    name: raw.album || 'Unknown Album',
    picUrl: coverArtUrl(raw.coverArt, 512, context),
  };

  const durationInMs = Math.max(1, Number(raw.duration || 0) * 1000);

  return {
    id: scopedId(raw.id, context),
    uid: sourceUid('song', raw.id, context),
    source: SOURCE,
    sourceId: raw.id,
    sourceKey: context.sourceKey || SOURCE,
    sourceName: context.sourceName || 'Navidrome',
    sourceType: context.sourceKey || SOURCE,
    name: raw.title || raw.name || 'Unknown Track',
    dt: durationInMs,
    no: raw.track || 0,
    cd: raw.discNumber || 1,
    ar: artists,
    artists,
    al: album,
    album,
    alia: [],
    tns: [],
    fee: 0,
    mark: 0,
    streamUrl: streamUrl(raw.id, context),
    created: raw.created,
    addedAt: raw.created,
    starred: raw.starred,
    lastPlayed: raw.played,
    playCount: Number(raw.playCount || 0),
    playable: true,
    reason: '',
    privilege: {
      id: scopedId(raw.id, context),
      pl: 320000,
      fee: 0,
      st: 0,
      cs: false,
    },
  };
}

export function mapPlaylist(
  raw: NavidromePlaylist = {},
  context: MapContext = {}
) {
  const entries = (raw.entry || []).map(song => mapSong(song, context));
  const owner = raw.owner || raw.username || 'Navidrome';

  return {
    id: scopedId(raw.id, context),
    uid: sourceUid('playlist', raw.id, context),
    source: SOURCE,
    sourceId: raw.id,
    sourceKey: context.sourceKey || SOURCE,
    sourceName: context.sourceName || 'Navidrome',
    sourceType: context.sourceKey || SOURCE,
    name: raw.name || 'Untitled Playlist',
    coverImgUrl:
      entries[0]?.al?.picUrl ||
      coverArtUrl(raw.coverArt, 1024, context) ||
      '/img/logos/yesplaymusic.png',
    creator: {
      userId: owner,
      nickname: owner,
    },
    updateTime: new Date(raw.changed || raw.created || Date.now()).getTime(),
    trackCount: Number(raw.songCount || entries.length || 0),
    tracks: entries,
    trackIds: entries.map(song => ({ id: song.id })),
    description: raw.comment || '',
    privacy: raw.public === false ? 10 : 0,
    subscribed: true,
  };
}

export function mapLyrics(
  raw: { value?: string; lyrics?: string; syncedLyrics?: string } = {}
) {
  const lines = raw.value || raw.lyrics || raw.syncedLyrics || '';
  return {
    lrc: {
      lyric: lines || '',
    },
    tlyric: {
      lyric: '',
    },
    romalrc: {
      lyric: '',
    },
  };
}
