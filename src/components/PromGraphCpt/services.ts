import _ from 'lodash';
import request from '@/utils/request';
import { RequestMethod } from '@/store/common';
import { BASE_API_PREFIX } from '@/utils/constant';

export const getPromData = (url: string, params, groupId: number) => {
  return request(url, {
    method: RequestMethod.Get,
    params,
    silence: true,
  }).then((res) => res.data);
};

export const setTmpChartData = function (data: { configs: string }[]) {
  return request(`${BASE_API_PREFIX}/share-charts`, {
    method: RequestMethod.Post,
    data,
  });
};
