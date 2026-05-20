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

export default {
  showToast({ state, commit }, text) {
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
  likeATrack({ state, commit, dispatch }, id) {
    const isLocalTrack = String(id).startsWith('webdav:');
    if (!isLocalTrack && !isAccountLoggedIn()) {
      dispatch('showToast', '请先登录 Navidrome 账号');
      return;
    }
    let like = true;
    if (state.liked.songs.includes(id)) like = false;

    if (isLocalTrack) {
      const localLikedSongIds = like
        ? [...(state.data.localLikedSongIds || []), id]
        : (state.data.localLikedSongIds || []).filter(d => d !== id);
      commit('updateData', {
        key: 'localLikedSongIds',
        value: [...new Set(localLikedSongIds)],
      });
      commit('updateLikedXXX', {
        name: 'songs',
        data: like
          ? [...new Set([...state.liked.songs, id])]
          : state.liked.songs.filter(d => d !== id),
      });
      dispatch('fetchLikedSongsWithDetails');
      return;
    }

    likeATrack({ id, like })
      .then(() => {
        if (like === false) {
          commit('updateLikedXXX', {
            name: 'songs',
            data: state.liked.songs.filter(d => d !== id),
          });
        } else {
          let newLikeSongs = state.liked.songs;
          newLikeSongs.push(id);
          commit('updateLikedXXX', {
            name: 'songs',
            data: newLikeSongs,
          });
        }
        dispatch('fetchLikedSongsWithDetails');
      })
      .catch(() => {
        dispatch('showToast', '操作失败，请稍后重试');
      });
  },
  fetchLikedSongs: ({ state, commit }) => {
    const localLikedSongIds = state.data.localLikedSongIds || [];
    if (!isLooseLoggedIn()) {
      commit('updateLikedXXX', {
        name: 'songs',
        data: localLikedSongIds,
      });
      return;
    }
    if (isAccountLoggedIn()) {
      return userLikedSongsIDs({ uid: state.data.user.userId }).then(result => {
        if (result.ids) {
          commit('updateLikedXXX', {
            name: 'songs',
            data: [...new Set([...result.ids, ...localLikedSongIds])],
          });
        }
      });
    } else {
      // TODO:搜索ID登录的用户
    }
  },
  fetchLikedSongsWithDetails: ({ state, commit }) => {
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
  fetchLikedPlaylist: ({ state, commit }) => {
    const starredPlaylist = {
      id: 'starred',
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
        value: 'starred',
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
            value: 'starred',
          });
        }
      });
    } else {
      // TODO:搜索ID登录的用户
    }
  },
  fetchLikedAlbums: ({ commit }) => {
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
  fetchLikedArtists: ({ commit }) => {
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
  fetchLikedMVs: ({ commit }) => {
    commit('updateLikedXXX', {
      name: 'mvs',
      data: [],
    });
    return Promise.resolve();
  },
  fetchCloudDisk: ({ commit }) => {
    commit('updateLikedXXX', {
      name: 'cloudDisk',
      data: [],
    });
    return Promise.resolve();
  },
  fetchPlayHistory: ({ state, commit }) => {
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
  fetchUserProfile: ({ commit }) => {
    if (!isAccountLoggedIn()) return;
    return userAccount().then(result => {
      if (result.code === 200) {
        commit('updateData', { key: 'user', value: result.profile });
      }
    });
  },
};
