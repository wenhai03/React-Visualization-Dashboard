import { RequestMethod } from '@/store/common';
import request from '@/utils/request';
import { BASE_API_PREFIX } from '@/utils/constant';

// 获取agent实例列表，可按条件过滤
export const getAgentList = function (params = {}) {
  return request(`${BASE_API_PREFIX}/agents`, {
    method: RequestMethod.Get,
    params,
  });
};

// 获取安装地址
export const getAgentInstallAddr = function (params: { username?: string; busi_group: string }) {
  return request(`${BASE_API_PREFIX}/agents/install`, {
    method: RequestMethod.Get,
    params,
  });
};

// 对指定agent更新版本
export const upgradeAgent = function (data: object) {
  return request(`${BASE_API_PREFIX}/agents/upgrade`, {
    method: RequestMethod.Post,
    data,
  });
};

// 卸载指定agent
export const uninstallAgent = function (data: object) {
  return request(`${BASE_API_PREFIX}/agents/uninstall`, {
    method: RequestMethod.Post,
    data,
  });
};

// 获取指定agent当前配置
export const getAgentSettings = function (ident: string) {
  return request(`${BASE_API_PREFIX}/agents/config`, {
    method: RequestMethod.Get,
    params: { ident, source: 'web' },
  });
};

// 修改指定agent配置
export const updateAgentSettings = function (data: object) {
  return request(`${BASE_API_PREFIX}/agents/config`, {
    method: RequestMethod.Post,
    data,
  });
};

// 删除指定agent配置（指标）
export const deleteAgentSettings = function (data: object) {
  return request(`${BASE_API_PREFIX}/agents/config`, {
    method: RequestMethod.Delete,
    data,
  });
};

// 批量保存指标采集
export const updateAgentSettingsBatch = function (data: object) {
  return request(`${BASE_API_PREFIX}/agents/config/batch`, {
    method: RequestMethod.Post,
    data,
  });
};

// 新增采集配置
export const createAgentSettings = function (params: { category?: string; showDefaultContent?: boolean }) {
  return request(`${BASE_API_PREFIX}/agents/config/new`, {
    method: RequestMethod.Get,
    params,
  });
};

// 采集器关键事件查询
export const getAgentEvent = function (params: {}) {
  return request(`${BASE_API_PREFIX}/agents/event`, {
    method: RequestMethod.Get,
    params,
  });
};

// 加密
export const setEncrypt = function (params: {}) {
  return request(`${BASE_API_PREFIX}/data-cryptogram/encrypt`, {
    method: RequestMethod.Get,
    params,
  });
};

// 解密
export const setDecrypt = function (params: {}) {
  return request(`${BASE_API_PREFIX}/data-cryptogram/decrypt`, {
    method: RequestMethod.Get,
    params,
  });
};

// 正则小工具
export const setRegexp = function (params: { regexp_rule: string; text: string }) {
  return request(`${BASE_API_PREFIX}/tools/regexp`, {
    method: RequestMethod.Get,
    params,
  });
};
