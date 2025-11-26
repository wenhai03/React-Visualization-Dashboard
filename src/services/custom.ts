import request from '@/utils/request';
import { RequestMethod } from '@/store/common';
import { BASE_API_PREFIX } from '@/utils/constant';

// 获取网络认证日志列表
export const getCndInternetLog = function (params: { query: string }) {
  return request(`${BASE_API_PREFIX}/c/cnd/network/auth/log`, {
    method: RequestMethod.Get,
    params,
  });
};
