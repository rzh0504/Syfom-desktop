import { buildWebdavSourceKey, normalizeWebdavUrl } from './client';

function stripExtension(name = '') {
  return String(name).replace(/\.[^.]+$/, '');
}

export function mapEntryToTrack(entry = {}, source = {}) {
  const sourceKey = buildWebdavSourceKey(source);
  const uid = `${sourceKey}:file:${entry.path}`;
  const title = stripExtension(entry.name || entry.path || 'Unknown Track');

  return {
    id: uid,
    uid,
    source: 'webdav',
    sourceId: entry.path,
    sourceType: 'webdav',
    path: entry.path,
    name: title,
    dt: 1000,
    no: 0,
    cd: 1,
    ar: [{ id: '', name: 'Unknown Artist' }],
    artists: [{ id: '', name: 'Unknown Artist' }],
    al: {
      id: '',
      name: 'Unknown Album',
      picUrl: '/img/logos/yesplaymusic.png',
    },
    album: {
      id: '',
      name: 'Unknown Album',
      picUrl: '/img/logos/yesplaymusic.png',
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
    serverUrl: normalizeWebdavUrl(source.serverUrl),
    privilege: {
      id: uid,
      pl: 320000,
      fee: 0,
      st: 0,
      cs: false,
    },
  };
}
