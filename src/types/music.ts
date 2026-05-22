export type TrackId = string | number;

export type ArtistSummary = {
  id?: TrackId;
  name?: string;
};

export type AlbumSummary = {
  id?: TrackId;
  name?: string;
  picUrl?: string;
};

export type Track = {
  id: TrackId;
  uid?: TrackId;
  source?: string;
  sourceId?: TrackId;
  sourceType?: string;
  name?: string;
  dt?: number;
  streamUrl?: string;
  ar?: ArtistSummary[];
  artists?: ArtistSummary[];
  al?: AlbumSummary;
  album?: AlbumSummary;
  [key: string]: unknown;
};

export type PlaylistTrackRef = {
  id: TrackId;
};

export type PlaylistDetail = {
  id?: TrackId;
  name?: string;
  coverImgUrl?: string;
  tracks: Track[];
  trackIds: PlaylistTrackRef[];
  [key: string]: unknown;
};
