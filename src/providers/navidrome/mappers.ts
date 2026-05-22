import { buildCoverArtUrl, buildStreamUrl } from './client';

const SOURCE = 'navidrome';

type NavidromeArtist = {
  id?: string;
  name?: string;
  coverArt?: string;
  songCount?: number;
  albumCount?: number;
  album?: NavidromeAlbum[];
  starred?: string | boolean;
};

type NavidromeAlbum = {
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

type NavidromeSong = {
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
};

type NavidromePlaylist = {
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

function sourceUid(type: string, id?: string) {
  return id ? `${SOURCE}:${type}:${id}` : '';
}

export function mapArtist(raw: NavidromeArtist = {}) {
  return {
    id: raw.id,
    uid: sourceUid('artist', raw.id),
    source: SOURCE,
    sourceId: raw.id,
    sourceType: SOURCE,
    name: raw.name || 'Unknown Artist',
    img1v1Url: buildCoverArtUrl(raw.coverArt, 1024),
    briefDesc: '',
    musicSize: raw.songCount || 0,
    albumSize: raw.albumCount || (raw.album?.length ?? 0),
    mvSize: 0,
    followed: Boolean(raw.starred),
  };
}

export function mapAlbum(raw: NavidromeAlbum = {}) {
  const artistObject = typeof raw.artist === 'object' ? raw.artist : undefined;
  const artistId = raw.artistId || artistObject?.id || '';
  const artistName =
    (typeof raw.artist === 'string' ? raw.artist : undefined) ||
    raw.artistName ||
    artistObject?.name ||
    'Unknown Artist';
  const year = Number(raw.year) || new Date().getFullYear();

  return {
    id: raw.id,
    uid: sourceUid('album', raw.id),
    source: SOURCE,
    sourceId: raw.id,
    sourceType: SOURCE,
    name: raw.name || raw.title || 'Unknown Album',
    picUrl: buildCoverArtUrl(raw.coverArt, 1024),
    artist: {
      id: artistId,
      name: artistName,
    },
    artists: [
      {
        id: artistId,
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

export function mapSong(raw: NavidromeSong = {}) {
  const artists =
    raw.artists?.length > 0
      ? raw.artists.map(artist => ({
          id: artist.id,
          name: artist.name,
        }))
      : [
          {
            id: raw.artistId || '',
            name: raw.artist || 'Unknown Artist',
          },
        ];

  const album = {
    id: raw.albumId || '',
    name: raw.album || 'Unknown Album',
    picUrl: buildCoverArtUrl(raw.coverArt, 512),
  };

  const durationInMs = Math.max(1, Number(raw.duration || 0) * 1000);

  return {
    id: raw.id,
    uid: sourceUid('song', raw.id),
    source: SOURCE,
    sourceId: raw.id,
    sourceType: SOURCE,
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
    streamUrl: buildStreamUrl(raw.id),
    playable: true,
    reason: '',
    privilege: {
      id: raw.id,
      pl: 320000,
      fee: 0,
      st: 0,
      cs: false,
    },
  };
}

export function mapPlaylist(raw: NavidromePlaylist = {}) {
  const entries = (raw.entry || []).map(mapSong);
  const owner = raw.owner || raw.username || 'Navidrome';

  return {
    id: raw.id,
    uid: sourceUid('playlist', raw.id),
    source: SOURCE,
    sourceId: raw.id,
    sourceType: SOURCE,
    name: raw.name || 'Untitled Playlist',
    coverImgUrl:
      entries[0]?.al?.picUrl ||
      buildCoverArtUrl(raw.coverArt, 1024) ||
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
