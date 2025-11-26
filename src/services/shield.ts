import request from '@/utils/request';
import { RequestMethod } from '@/store/common';
import { BASE_API_PREFIX } from '@/utils/constant';

export const getShieldList = function (params: { id: number }) {
  return request(`${BASE_API_PREFIX}/busi-group/${params.id}/alert-mutes`, {
    method: RequestMethod.Get,
  });
};

export const addShield = function (data: any, busiId: number) {
  return request(`${BASE_API_PREFIX}/busi-group/${busiId}/alert-mutes`, {
    method: RequestMethod.Post,
    data,
  });
};

export const deleteShields = function (data: { ids: number[] }, busiId: number) {
  return request(`${BASE_API_PREFIX}/busi-group/${busiId}/alert-mutes`, {
    method: RequestMethod.Delete,
    data,
  });
};

export const editShield = function (data: any[], busiId: number, shiedId: number) {
  return request(`${BASE_API_PREFIX}/busi-group/${busiId}/alert-mute/${shiedId}`, {
    method: RequestMethod.Put,
    data: data,
  });
};

export const updateShields = function (data: { ids: React.Key[]; fields: any }, busiId: number) {
  return request(`${BASE_API_PREFIX}/busi-group/${busiId}/alert-mutes/fields`, {
    method: RequestMethod.Put,
    data: data,
  });
};
