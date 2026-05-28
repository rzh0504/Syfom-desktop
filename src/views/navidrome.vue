<template>
  <div class="navidrome-page">
    <div class="container">
      <h2>Navidrome 服务器</h2>

      <div v-if="showUserInfo" class="user">
        <div class="left">
          <img class="avatar" :src="data.user.avatarUrl" loading="lazy" />
          <div class="info">
            <div class="nickname">
              {{ data.user.nickname }}
              <span class="source-name">{{ currentSource.name }}</span>
            </div>
            <div class="extra-info">
              <span class="text">{{ currentSource.description }}</span>
            </div>
          </div>
        </div>
        <div class="right">
          <button @click="editCurrentSource"> 编辑 </button>
          <button :disabled="refreshingLibrary" @click="refreshCurrentLibrary">
            {{ refreshingLibrary ? '刷新中...' : '刷新媒体库' }}
          </button>
          <button @click="logout">
            <svg-icon icon-class="logout" />
            {{ $t('settings.logout') }}
          </button>
        </div>
      </div>

      <div v-else class="empty-card">
        <div>
          <h3>尚未连接服务器</h3>
          <p
            >登录 Navidrome / OpenSubsonic 服务器后即可管理连接与刷新媒体库。</p
          >
        </div>
        <button @click="login">登录服务器</button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { mapActions, mapMutations, mapState } from 'vuex';
import { isLooseLoggedIn, doLogout } from '@/utils/auth';
import { getProvider } from '@/providers';

export default defineComponent({
  name: 'Navidrome',
  data() {
    return {
      refreshingLibrary: false,
    };
  },
  computed: {
    ...mapState(['data']),
    showUserInfo(): boolean {
      return isLooseLoggedIn() && this.data.user.nickname;
    },
    currentSource() {
      const source = this.data.sources?.navidrome || {};
      return {
        key: 'navidrome',
        name: 'Navidrome',
        description: 'OpenSubsonic/Navidrome 服务器音乐库',
        raw: source,
      };
    },
  },
  methods: {
    ...mapActions(['showToast']),
    ...mapMutations(['updateData']),
    login() {
      this.$router.push({ name: 'loginAccount' });
    },
    editCurrentSource() {
      this.$router.push({
        path: '/login/account',
        query: {
          source: this.currentSource.key,
          edit: '1',
        },
      });
    },
    async refreshCurrentLibrary() {
      if (this.refreshingLibrary) return;
      const provider = getProvider(this.currentSource.key);
      if (!provider?.refreshLibrary) {
        this.showToast(`${this.currentSource.name} 不支持刷新媒体库`);
        return;
      }

      this.refreshingLibrary = true;
      try {
        const result = await provider.refreshLibrary();
        this.updateData({ key: 'librarySongsUpdatedAt', value: Date.now() });
        const count =
          (result as { audio?: number; count?: number })?.audio ??
          result?.count;
        this.refreshingLibrary = false;
        this.showToast(
          count !== undefined
            ? `已刷新媒体库，读取 ${count} 首歌曲`
            : '已开始刷新媒体库'
        );
      } catch (error: unknown) {
        this.refreshingLibrary = false;
        const message = error instanceof Error ? error.message : String(error);
        this.showToast(`刷新媒体库失败：${message}`);
      }
    },
    logout() {
      doLogout();
      this.$router.push({ name: 'home' });
    },
  },
});
</script>

<style lang="scss" scoped>
.navidrome-page {
  display: flex;
  justify-content: center;
  margin-top: 32px;
}

.container {
  margin-top: 24px;
  width: 720px;
}

h2 {
  margin-top: 48px;
  margin-bottom: 32px;
  font-size: 36px;
  color: var(--color-text);
}

h3 {
  margin: 0 0 8px;
  color: var(--color-text);
}

p {
  margin: 0;
  color: var(--color-text);
  opacity: 0.68;
}

.user,
.empty-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--color-secondary-bg);
  color: var(--color-text);
  padding: 16px 20px;
  border-radius: 16px;
}

.user {
  img.avatar {
    border-radius: 50%;
    height: 64px;
    width: 64px;
  }
  .left {
    display: flex;
    align-items: center;
    .info {
      margin-left: 24px;
    }
    .nickname {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 2px;
    }
    .source-name {
      margin-left: 8px;
      padding: 2px 6px;
      border-radius: 6px;
      color: var(--color-primary);
      background: var(--color-primary-bg);
      font-size: 12px;
      vertical-align: 2px;
    }
    .extra-info {
      font-size: 13px;
      .text {
        opacity: 0.68;
      }
    }
  }
  .right {
    display: flex;
    .svg-icon {
      height: 18px;
      width: 18px;
      margin-right: 4px;
    }
    button {
      display: flex;
      align-items: center;
      font-size: 18px;
      border-radius: 10px;
      opacity: 0.68;
      margin: {
        right: 12px;
        left: 12px;
      }
      &:hover {
        opacity: 1;
        background: var(--color-primary-bg);
        color: var(--color-primary);
      }
      &:active {
        opacity: 1;
        transform: scale(0.92);
      }
    }
  }
}

button {
  color: var(--color-text);
  background: var(--color-secondary-bg);
  padding: 8px 12px;
  font-weight: 600;
  border-radius: 8px;
  transition: 0.2s;
  &:hover {
    transform: scale(1.06);
  }
  &:active {
    transform: scale(0.94);
  }
  &:disabled {
    cursor: not-allowed;
    opacity: 0.48;
    transform: none;
  }
}

.empty-card {
  button {
    flex-shrink: 0;
    margin-left: 24px;
  }
}
</style>
