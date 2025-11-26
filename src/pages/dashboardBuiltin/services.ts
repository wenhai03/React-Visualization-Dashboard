import _ from 'lodash';
import request from '@/utils/request';
import { RequestMethod } from '@/store/common';
import { BASE_API_PREFIX } from '@/utils/constant';
import { BoardCateType, BoardType, BoardCateIconType } from './types';

export const getDashboardCates = function (): Promise<BoardCateType[]> {
  return request(`${BASE_API_PREFIX}/builtin/boards`, {
    method: RequestMethod.Get,
  }).then((res) => {
    return res.dat;
  });
};

export const getDashboardDetail = function (cate_code: string, code: string): Promise<BoardType[]> {
  return request(`${BASE_API_PREFIX}/builtin/boards/${cate_code}/${code}`, {
    method: RequestMethod.Get,
  }).then((res) => {
    return res.dat;
  });
};

// 更新内置仪表盘
export const updateDashboardDetail = function (cate_code: string, code: string, data: any): Promise<BoardType[]> {
  return request(`${BASE_API_PREFIX}/builtin/boards/${cate_code}/${code}/config`, {
    method: RequestMethod.Put,
    data,
  }).then((res) => {
    return res.dat;
  });
};

export const getIntegrationsIcon = function (): Promise<BoardCateIconType[]> {
  return request(`${BASE_API_PREFIX}/integrations/icon`, {
    method: RequestMethod.Get,
  }).then((res) => {
    return res.dat;
  });
};

// 创建仪表盘
export const createDashboard = function (id: number, data: any) {
  return request(`${BASE_API_PREFIX}/busi-group/${id}/boards`, {
    method: RequestMethod.Post,
    data,
    silence: true,
  })
    .then((res) => {
      return res.dat;
    })
    .catch((res) => {
      return {
        err: res.message,
      };
    });
};

export const postBuiltinCateFavorite = function (cate_code: string): Promise<any[]> {
  return request(`${BASE_API_PREFIX}/builtin/cate/${cate_code}/favorite`, {
    method: RequestMethod.Post,
  }).then((res) => {
    return res.dat;
  });
};

export const deleteBuiltinCateFavorite = function (cate_code: string): Promise<any[]> {
  return request(`${BASE_API_PREFIX}/builtin/cate/${cate_code}/favorite`, {
    method: RequestMethod.Delete,
  }).then((res) => {
    return res.dat;
  });
};

// 修改仪表盘信息
export const updateDashboardInfo = function (cate_code: string, code: string, data: BoardType) {
  return request(`${BASE_API_PREFIX}/builtin/boards/${cate_code}/${code}`, {
    method: RequestMethod.Put,
    data,
  }).then((res) => {
    return res.dat;
  });
};

// 新增仪表盘信息
export const createDashboardInfo = function (cate_code, data) {
  return request(`${BASE_API_PREFIX}/builtin/boards/${cate_code}`, {
    method: RequestMethod.Post,
    data,
  }).then((res) => {
    return res.dat;
  });
};

// 删除仪表盘信息
export const deleteDashboardInfo = function (data: { codes: string[] }) {
  return request(`${BASE_API_PREFIX}/builtin/boards`, {
    method: RequestMethod.Delete,
    data,
  });
};
