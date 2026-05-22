// import store, { state, dispatch, commit } from "@/store";
import { isAccountLoggedIn, isLooseLoggedIn } from '@/utils/auth';
import { likeATrack } from '@/api/track';
import { getTrackDetail } from '@/api/track';
import {
  userPlaylist,
  userLikedSongsIDs,
  likedAlbums,
  likedArtists,
  userAccount,
} from '@/api/user';

type ActionContextLike = {
  state: Record<string, any>;
  commit: (type: string, payload?: any) => void;
  dispatch: (type: string, payload?: any) => Promise<any>;
};

export default {
  showToast({ state, commit }: ActionContextLike, text: string) {
    if (state.toast.timer !== null) {
      clearTimeout(state.toast.timer);
      commit('updateToast', { show: false, text: '', timer: null });
    }
    commit('updateToast', {
      show: true,
      text,
      timer: setTimeout(() => {
        commit('updateToast', {
          show: false,
          text: state.toast.text,
          timer: null,
        });
      }, 3200),
    });
  },
  likeATrack(
    { state, commit, dispatch }: ActionContextLike,
    id: string | number
  ) {
    if (!isAccountLoggedIn()) {
      dispatch('showToast', '请先登录 Navidrome 账号');
      return;
    }
    const isLiked = state.liked.songs.some(
      songId => String(songId) === String(id)
    );
    const like = !isLiked;

    return likeATrack({ id, like })
      .then(() => {
        if (like === false) {
          commit('updateLikedXXX', {
            name: 'songs',
            data: state.liked.songs.filter(d => String(d) !== String(id)),
          });
        } else {
          commit('updateLikedXXX', {
            name: 'songs',
            data: [
              ...state.liked.songs.filter(d => String(d) !== String(id)),
              id,
            ],
          });
        }
        return dispatch('fetchLikedSongsWithDetails').then(() =>
          dispatch('fetchLikedPlaylist')
        );
      })
      .catch(() => {
        dispatch('showToast', '操作失败，请稍后重试');
      });
  },
  fetchLikedSongs: ({ state, commit }: ActionContextLike) => {
    if (!isLooseLoggedIn()) {
      commit('updateLikedXXX', {
        name: 'songs',
        data: [],
      });
      return;
    }
    if (isAccountLoggedIn()) {
      return userLikedSongsIDs({ uid: state.data.user.userId }).then(result => {
        if (result.ids) {
          commit('updateLikedXXX', {
            name: 'songs',
            data: result.ids,
          });
        }
      });
    } else {
      // TODO:搜索ID登录的用户
    }
  },
  fetchLikedSongsWithDetails: ({ state, commit }: ActionContextLike) => {
    const likedSongIds = state.liked.songs.slice(0, 12);
    if (likedSongIds.length === 0) {
      commit('updateLikedXXX', {
        name: 'songsWithDetails',
        data: [],
      });
      return Promise.resolve();
    }

    return getTrackDetail(likedSongIds.join(',')).then(result => {
      commit('updateLikedXXX', {
        name: 'songsWithDetails',
        data: result.songs,
      });
    });
  },
  fetchLikedPlaylist: ({ state, commit }: ActionContextLike) => {
    const likedSongPlaylistID = 'starred';
    const starredPlaylist = {
      id: likedSongPlaylistID,
      name: '我喜欢的音乐',
      coverImgUrl: state.data.user?.avatarUrl || '/img/logos/yesplaymusic.png',
      creator: {
        userId: state.data.user?.userId || 'local',
        nickname: state.data.user?.nickname || 'Me',
      },
      trackCount: state.liked.songs.length,
      trackIds: state.liked.songs.map(id => ({ id })),
      tracks: state.liked.songsWithDetails,
      subscribed: true,
      privacy: 0,
      updateTime: Date.now(),
      description: '',
    };

    if (!isLooseLoggedIn()) {
      commit('updateLikedXXX', {
        name: 'playlists',
        data: [starredPlaylist],
      });
      commit('updateData', {
        key: 'likedSongPlaylistID',
        value: likedSongPlaylistID,
      });
      return;
    }
    if (isAccountLoggedIn()) {
      return userPlaylist({
        uid: state.data.user?.userId,
        limit: 2000, // 最多只加载2000个歌单（等有用户反馈问题再修）
        timestamp: new Date().getTime(),
      }).then(result => {
        if (result.playlist) {
          const playlists = [starredPlaylist, ...result.playlist];
          commit('updateLikedXXX', {
            name: 'playlists',
            data: playlists,
          });
          // 更新用户”喜欢的歌曲“歌单ID
          commit('updateData', {
            key: 'likedSongPlaylistID',
            value: likedSongPlaylistID,
          });
        }
      });
    } else {
      // TODO:搜索ID登录的用户
    }
  },
  fetchLikedAlbums: ({ commit }: ActionContextLike) => {
    if (!isAccountLoggedIn()) return;
    return likedAlbums({ limit: 2000 }).then(result => {
      if (result.data) {
        commit('updateLikedXXX', {
          name: 'albums',
          data: result.data,
        });
      }
    });
  },
  fetchLikedArtists: ({ commit }: ActionContextLike) => {
    if (!isAccountLoggedIn()) return;
    return likedArtists({ limit: 2000 }).then(result => {
      if (result.data) {
        commit('updateLikedXXX', {
          name: 'artists',
          data: result.data,
        });
      }
    });
  },
  fetchLikedMVs: ({ commit }: ActionContextLike) => {
    commit('updateLikedXXX', {
      name: 'mvs',
      data: [],
    });
    return Promise.resolve();
  },
  fetchCloudDisk: ({ commit }: ActionContextLike) => {
    commit('updateLikedXXX', {
      name: 'cloudDisk',
      data: [],
    });
    return Promise.resolve();
  },
  fetchPlayHistory: ({ state, commit }: ActionContextLike) => {
    const history = state.data.localPlayHistory || [];
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const toTrack = item => item.track || item;
    commit('updateLikedXXX', {
      name: 'playHistory',
      data: {
        weekData: history
          .filter(item => Number(item.playTime) >= sevenDaysAgo)
          .map(toTrack),
        allData: history.map(toTrack),
      },
    });
    return Promise.resolve();
  },
  fetchUserProfile: ({ commit }: ActionContextLike) => {
    if (!isAccountLoggedIn()) return;
    return userAccount().then(result => {
      if (result.code === 200) {
        commit('updateData', { key: 'user', value: result.profile });
      }
    });
  },
};
