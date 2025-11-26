import request from '@/utils/request';
import { RequestMethod } from '@/store/common';
import { BASE_API_PREFIX } from '@/utils/constant';

// 日志任务列表
export const getLogTaskList = function (params) {
  return request(`${BASE_API_PREFIX}/logs-tasks`, {
    method: RequestMethod.Get,
    params,
  });
};

// 日志任务详情
export const logTaskDetail = function (id: number) {
  return request(`${BASE_API_PREFIX}/logs-task/${id}`, {
    method: RequestMethod.Get,
  }).then((res) => res.dat);
};

// 新增日志任务
export const createLogTask = function (data) {
  return request(`${BASE_API_PREFIX}/logs-task`, {
    method: RequestMethod.Post,
    data,
  });
};

// 更新日志任务
export const updateLogTask = function (data, id: number) {
  return request(`${BASE_API_PREFIX}/logs-task/${id}`, {
    method: RequestMethod.Put,
    data,
  });
};

// 删除日志任务
export const deleteLogTask = function (id: number) {
  return request(`${BASE_API_PREFIX}/logs-task/${id}`, {
    method: RequestMethod.Delete,
  });
};

// 修改日志任务状态
export const setLogTaskStatus = function (id: number, params: { enabled: number }) {
  return request(`${BASE_API_PREFIX}/logs-task/${id}/enabled`, {
    method: RequestMethod.Put,
    params,
  });
};

// 修改logstash服务标识
export const setTargetExtra = function (data: { ident: string; extra: any }) {
  return request(`${BASE_API_PREFIX}/targets/extra/logstash`, {
    method: RequestMethod.Put,
    data,
  });
};

// 获取日志任务默认配置
export const logTaskDefaultConfig = function () {
  return request(`${BASE_API_PREFIX}/logs-task/config`, {
    method: RequestMethod.Get,
  }).then((res) => res.dat);
};

// 修改日志任务默认配置
export const UpdatelogTaskDefaultConfig = function (data) {
  return request(`${BASE_API_PREFIX}/logs-task/config`, {
    method: RequestMethod.Put,
    data,
  }).then((res) => res.dat);
};

// 公共日志任务列表
export const logTaskPublicList = function (params) {
  return request(`${BASE_API_PREFIX}/logs-tasks/public`, {
    method: RequestMethod.Get,
    params,
  });
};

// 查询引用当前任务的的任务列表
export const logTaskQuoteList = function (id, params) {
  return request(`${BASE_API_PREFIX}/logs-task/${id}/quote`, {
    method: RequestMethod.Get,
    params,
  });
};

// 日志采集服务配置列表
export const logsServiceConfigs = function (params?: { modes: string; formats: string }) {
  return request(`${BASE_API_PREFIX}/logstool/configs`, {
    method: RequestMethod.Get,
    params,
  });
};

// 获取日志采集服务配置白名单
export const getLogstoolConfigs = function () {
  return request(`${BASE_API_PREFIX}/logstool/white`, {
    method: RequestMethod.Get,
  });
};

// 保存日志采集服务配置白名单
export const setLogstoolConfigs = function (data) {
  return request(`${BASE_API_PREFIX}/logstool/white`, {
    method: RequestMethod.Post,
    data,
  });
};

// 日志采集明细toml配置内容校验
export const TomlCheck = function (data: { topic: string; toml: string }) {
  return request(`${BASE_API_PREFIX}/logs-task/items/toml_check`, {
    method: RequestMethod.Post,
    data,
  });
};

// 日志采集明细配置转toml
export const TomlConvert = function (data: { topic: string; item: any }) {
  return request(`${BASE_API_PREFIX}/logs-task/items/toml_convert`, {
    method: RequestMethod.Post,
    data,
  });
};

// 查询日志限制规则列表
export const getLogShieldRules = function (params) {
  return request(`${BASE_API_PREFIX}/logs-task/rules`, {
    method: RequestMethod.Get,
    params,
  });
};

// 新增日志限制规则
export const addLogShieldRule = function (data: { topic: string; item: any }) {
  return request(`${BASE_API_PREFIX}/logs-task/rule`, {
    method: RequestMethod.Post,
    data,
  });
};

// 批量删除日志限制规则
export const batchdeleteLogShieldRules = function (data: { ids: number[] }) {
  return request(`${BASE_API_PREFIX}/logs-task/rules`, {
    method: RequestMethod.Delete,
    data,
  });
};

// 验证vector 合法性
export const getVectorValidate = function (data) {
  return request(`${BASE_API_PREFIX}/vector/validate`, {
    method: RequestMethod.Post,
    data,
  });
};
