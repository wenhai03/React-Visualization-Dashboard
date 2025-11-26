import request from '@/utils/request';
import { RequestMethod } from '@/store/common';
import { BASE_API_PREFIX } from '@/utils/constant';

export const getSubscribeList = function (params: { id: number }) {
  return request(`${BASE_API_PREFIX}/busi-group/${params.id}/alert-subscribes`, {
    method: RequestMethod.Get,
  });
};

export const getSubscribeData = function (subscribeId: number) {
  return request(`${BASE_API_PREFIX}/alert-subscribe/${subscribeId}`, {
    method: RequestMethod.Get,
  });
};

export const addSubscribe = function (data: any, busiId: number) {
  return request(`${BASE_API_PREFIX}/busi-group/${busiId}/alert-subscribes`, {
    method: RequestMethod.Post,
    data,
  });
};

export const editSubscribe = function (data: any, busiId: number) {
  return request(`${BASE_API_PREFIX}/busi-group/${busiId}/alert-subscribes`, {
    method: RequestMethod.Put,
    data,
  });
};

export const deleteSubscribes = function (data: { ids: number[] }, busiId: number) {
  return request(`${BASE_API_PREFIX}/busi-group/${busiId}/alert-subscribes`, {
    method: RequestMethod.Delete,
    data,
  });
};
