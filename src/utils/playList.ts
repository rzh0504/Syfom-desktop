import router from '../router';
import state from '../store/state';
import {
  recommendPlaylist,
  dailyRecommendPlaylist,
  getPlaylistDetail,
} from '@/api/playlist';
import { isAccountLoggedIn } from '@/utils/auth';

type RecommendPlaylist = {
  id: string | number;
  name?: string;
  picUrl?: string;
  coverImgUrl?: string;
};

export function hasListSource(): boolean {
  return !state.player.isPersonalFM && state.player.playlistSource.id !== 0;
}

export function goToListSource(): void {
  router.push({ path: getListSourcePath() });
}

export function getListSourcePath(): string {
  if (state.player.playlistSource.id === state.data.likedSongPlaylistID) {
    return '/library/liked-songs';
  } else if (state.player.playlistSource.type === 'url') {
    return state.player.playlistSource.id;
  } else if (state.player.playlistSource.type === 'cloudDisk') {
    return '/library';
  } else {
    return `/${state.player.playlistSource.type}/${state.player.playlistSource.id}`;
  }
}

export async function getRecommendPlayList(
  limit: number,
  removePrivateRecommand?: boolean
) {
  if (isAccountLoggedIn()) {
    const playlists = await Promise.all([
      dailyRecommendPlaylist(),
      recommendPlaylist({ limit }),
    ]);
    let recommend = playlists[0].recommend ?? [];
    if (recommend.length) {
      if (removePrivateRecommand) recommend = recommend.slice(1);
      await replaceRecommendResult(recommend);
    }
    return recommend.concat(playlists[1].result).slice(0, limit);
  } else {
    const response = await recommendPlaylist({ limit });
    return response.result;
  }
}

async function replaceRecommendResult(
  recommend: RecommendPlaylist[]
): Promise<void> {
  for (let r of recommend) {
    if (specialPlaylist.indexOf(Number(r.id)) > -1) {
      const data = await getPlaylistDetail(r.id, true);
      const playlist = data.playlist;
      if (playlist) {
        r.name = playlist.name;
        r.picUrl = playlist.coverImgUrl;
      }
    }
  }
}

const specialPlaylist = [3136952023, 2829883282, 2829816518, 2829896389];
