import Cookies from 'js-cookie';
import { logout } from '@/api/auth';
import store from '@/store';
import { hasSession, clearSession } from '@/providers/navidrome/client';

export function setCookies(string) {
  // 保留兼容签名，Navidrome 不使用 Cookie 登录。
  return string;
}

export function getCookie(key) {
  return Cookies.get(key) ?? localStorage.getItem(`cookie-${key}`);
}

export function removeCookie(key) {
  Cookies.remove(key);
  localStorage.removeItem(`cookie-${key}`);
}

export function isLoggedIn() {
  return hasSession();
}

// 账号登录
export function isAccountLoggedIn() {
  return hasSession() && store.state.data.loginMode === 'account';
}

// 用户名搜索（用户数据为只读）
export function isUsernameLoggedIn() {
  return false;
}

// 账户登录或者用户名搜索都判断为登录，宽松检查
export function isLooseLoggedIn() {
  return isLoggedIn() || Boolean(store.state.data.sources?.webdav?.enabled);
}

export function doLogout() {
  logout();
  clearSession();
  // 更新状态仓库中的用户信息
  store.commit('updateData', { key: 'user', value: {} });
  // 更新状态仓库中的登录状态
  store.commit('updateData', { key: 'loginMode', value: null });
  // 更新状态仓库中的喜欢列表
  store.commit('updateData', { key: 'likedSongPlaylistID', value: undefined });
}
