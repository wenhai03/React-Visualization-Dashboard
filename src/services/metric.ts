import request from '@/utils/request';
import { RequestMethod } from '@/store/common';
import { BASE_API_PREFIX } from '@/utils/constant';

// 获取节点key
export const GetTagPairs = function (data: object) {
  return request(`${BASE_API_PREFIX}/tag-pairs`, {
    method: RequestMethod.Post,
    data,
  });
};

// 查询 Metrics
export const GetMetrics = function (data: object) {
  return request(`${BASE_API_PREFIX}/tag-metrics`, {
    method: RequestMethod.Post,
    data,
  });
};

// 查询 上报数据
export const GetData = function (data: object) {
  return request(`${BASE_API_PREFIX}/query`, {
    method: RequestMethod.Post,
    data,
  });
};

export const getQueryBench = function (data?: { series_num: number; point_num: number }) {
  return request(`${BASE_API_PREFIX}/query-bench`, {
    method: RequestMethod.Post,
    params: data,
  });
};

// 分享图表 存临时数据
export const SetTmpChartData = function (data: { configs: string }[]) {
  return request(`${BASE_API_PREFIX}/share-charts`, {
    method: RequestMethod.Post,
    data,
  });
};
// 分享图表 读临时数据
export const GetTmpChartData = function (ids: string) {
  return request(`${BASE_API_PREFIX}/share-charts?ids=${ids}`, {
    method: RequestMethod.Get,
  });
};

export const prometheusAPI = function (path: string, params, options) {
  return request(`${BASE_API_PREFIX}/prometheus/api/v1/${path}`, {
    method: RequestMethod.Get,
    params,
    ...options,
  });
};

// 指标采集任务列表
export const getMetricsInputTasks = function (params: { p: number; limit: number; bgid: number; query?: string }) {
  return request(`${BASE_API_PREFIX}/input-tasks`, {
    method: RequestMethod.Get,
    params,
  });
};

// 指标采集任务详情
export const getMetricsInputTaskDetail = function (id: number, name: string) {
  return request(`${BASE_API_PREFIX}/input-task/${id}/${name}`, {
    method: RequestMethod.Get,
  });
};

// 保存指标采集任
export const updateMetricsInputTask = function (id: number, name: string, data: any) {
  return request(`${BASE_API_PREFIX}/input-task/${id}/${name}`, {
    method: RequestMethod.Put,
    data,
  });
};

// 删除指标采集任
export const deleteMetricsInputTask = function (id: number, name: string) {
  return request(`${BASE_API_PREFIX}/input-task/${id}/${name}`, {
    method: RequestMethod.Delete,
  });
};

// 生效指标概览
export const getMetricsInputOverview = function (params: { bgid: number }) {
  return request(`${BASE_API_PREFIX}/input-overview`, {
    method: RequestMethod.Get,
    params,
  });
};

// 公共采集器列表
export const getPublicTargets = function () {
  return request(`${BASE_API_PREFIX}/targets/public`, {
    method: RequestMethod.Get,
  });
};

// 批量修改指标采集任务
export const batchUpdateMetricsTask = function (data) {
  return request(`${BASE_API_PREFIX}/input-task/fields`, {
    method: RequestMethod.Put,
    data,
  });
};

// 校验指标采集对象配置内容
export const checkMetricsTask = function (data) {
  return request(`${BASE_API_PREFIX}/input-task/check`, {
    method: RequestMethod.Put,
    data,
  });
};
