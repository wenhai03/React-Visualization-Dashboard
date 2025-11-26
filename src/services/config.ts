import { RequestMethod } from '@/store/common';
import request from '@/utils/request';
import { BASE_API_PREFIX } from '@/utils/constant';

export const getConfigByKey = function (params = {}) {
  return request(`${BASE_API_PREFIX}/configs`, {
    method: RequestMethod.Get,
    params,
  });
};

export const setConfigByKey = function (data: object) {
  return request(`${BASE_API_PREFIX}/configs`, {
    method: RequestMethod.Post,
    data,
  });
};

// 批量获取配置
export const getConfigsBatch = function (params: { ckey: string }) {
  return request(`${BASE_API_PREFIX}/configs/batch`, {
    method: RequestMethod.Get,
    params,
  });
};

// 查询 ES 索引
export const getElasticIndex = function (params: { index?: string } = {}) {
  return request(`${BASE_API_PREFIX}/configs/elastic-index`, {
    method: RequestMethod.Get,
    params,
  });
};

// 修改 ES 索引
export const setElasticIndex = function (data: object) {
  return request(`${BASE_API_PREFIX}/configs/elastic-index`, {
    method: RequestMethod.Put,
    data,
  });
};

export const setConfigByKeyBatch = function (data: object) {
  return request(`${BASE_API_PREFIX}/configs/batch`, {
    method: RequestMethod.Post,
    data,
  });
};

// 用于获取最新版本号
export const getConfigVersion = function () {
  return request(`${BASE_API_PREFIX}/configs/version`, {
    method: RequestMethod.Get,
  });
};

// 获取平台通知内容
export const getPlatformNotification = function () {
  return request(`${BASE_API_PREFIX}/configs/notify`, {
    method: RequestMethod.Get,
  });
};

// 获取日志索引列表
export const getLogIndexs = function () {
  return request(`${BASE_API_PREFIX}/configs/homelogidx`, {
    method: RequestMethod.Get,
  });
};

// 同步 ES 全部角色（业务组）
export const syncAllElastic = function () {
  return request(`${BASE_API_PREFIX}/busi-group/sync/elastic`, {
    method: RequestMethod.Post,
  });
};

// 数据同步（含内置仪表盘、内置告警规则、日志采集默认配置、APM配置项、采集器各部署脚本、采集器默认配置。）
export const syncData = function (data: { sync: string[] }) {
  return request(`${BASE_API_PREFIX}/sync/config`, {
    method: RequestMethod.Post,
    data,
  });
};

// 内置数据code值同步
export const syncBuiltInKey = function () {
  return request(`${BASE_API_PREFIX}/builtin/auto_add_code`, {
    method: RequestMethod.Post,
  });
};

// 查询区域列表
export const getAreaList = function (params = {}) {
  return request(`${BASE_API_PREFIX}/configs/area-list`, {
    method: RequestMethod.Get,
    params,
  });
};

// 查询区域配置
export const getAreaConfig = function (params = {}) {
  return request(`${BASE_API_PREFIX}/configs/area`, {
    method: RequestMethod.Get,
    params,
  });
};

// 添加区域配置
export const addAreaConfig = function (data) {
  return request(`${BASE_API_PREFIX}/configs/area/one`, {
    method: RequestMethod.Post,
    data,
  });
};

// 删除区域配置
export const deleteAreaConfig = function (id) {
  return request(`${BASE_API_PREFIX}/configs/area/${id}`, {
    method: RequestMethod.Delete,
  });
};

// 查询Agent默认域名
export const getAgentDefaultDomain = function (params = {}) {
  return request(`${BASE_API_PREFIX}/configs/domain`, {
    method: RequestMethod.Get,
    params,
  });
};

//  采集器配置同步
export const syncCollectConfig = function (data) {
  return request(`${BASE_API_PREFIX}/sync/collect/config`, {
    method: RequestMethod.Post,
    data,
  });
};

// 查询版本配置
export const getVersionSettings = function () {
  return request(`${BASE_API_PREFIX}/configs/version_settings`, {
    method: RequestMethod.Get,
  });
};

// 修改版本配置
export const setVersionSettings = function (data: object) {
  return request(`${BASE_API_PREFIX}/configs/version_settings`, {
    method: RequestMethod.Put,
    data,
  });
};

// 查询APMUI配置
export const getApmConfig = function () {
  return request(`${BASE_API_PREFIX}/configs/apm_ui`, {
    method: RequestMethod.Get,
  });
};

// 保存APMUI配置
export const setApmConfig = function (data: { max_trace_items: number; transaction_group_bucket_size: number }) {
  return request(`${BASE_API_PREFIX}/configs/apm_ui`, {
    method: RequestMethod.Put,
    data,
  });
};

// 查询日志配置
export const getLogConfig = function () {
  return request(`${BASE_API_PREFIX}/configs/log_search`, {
    method: RequestMethod.Get,
  });
};

// 保存日志配置
export const setLogConfig = function (data: { date_zone: string; data_size: number }) {
  return request(`${BASE_API_PREFIX}/configs/log_search`, {
    method: RequestMethod.Put,
    data,
  });
};
