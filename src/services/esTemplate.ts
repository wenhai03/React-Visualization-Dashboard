import request from '@/utils/request';
import { RequestMethod } from '@/store/common';
import { BASE_API_PREFIX } from '@/utils/constant';

// 查询默认模板
export const getDefaultTemplate = function (params: { datasource_id: number }) {
  return request(`${BASE_API_PREFIX}/es/index_template/default`, {
    method: RequestMethod.Get,
    params,
  });
};

// 查询模板
export const getTemplate = function (params) {
  return request(`${BASE_API_PREFIX}/es/index_template`, {
    method: RequestMethod.Get,
    params,
  });
};

// 新增模板
export const createTemplate = function (data) {
  return request(`${BASE_API_PREFIX}/es/index_template`, {
    method: RequestMethod.Post,
    data,
  });
};

// 修改模板
export const updateTemplate = function (data) {
  return request(`${BASE_API_PREFIX}/es/index_template`, {
    method: RequestMethod.Put,
    data,
  });
};

// 删除日志任务
export const deleteTemplate = function (data: { ids: number[] }) {
  return request(`${BASE_API_PREFIX}/es/index_template`, {
    method: RequestMethod.Delete,
    data,
  });
};

// 查询模板rollover 详情
export const getRolloverRecord = function (params: { id: number }) {
  return request(`${BASE_API_PREFIX}/es/rollover/record`, {
    method: RequestMethod.Get,
    params,
  });
};

// 运行模板rollover
export const runRollover = function (data) {
  return request(`${BASE_API_PREFIX}/es/rollover`, {
    method: RequestMethod.Put,
    data,
  });
};
