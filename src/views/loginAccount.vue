<template>
  <div class="login">
    <div class="login-container">
      <div class="section-1">
        <img src="/img/logos/yesplaymusic.png" />
      </div>
      <div class="title">连接 Navidrome</div>
      <div class="section-2">
        <div class="input-box">
          <div class="container" :class="{ active: inputFocus === 'server' }">
            <svg-icon icon-class="search" />
            <div class="inputs">
              <input
                id="server"
                v-model="server"
                type="text"
                placeholder="服务器地址，例如 http://127.0.0.1:4533"
                @focus="inputFocus = 'server'"
                @blur="inputFocus = ''"
                @keyup.enter="login"
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
                @keyup.enter="login"
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
                @keyup.enter="login"
              />
            </div>
          </div>
        </div>
      </div>
      <div class="confirm">
        <button v-show="!processing" @click="login">
          {{ $t('login.login') }}
        </button>
        <button v-show="processing" class="loading" disabled>
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
      <div class="notice">
        连接 Navidrome / OpenSubsonic 服务器。登录信息仅保存在本地。
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import nativeAlert from '@/utils/nativeAlert';
import { loginWithAccount } from '@/api/auth';
import { setActiveProvider as persistActiveProvider } from '@/providers';

type LoginResponse = {
  code?: number;
  profile?: unknown;
  session?: {
    serverUrl: string;
    username: string;
    token: string;
    salt: string;
  };
  msg?: string;
  message?: string;
};

type SourceState = {
  serverUrl?: string;
  username?: string;
};

type DataState = {
  sources?: Record<string, SourceState>;
};

export default defineComponent({
  name: 'Login',
  data() {
    return {
      processing: false,
      server: '',
      username: '',
      password: '',
      inputFocus: '',
    };
  },
  created() {
    this.loadEditSource();
  },
  methods: {
    setActiveProvider(provider: string) {
      this.$store.commit('setActiveProvider', provider);
    },
    updateData(payload: { key: string; value: unknown }) {
      this.$store.commit('updateData', payload);
    },
    upsertSource(source: Record<string, unknown>) {
      this.$store.commit('upsertSource', source);
    },
    loadEditSource(): void {
      if (this.$route.query.edit !== '1') return;

      const data = this.$store.state.data as DataState;
      const sourceKey = String(this.$route.query.source || 'navidrome');
      const source = data.sources?.[sourceKey] || data.sources?.navidrome;
      if (!source) return;

      this.server = source.serverUrl || this.server;
      this.username = source.username || '';
    },
    login(): void {
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
        .catch((error: Error) => {
          this.processing = false;
          nativeAlert(`登录失败：${error.message || error}`);
        });
    },
    handleLoginResponse(data: LoginResponse): void {
      if (!data) {
        this.processing = false;
        return;
      }
      if (data.code === 200) {
        localStorage.setItem('navidromeServer', this.server.trim());
        const sourceKey = `navidrome-${Date.now()}`;
        const editSourceKey = String(this.$route.query.source || 'navidrome');
        this.upsertSource({
          key: this.$route.query.edit === '1' ? editSourceKey : sourceKey,
          name: this.username.trim(),
          provider: 'navidrome',
          enabled: true,
          serverUrl: data.session?.serverUrl || this.server.trim(),
          username: data.session?.username || this.username.trim(),
          token: data.session?.token,
          salt: data.session?.salt,
        });
        persistActiveProvider('navidrome');
        this.setActiveProvider('navidrome');
        this.updateData({ key: 'loginMode', value: 'account' });
        this.updateData({ key: 'user', value: data.profile || {} });
        this.$store.dispatch('fetchUserProfile').then(() => {
          this.$store
            .dispatch('fetchLikedSongs')
            .then(() => this.$store.dispatch('fetchLikedSongsWithDetails'))
            .then(() => this.$store.dispatch('fetchLikedPlaylist'))
            .then(() => {
              this.$router.push({ path: '/library' });
            });
        });
      } else {
        this.processing = false;
        nativeAlert(data.msg ?? data.message ?? '账号或密码错误，请检查');
      }
    },
  },
});
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
    background: var(--color-button-primary-bg);
    input,
    .svg-icon {
      color: var(--color-button-primary);
    }

    input::placeholder {
      color: var(--color-button-primary);
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
  background-color: var(--color-button-primary-bg);
  color: var(--color-button-primary);
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
  background-color: var(--color-button-primary);
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
