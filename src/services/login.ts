import request from '@/utils/request';
import { RequestMethod } from '@/store/common';
import { BASE_API_PREFIX } from '@/utils/constant';

// 登录
export const authLogin = function (username: string, password: string, captchaid: string, verifyvalue: string) {
  return request(`${BASE_API_PREFIX}/auth/login`, {
    method: RequestMethod.Post,
    data: { username, password, captchaid, verifyvalue },
  });
};

export const getCaptcha = function () {
  return request(`${BASE_API_PREFIX}/auth/captcha`, {
    method: RequestMethod.Post,
  });
};

export const ifShowCaptcha = function () {
  return request(`${BASE_API_PREFIX}/auth/ifshowcaptcha`, {
    method: RequestMethod.Get,
    silence: true,
  });
};

// 刷新accessToken
export const UpdateAccessToken = function () {
  return request(`${BASE_API_PREFIX}/auth/refresh`, {
    method: RequestMethod.Post,
    data: {
      refresh_token: localStorage.getItem('refresh_token'),
    },
  });
};

// 更改密码
export const UpdatePwd = function (data: { oldpass?: string; newpass?: string; username?: string }) {
  return request(`${BASE_API_PREFIX}/self/password`, {
    method: RequestMethod.Put,
    data,
  });
};

// 获取csrf token
export const GenCsrfToken = function () {
  return request(`${BASE_API_PREFIX}/csrf`, {
    method: RequestMethod.Get,
  });
};

// 退出
export const Logout = function () {
  return request(`${BASE_API_PREFIX}/auth/logout`, {
    method: RequestMethod.Post,
  });
};

export const getRedirectURL = function () {
  return request(`${BASE_API_PREFIX}/auth/redirect`, {
    method: RequestMethod.Get,
  });
};

export const authCallback = function (params) {
  return request(`${BASE_API_PREFIX}/auth/callback`, {
    method: RequestMethod.Get,
    params,
  });
};

export const getRedirectURLCAS = function () {
  return request(`${BASE_API_PREFIX}/auth/redirect/cas`, {
    method: RequestMethod.Get,
  });
};

export const authCallbackCAS = function (params) {
  return request(`${BASE_API_PREFIX}/auth/callback/cas`, {
    method: RequestMethod.Get,
    params,
  });
};

export const getRedirectURLOAuth = function (params) {
  return request(`${BASE_API_PREFIX}/auth/redirect/oauth`, {
    method: RequestMethod.Get,
    params,
  });
};

export const authCallbackOAuth = function (params) {
  return request(`${BASE_API_PREFIX}/auth/callback/oauth`, {
    method: RequestMethod.Get,
    params,
  });
};

// 退出 idm
export const logOutOAuth = function () {
  return request(`${BASE_API_PREFIX}/auth/logout/oauth`, {
    method: RequestMethod.Get,
  });
};

export const getSsoConfigInit = function () {
  return request(`${BASE_API_PREFIX}/sso-configs/init`, {
    method: RequestMethod.Get,
  });
};

export const authCallbackWecom = function (params) {
  return request(`${BASE_API_PREFIX}/auth/callback/wecom`, {
    method: RequestMethod.Get,
    params,
  });
};

export const getSsoConfig = function () {
  return request(`${BASE_API_PREFIX}/auth/sso-config`, {
    method: RequestMethod.Get,
  });
};

// 暂存登录信息
export const setCacheLogin = function (data: { access_token: string; refresh_token: string }) {
  return request(`${BASE_API_PREFIX}/auth/cache/login`, {
    method: RequestMethod.Post,
    data,
  });
};

// 获取暂存登录信息（静默登录）
export const getCacheLogin = function (params: { cache_token: string }) {
  return request(`${BASE_API_PREFIX}/auth/cache/login`, {
    method: RequestMethod.Get,
    params,
  });
};

// 获取企微signature
export const getSignature = function (params: { url: string; type?: string }) {
  return request(`${BASE_API_PREFIX}/wecom/config/signature`, {
    method: RequestMethod.Get,
    params,
  });
};
