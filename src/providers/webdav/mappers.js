import {
  buildWebdavProxyUrl,
  buildWebdavSourceKey,
  normalizeWebdavUrl,
} from './client';

const COVER_FILENAMES = new Set([
  'cover.jpg',
  'cover.jpeg',
  'cover.png',
  'folder.jpg',
  'folder.jpeg',
  'folder.png',
]);

function stripExtension(name = '') {
  return String(name).replace(/\.[^.]+$/, '');
}

function getDirectory(path = '/') {
  const parts = String(path || '/')
    .split('/')
    .filter(Boolean);
  parts.pop();
  return `/${parts.join('/')}`.replace(/\/$/, '') || '/';
}

function splitPath(path = '/') {
  return String(path || '/')
    .split('/')
    .filter(Boolean);
}

function normalizeTitle(name = '') {
  return stripExtension(name)
    .replace(/^\s*\d+\s*[-_. ]+/, '')
    .trim();
}

function parseTrackNumber(name = '') {
  const match = stripExtension(name).match(/^\s*(\d{1,3})(?:\D|$)/);
  return match ? Number(match[1]) : 0;
}

function findSibling(entries = [], path = '/', predicate) {
  const directory = getDirectory(path);
  return entries.find(entry => {
    if (entry.isDirectory) return false;
    if (getDirectory(entry.path) !== directory) return false;
    return predicate(entry);
  });
}

function findSiblingCover(entries, path) {
  return findSibling(entries, path, entry =>
    COVER_FILENAMES.has(String(entry.name || '').toLowerCase())
  );
}

function findSiblingLyrics(entries, path, title) {
  const expected = `${stripExtension(title).toLowerCase()}.lrc`;
  return findSibling(entries, path, entry => {
    const name = String(entry.name || '').toLowerCase();
    return name === expected || name.endsWith('.lrc');
  });
}

function inferLibraryFields(entry = {}) {
  const parts = splitPath(entry.path);
  const filename = entry.name || parts[parts.length - 1] || 'Unknown Track';
  const title = normalizeTitle(filename) || stripExtension(filename);
  const albumName =
    parts.length >= 2 ? parts[parts.length - 2] : 'Unknown Album';
  const artistName =
    parts.length >= 3 ? parts[parts.length - 3] : 'Unknown Artist';

  return {
    title,
    albumName,
    artistName,
    trackNumber: parseTrackNumber(filename),
  };
}

function safeSourcePart(value = '') {
  return encodeURIComponent(String(value || '').trim() || 'unknown').replace(
    /%/g,
    '~'
  );
}

export function mapEntryToTrack(
  entry = {},
  source = {},
  contextEntries = [],
  metadata = null
) {
  const sourceKey = buildWebdavSourceKey(source);
  const uid = `${sourceKey}:file:${entry.path}`;
  const inferred = inferLibraryFields(entry);
  const title = metadata?.title || inferred.title;
  const albumName = metadata?.album || inferred.albumName;
  const artistName =
    metadata?.artists?.[0] || metadata?.artist || inferred.artistName;
  const trackNumber = Number(metadata?.track || inferred.trackNumber) || 0;
  const cover = findSiblingCover(contextEntries, entry.path);
  const lyrics = findSiblingLyrics(contextEntries, entry.path, entry.name);
  const coverUrl = cover
    ? buildWebdavProxyUrl(sourceKey, cover.path)
    : metadata?.cover?.dataUrl
    ? metadata.cover.dataUrl
    : '/img/logos/yesplaymusic.png';
  const safeSourceKey = safeSourcePart(sourceKey);
  const artistId = `webdav:artist:${safeSourceKey}:${safeSourcePart(
    artistName
  )}`;
  const albumId = `webdav:album:${safeSourceKey}:${safeSourcePart(
    `${artistName}/${albumName}`
  )}`;

  return {
    id: uid,
    uid,
    source: 'webdav',
    sourceKey,
    sourceId: entry.path,
    sourceType: 'webdav',
    path: entry.path,
    name: title,
    dt: Math.max(1, Number(metadata?.duration || 0) * 1000 || 1000),
    no: trackNumber,
    cd: 1,
    ar: [{ id: artistId, name: artistName }],
    artists: [{ id: artistId, name: artistName }],
    al: {
      id: albumId,
      name: albumName,
      picUrl: coverUrl,
    },
    album: {
      id: albumId,
      name: albumName,
      picUrl: coverUrl,
    },
    alia: [],
    tns: [],
    fee: 0,
    mark: 0,
    playable: true,
    reason: '',
    extension: entry.extension,
    contentType: entry.contentType,
    contentLength: entry.contentLength,
    lastModified: entry.lastModified,
    folderPath: getDirectory(entry.path),
    coverPath: cover?.path || '',
    embeddedCover: metadata?.cover?.dataUrl || '',
    lyricsPath: lyrics?.path || '',
    genre: metadata?.genre || [],
    year: metadata?.year || 0,
    bitrate: metadata?.bitrate || 0,
    codec: metadata?.codec || '',
    serverUrl: normalizeWebdavUrl(source.serverUrl),
    streamUrl: buildWebdavProxyUrl(sourceKey, entry.path),
    privilege: {
      id: uid,
      pl: 320000,
      fee: 0,
      st: 0,
      cs: false,
    },
  };
}
