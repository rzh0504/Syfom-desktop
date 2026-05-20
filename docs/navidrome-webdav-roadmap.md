# Navidrome and WebDAV Player Roadmap

This project is a fork of YesPlayMusic that is being reshaped into a desktop player for private music libraries. The current codebase already has a working Navidrome/OpenSubsonic adaptation and an early WebDAV music-source implementation, but it is not yet a mature multi-source player.

## Current State

| Area | Status | Notes |
| --- | --- | --- |
| Navidrome login | Partial | `src/providers/navidrome/client.js` stores an OpenSubsonic token session locally and validates it with `ping.view`; credential storage is still renderer-local. |
| Navidrome playback | Implemented | Tracks are mapped to YesPlayMusic-compatible objects and streamed through `stream.view`; music-quality settings now feed `maxBitRate`. |
| Navidrome library | Partial | Library songs, playlists, albums, artists, starred items, lyrics, favorites, and scrobbling have basic adapters. Local play history is still missing. |
| WebDAV | Partial | Provider, connection test, directory browsing, recursive scan, IndexedDB song index, library display, search, and playback are implemented. Metadata, covers, lyrics, persistent credentials, and Range streaming are still incomplete. |
| Multi-source architecture | Partial | API modules use `getActiveProvider()`/`getProvider()`, and a registry exists. A complete source switcher and source-aware UI behavior are still incomplete. |
| Offline cache | Partial | Electron audio cache uses `track.uid`/source-aware keys with legacy fallback. WebDAV playback currently uses in-memory blobs and is not integrated with automatic offline caching. |
| Security | Weak | Sessions are stored in renderer `localStorage`; Electron still uses broad renderer privileges. |
| Testing | Weak | Provider, mapper, cache, scanner, and playback paths need automated coverage. |

## Optimization Status

### Completed

1. Source-aware identities are added for Navidrome artists, albums, songs, and playlists in `src/providers/navidrome/mappers.js`.
2. Source-aware identities are added for WebDAV tracks in `src/providers/webdav/mappers.js`.
3. Audio cache keys now prefer `track.uid` and keep fallback reads for legacy cached IDs in `src/utils/db.js`.
4. Provider registry exists in `src/providers/registry.js`, with Navidrome and WebDAV registered and exposed through `getActiveProvider()`, `getProvider()`, and `listProviders()`.
5. API modules have been moved away from direct Navidrome imports and now use the active provider or explicit WebDAV provider where needed.
6. Navidrome stream URLs now honor the configured music quality through `maxBitRate` in `src/providers/navidrome/client.js`.
7. WebDAV connection testing and directory browsing are available from the settings page.
8. WebDAV directory entries are cached in IndexedDB, and browsing can fall back to cached entries after request failures.
9. WebDAV audio files can be indexed into `webdavTracks`, displayed in the library, searched, and played back through authenticated downloads.
10. WebDAV recursive scanning reports directory, audio, failed, and current-path progress in the settings page.
11. Navidrome scrobbling now sends OpenSubsonic-compatible timestamp and submission values.

### Not Completed

1. WebDAV genre browsing, year browsing, and explicit folder browsing pages are not implemented.
2. WebDAV credentials are saved through Electron main-process storage for proxy reuse and use `safeStorage` encryption when available; unsupported Electron/runtime encryption falls back to unencrypted store records.
3. A basic source-management UI exists for viewing Navidrome/WebDAV state, switching the default provider, disabling WebDAV, and deleting the WebDAV source. Managing multiple WebDAV connections is still missing.
4. WebDAV tracks are integrated with the automatic audio-cache entry point, but bulk offline download by album/playlist/folder is not implemented.
5. Local favorites and local play history for WebDAV are implemented; local editable playlists for WebDAV are still missing.
6. Source-aware queue behavior still needs a full audit beyond basic `uid` cache support.
7. Electron security hardening is still pending: renderer privileges are still broad.
8. Automated tests for providers, mappers, cache behavior, scanner behavior, and playback fallback are still missing.

## Product Goals

1. Provide a reliable Navidrome/OpenSubsonic desktop player.
2. Add WebDAV as a first-class music source, not as a legacy cloud-disk feature.
3. Support multiple sources without ID collisions or source-specific UI branching.
4. Build a local music index for WebDAV with metadata, covers, search, and incremental scans.
5. Make playback, cache, favorites, playlists, and history source-aware.
6. Improve credential handling and Electron security before storing WebDAV passwords.

## Target Architecture

```text
UI Views / Components
        |
Compatibility API Layer
        |
Provider Registry
        |
+-------------------+-------------------+
| NavidromeProvider | WebDAVProvider    |
+-------------------+-------------------+
        |                   |
OpenSubsonic API      WebDAV Client
        |                   |
        |             Metadata Scanner
        |                   |
        +--------- IndexedDB --------+
                  |
              Player Service
                  |
        Stream Resolver / Local Proxy
                  |
             Howler / HTMLAudio
```

## Standard Track Identity

Every track should have a stable source-aware identity while retaining the old YesPlayMusic-compatible fields required by existing UI components.

```js
{
  id: 'legacy-compatible-id',
  uid: 'navidrome:song:abc123',
  source: 'navidrome',
  sourceId: 'abc123',
  sourceType: 'navidrome'
}
```

For WebDAV, the source ID should be based on the source connection plus normalized path, not only the filename.

```js
{
  uid: 'webdav:file:<stable-hash>',
  source: 'webdav',
  sourceId: '/Music/Artist/Album/01.flac',
  path: '/Music/Artist/Album/01.flac'
}
```

## Phase 1: Stabilize Navidrome

1. [x] Add `uid`, `source`, `sourceId`, and `sourceType` to mapped Navidrome tracks, albums, artists, and playlists.
2. [x] Make audio cache keys source-aware while keeping fallback reads for previously cached tracks.
3. [x] Make music quality settings affect Navidrome `stream.view` requests through `maxBitRate` or a provider option.
4. [ ] Add clearer errors for authentication failures, unsupported APIs, unreachable servers, and unplayable songs.
5. [ ] Add local play history so the library page is not empty when Navidrome does not expose the desired history shape.
6. [ ] Clean up obvious YesPlayMusic/Netease wording that conflicts with the new product direction.
7. [ ] Add unit tests for Navidrome URL building, response unwrapping, and mappers.

## Phase 2: Introduce Provider Registry

1. [x] Add a provider registry with an active source selector.
2. [x] Move API modules from direct `navidromeProvider` imports to `getActiveProvider()`.
3. [~] Store configured sources and active provider in app state/local storage. `activeProvider`, `sources`, and a settings-page default-provider switcher exist; a full `activeSourceId` model for multiple same-type sources is still missing.
4. [x] Define source capabilities such as `canStar`, `canScrobble`, `canServerPlaylist`, `canBrowseFiles`, and `requiresLocalIndex`.
5. [~] Update playback, favorites, cache, and queue code to use `track.uid` where possible. Cache and WebDAV track detail paths are covered; favorites, playlists, queue, and history still need a full source-aware audit.

## Phase 3: WebDAV MVP

1. [x] Add WebDAV source creation and connection testing.
2. [x] Implement directory browsing with `PROPFIND Depth: 1`.
3. [~] Let users choose one or more music roots. A single browsed root can be saved; multiple roots and multiple WebDAV sources are not complete.
4. [x] Scan audio files into a local IndexedDB index.
5. [x] Parse basic metadata with `music-metadata` through Electron-safe code paths.
6. [x] Display WebDAV songs in the library.
7. [~] Resolve WebDAV tracks to playable URLs through a local proxy or authenticated request layer. Authenticated request downloads are implemented; local proxy and streaming are not.
8. [x] Support basic search over the local WebDAV index.
9. [~] Show scan progress, skipped files, and recoverable errors. Progress and failed-directory counts exist; detailed skipped-file reporting is not implemented.

## Phase 4: Mature WebDAV Library

1. [ ] Add incremental scanning with ETag, Last-Modified, and Content-Length checks.
2. [x] Support embedded covers and sibling cover files such as `cover.jpg` and `folder.jpg`.
3. [x] Support `.lrc` lyrics next to audio files.
4. [~] Add album, artist, genre, year, and folder browsing. Album and artist grouping are implemented from parsed/path-derived metadata; genre, year, and folder pages are still missing.
5. [~] Add local favorites, playlists, and play history for WebDAV. Local favorites and play history are implemented; local editable playlists are still missing.
6. [~] Add source-aware offline downloads by song, album, playlist, and folder. Song-level automatic cache entry is wired; explicit album, playlist, and folder downloads are still missing.
7. [~] Improve large library performance with normalized search fields and paged queries. Paged queries exist; normalized search fields and indexes are still missing.

## Phase 5: Player and Desktop Maturity

1. [ ] Add explicit player states: `idle`, `loading`, `playing`, `paused`, `buffering`, and `error`.
2. [ ] Improve playback error recovery and user-facing error messages.
3. [~] Support more formats and MIME-aware playback decisions. WebDAV detects common audio extensions and `audio/*` content types; full MIME-aware playback decisions are still missing.
4. [x] Ensure WebDAV streaming supports Range requests for seeking.
5. [ ] Improve MediaSession, MPRIS, tray, and global shortcut metadata.
6. [ ] Consider ReplayGain, volume normalization, and optional crossfade after the core library is stable.

## Security Work

1. Move credentials out of renderer `localStorage` before storing WebDAV passwords.
2. Use Electron main-process storage with OS-backed encryption where practical.
3. Avoid exposing authenticated stream URLs in DOM titles, tooltips, logs, or persisted track objects.
4. Gradually reduce renderer privileges by moving toward `contextIsolation: true` and removing unnecessary Node access.
5. Keep local proxy endpoints bound to `127.0.0.1` and validate requested track IDs against the local source registry.

## First Implementation Slice

The safest initial code changes were:

1. [x] Add source-aware identity fields to Navidrome mapper output.
2. [x] Make cached audio source keys source-aware with backward-compatible cache reads.
3. [x] Add a provider registry skeleton while keeping Navidrome as the default active provider.
4. [x] Add WebDAV provider skeletons after the registry is in place.
5. [ ] Add small tests around the changed mapper/cache behavior before expanding the architecture further.
