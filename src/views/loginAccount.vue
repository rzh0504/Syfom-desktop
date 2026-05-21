<template>
  <div class="login">
    <div class="login-container">
      <div class="section-1">
        <img src="/img/logos/yesplaymusic.png" />
      </div>
      <div class="title">添加媒体源</div>
      <div class="source-tabs">
        <button
          :class="{ active: sourceType === 'navidrome' }"
          @click="sourceType = 'navidrome'"
        >
          Navidrome
        </button>
        <button
          :class="{ active: sourceType === 'webdav' }"
          @click="sourceType = 'webdav'"
        >
          WebDAV
        </button>
      </div>
      <div class="section-2">
        <div class="input-box">
          <div class="container" :class="{ active: inputFocus === 'server' }">
            <svg-icon icon-class="search" />
            <div class="inputs">
              <input
                id="server"
                v-model="server"
                type="text"
                :placeholder="serverPlaceholder"
                @focus="inputFocus = 'server'"
                @blur="inputFocus = ''"
                @keyup.enter="connectSource"
              />
            </div>
          </div>
        </div>
        <div v-if="sourceType === 'webdav'" class="input-box">
          <div class="container" :class="{ active: inputFocus === 'path' }">
            <svg-icon icon-class="list" />
            <div class="inputs">
              <input
                id="path"
                v-model="webdavPath"
                type="text"
                placeholder="目录路径，例如 /Music"
                @focus="inputFocus = 'path'"
                @blur="inputFocus = ''"
                @keyup.enter="connectSource"
              />
            </div>
          </div>
        </div>
        <div class="input-box">
          <div class="container" :class="{ active: inputFocus === 'username' }">
            <svg-icon icon-class="mobile" />
            <div class="inputs">
              <input
                id="username"
                v-model="username"
                type="text"
                placeholder="用户名"
                @focus="inputFocus = 'username'"
                @blur="inputFocus = ''"
                @keyup.enter="connectSource"
              />
            </div>
          </div>
        </div>
        <div class="input-box">
          <div class="container" :class="{ active: inputFocus === 'password' }">
            <svg-icon icon-class="lock" />
            <div class="inputs">
              <input
                id="password"
                v-model="password"
                type="password"
                :placeholder="
                  inputFocus === 'password' ? '' : $t('login.password')
                "
                @focus="inputFocus = 'password'"
                @blur="inputFocus = ''"
                @keyup.enter="connectSource"
              />
            </div>
          </div>
        </div>
      </div>
      <div class="confirm">
        <button v-show="!processing" @click="connectSource">
          {{ sourceType === 'webdav' ? '连接 WebDAV' : $t('login.login') }}
        </button>
        <button v-show="processing" class="loading" disabled>
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
      <div class="notice">
        选择 Navidrome / OpenSubsonic 或 WebDAV
        作为媒体源。登录信息仅保存在本地。
      </div>
    </div>
  </div>
</template>

<script>
import { mapMutations } from 'vuex';
import nativeAlert from '@/utils/nativeAlert';
import { loginWithAccount } from '@/api/auth';
import {
  getProvider,
  setActiveProvider as persistActiveProvider,
} from '@/providers';

export default {
  name: 'Login',
  data() {
    return {
      processing: false,
      sourceType: 'navidrome',
      server: localStorage.getItem('navidromeServer') || '',
      webdavPath: '/Music',
      username: '',
      password: '',
      inputFocus: '',
    };
  },
  computed: {
    serverPlaceholder() {
      if (this.sourceType === 'webdav') {
        return '服务器地址，例如 https://example.com/remote.php/dav/files/me';
      }
      return '服务器地址，例如 http://127.0.0.1:4533';
    },
  },
  methods: {
    ...mapMutations(['setActiveProvider', 'updateData', 'upsertSource']),
    connectSource() {
      if (this.sourceType === 'webdav') {
        this.connectWebdav();
        return;
      }

      this.login();
    },
    login() {
      if (!this.server || !this.username || !this.password) {
        nativeAlert('请填写服务器地址、用户名和密码');
        return;
      }

      this.processing = true;
      loginWithAccount({
        server: this.server.trim(),
        username: this.username.trim(),
        password: this.password,
      })
        .then(this.handleLoginResponse)
        .catch(error => {
          this.processing = false;
          nativeAlert(`登录失败：${error.message || error}`);
        });
    },
    handleLoginResponse(data) {
      if (!data) {
        this.processing = false;
        return;
      }
      if (data.code === 200) {
        localStorage.setItem('navidromeServer', this.server.trim());
        this.upsertSource({
          key: 'navidrome',
          name: 'Navidrome',
          provider: 'navidrome',
          enabled: true,
          serverUrl: this.server.trim(),
          username: this.username.trim(),
        });
        persistActiveProvider('navidrome');
        this.setActiveProvider('navidrome');
        this.updateData({ key: 'loginMode', value: 'account' });
        this.updateData({ key: 'user', value: data.profile || {} });
        this.$store.dispatch('fetchUserProfile').then(() => {
          this.$store.dispatch('fetchLikedPlaylist').then(() => {
            this.$router.push({ path: '/library' });
          });
        });
      } else {
        this.processing = false;
        nativeAlert(data.msg ?? data.message ?? '账号或密码错误，请检查');
      }
    },
    connectWebdav() {
      if (!this.server) {
        nativeAlert('请填写 WebDAV 服务器地址');
        return;
      }

      const webdavProvider = getProvider('webdav');
      const params = {
        serverUrl: this.server.trim(),
        path: this.webdavPath || '/',
        username: this.username.trim(),
        password: this.password,
      };

      this.processing = true;
      webdavProvider
        .login(params)
        .then(data => {
          const sourceKey = webdavProvider.rememberCredentials(params);
          this.upsertSource({
            key: 'webdav',
            name: 'WebDAV',
            provider: 'webdav',
            enabled: true,
            sourceKey,
            serverUrl: params.serverUrl,
            path: params.path,
            username: params.username,
            connectedAt: Date.now(),
          });
          persistActiveProvider('webdav');
          this.setActiveProvider('webdav');
          this.updateData({ key: 'loginMode', value: 'webdav' });
          this.updateData({ key: 'user', value: data.profile || {} });
          webdavProvider
            .scanDirectory(params)
            .then(stats => {
              this.updateData({
                key: 'librarySongsUpdatedAt',
                value: Date.now(),
              });
              this.$store.dispatch(
                'showToast',
                `WebDAV 索引完成，已读取 ${stats.audio} 首歌曲`
              );
            })
            .catch(error => {
              this.$store.dispatch(
                'showToast',
                `WebDAV 后台索引失败：${error.message || error}`
              );
            });
          this.$router.push({ path: '/library' });
        })
        .catch(error => {
          nativeAlert(`WebDAV 连接失败：${error.message || error}`);
        })
        .finally(() => {
          this.processing = false;
        });
    },
  },
};
</script>

<style lang="scss" scoped>
.login {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-top: 32px;
}

.login-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.title {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 18px;
  color: var(--color-text);
}

.source-tabs {
  display: flex;
  gap: 8px;
  width: 300px;
  margin-bottom: 28px;

  button {
    flex: 1;
    height: 36px;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 600;
    color: var(--color-text);
    background: var(--color-secondary-bg);
    transition: 0.2s;
  }

  button.active {
    color: var(--color-primary);
    background: var(--color-primary-bg);
  }
}

.section-1 {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  img {
    height: 64px;
    margin: 20px;
    user-select: none;
  }
}

.section-2 {
  display: flex;
  align-items: center;
  flex-direction: column;
}

.input-box {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
  color: var(--color-text);

  .container {
    display: flex;
    align-items: center;
    height: 46px;
    background: var(--color-secondary-bg);
    border-radius: 8px;
    width: 300px;
  }

  .svg-icon {
    height: 18px;
    width: 18px;
    color: #aaaaaa;
    margin: {
      left: 12px;
      right: 6px;
    }
  }

  .inputs {
    display: flex;
    width: 85%;
  }

  input {
    font-size: 20px;
    border: none;
    background: transparent;
    width: 100%;
    font-weight: 600;
    margin-top: -1px;
    color: var(--color-text);
  }

  input::placeholder {
    color: var(--color-text);
    opacity: 0.38;
  }

  input#countryCode {
    flex: 3;
  }
  input#phoneNumber {
    flex: 12;
  }

  .active {
    background: var(--color-primary-bg);
    input,
    .svg-icon {
      color: var(--color-primary);
    }

    input::placeholder {
      color: var(--color-primary);
      opacity: 0.62;
    }
  }
}

.confirm button {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 600;
  background-color: var(--color-primary-bg);
  color: var(--color-primary);
  border-radius: 8px;
  margin-top: 24px;
  transition: 0.2s;
  padding: 8px;
  width: 100%;
  width: 300px;
  &:hover {
    transform: scale(1.06);
  }
  &:active {
    transform: scale(0.94);
  }
}

.other-login {
  margin-top: 24px;
  font-size: 13px;
  color: var(--color-text);
  opacity: 0.68;
  a {
    padding: 0 8px;
  }
}

.notice {
  width: 300px;
  border-top: 1px solid rgba(128, 128, 128);
  margin-top: 32px;
  padding-top: 12px;
  font-size: 12px;
  color: var(--color-text);
  opacity: 0.48;
}

@keyframes loading {
  0% {
    opacity: 0.2;
  }
  20% {
    opacity: 1;
  }
  100% {
    opacity: 0.2;
  }
}

button.loading {
  height: 44px;
  cursor: unset;
  &:hover {
    transform: none;
  }
}
.loading span {
  width: 6px;
  height: 6px;
  background-color: var(--color-primary);
  border-radius: 50%;
  margin: 0 2px;
  animation: loading 1.4s infinite both;
}

.loading span:nth-child(2) {
  animation-delay: 0.2s;
}

.loading span:nth-child(3) {
  animation-delay: 0.4s;
}
</style>
