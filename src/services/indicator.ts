import request from '@/utils/request';
import { RequestMethod } from '@/store/common';
import { BASE_API_PREFIX } from '@/utils/constant';

export const getIndicatorList = function (data: object) {
  return request(`${BASE_API_PREFIX}/metric-descriptions`, {
    method: RequestMethod.Get,
    params: data,
  });
};

export const editIndicator = function (
  id: number,
  data: { description?: string | undefined; metric?: string | undefined },
) {
  return request(`${BASE_API_PREFIX}/metric-description/${id}`, {
    method: RequestMethod.Put,
    data: data,
  });
};

export const addIndicator = function (data: string) {
  return request(`${BASE_API_PREFIX}/metric-descriptions`, {
    method: RequestMethod.Post,
    data: { data },
  });
};
export const deleteIndicator = function (id: number[]) {
  return request(`${BASE_API_PREFIX}/metric-descriptions`, {
    method: RequestMethod.Delete,
    data: {
      ids: id,
    },
  });
};
