import request from '@/utils/request';
import { RequestMethod } from '@/store/common';
import { BASE_API_PREFIX } from '@/utils/constant';

// 机器信息
export const getHost = function (id: number) {
  return request(`${BASE_API_PREFIX}/home/busi-group/${id}/target`, {
    method: RequestMethod.Get,
  }).then((res) => res.dat);
};

// 容器信息
export const getContainer = function (id: number, params) {
  return request(`${BASE_API_PREFIX}/home/busi-group/${id}/container`, {
    method: RequestMethod.Get,
    params,
  }).then((res) => res.dat);
};

// 采集信息
export const getInput = function (id: number) {
  return request(`${BASE_API_PREFIX}/home/busi-group/${id}/input`, {
    method: RequestMethod.Get,
  }).then((res) => res.dat);
};

// 拨测信息
export const getDial = function (id: number, params) {
  return request(`${BASE_API_PREFIX}/home/busi-group/${id}/dial-task`, {
    method: RequestMethod.Get,
    params,
  }).then((res) => res.dat);
};

// 监控信息
export const getAlertRule = function (id: number) {
  return request(`${BASE_API_PREFIX}/home/busi-group/${id}/alert-rule`, {
    method: RequestMethod.Get,
  }).then((res) => res.dat);
};

// 告警信息
export const getAlertEvents = function (id: number) {
  return request(`${BASE_API_PREFIX}/home/busi-group/${id}/alert-events`, {
    method: RequestMethod.Get,
  }).then((res) => res.dat);
};

// 容器配置查询
export const getContainerData = function () {
  return request(`${BASE_API_PREFIX}/home/container/config`, {
    method: RequestMethod.Get,
  });
};

// 容器配置修改
export const updateContainer = function (data) {
  return request(`${BASE_API_PREFIX}/home/container/config`, {
    method: RequestMethod.Put,
    data,
  });
};

// app 日志
export function getAppLogSearch(id, params) {
  return request(`${BASE_API_PREFIX}/home/busi-group/${id}/app-log`, {
    method: RequestMethod.Get,
    params,
  });
}
// APM服务
export function getApmServiceSearch(id, params) {
  return request(`${BASE_API_PREFIX}/home/busi-group/${id}/apm-service`, {
    method: RequestMethod.Get,
    params,
  });
}
