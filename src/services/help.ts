import request from '@/utils/request';
import { RequestMethod } from '@/store/common';
import { BASE_API_PREFIX } from '@/utils/constant';

export const getN9EServers = function () {
  return request(`${BASE_API_PREFIX}/servers`, {
    method: RequestMethod.Get,
  });
};

// 操作审计-查询操作日志列表
export const getOperationLog = function (params: { user_ids?: string; route_ids?: string; p: number; limit: number }) {
  return request(`${BASE_API_PREFIX}/operation_log`, {
    method: RequestMethod.Get,
    params,
  });
};

// 操作审计-查询路由信息列表
export const getRoutesInfo = function () {
  return request(`${BASE_API_PREFIX}/routes`, {
    method: RequestMethod.Get,
  });
};

// 查询定时任务列表
export const getScheduleTask = function (params) {
  return request(`${BASE_API_PREFIX}/schedule/task`, {
    method: RequestMethod.Get,
    params,
  });
};

// 修改定时任务
export const updateScheduleTask = function (data) {
  return request(`${BASE_API_PREFIX}/schedule/task`, {
    method: RequestMethod.Put,
    data,
  });
};

// 运行定时任务
export const runScheduleTask = function (data: { task_ids: string[] }) {
  return request(`${BASE_API_PREFIX}/schedule/task/run`, {
    method: RequestMethod.Put,
    data,
  });
};

// 删除定时任务
export const deleteScheduleTask = function (data: { task_ids: string[] }) {
  return request(`${BASE_API_PREFIX}/schedule/task`, {
    method: RequestMethod.Delete,
    data,
  });
};
