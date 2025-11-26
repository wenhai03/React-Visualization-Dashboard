import request from '@/utils/request';
import { RequestMethod } from '@/store/common';
import { BASE_API_PREFIX } from '@/utils/constant';

// 查询拨测任务
export const getDialTaskList = function (params: {
  name?: string;
  limit: number;
  p: number;
  bgid: number;
  category?: string;
}) {
  return request(`${BASE_API_PREFIX}/dial-task`, {
    method: RequestMethod.Get,
    params,
  });
};

// 查询拨测任务id 与 名称
export const getDialTaskOptions = function (id: number) {
  return request(`${BASE_API_PREFIX}/dial-task/group/${id}`, {
    method: RequestMethod.Get,
  });
};

// 拨测任务详情
export const getDiagTaskDetail = function (id: number) {
  return request(`${BASE_API_PREFIX}/dial-task/${id}`, {
    method: RequestMethod.Get,
  });
};

// 新增、修改拨测任务
export const setDialTask = function (data) {
  return request(`${BASE_API_PREFIX}/dial-task`, {
    method: RequestMethod.Post,
    data,
  });
};

// 删除拨测任务
export const deleteDialTask = function (data: { ids: number[] }) {
  return request(`${BASE_API_PREFIX}/dial-task`, {
    method: RequestMethod.Delete,
    data,
  });
};

// 修改拨测任务状态
export const setDialTaskStatus = function (data: { ids: number[]; enabled: boolean }) {
  return request(`${BASE_API_PREFIX}/dial-task/enabled`, {
    method: RequestMethod.Put,
    data,
  });
};

// 查询拨测机器标签
export const getDialTaskTags = function (params: { group_id: number }) {
  return request(`${BASE_API_PREFIX}/dial-task/tags`, {
    method: RequestMethod.Get,
    params,
  });
};

// 修改拨测标签
export const setTargetExtra = function (data: { ident: string; extra: any }) {
  return request(`${BASE_API_PREFIX}/targets/extra/dail`, {
    method: RequestMethod.Put,
    data,
  });
};
