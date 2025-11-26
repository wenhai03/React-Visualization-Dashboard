import request from '@/utils/request';
import { RequestMethod } from '@/store/common';
import { BASE_API_PREFIX } from '@/utils/constant';
import { SSOConfigType } from './types';

export const getSSOConfigs = function (): Promise<SSOConfigType[]> {
  return request(`${BASE_API_PREFIX}/sso-configs`, {
    method: RequestMethod.Get,
  }).then((res) => {
    return res.dat || [];
  });
};

export const putSSOConfig = function (data: SSOConfigType) {
  return request(`${BASE_API_PREFIX}/sso-config`, {
    method: RequestMethod.Put,
    data,
  }).then((res) => {
    return res.dat || [];
  });
};
