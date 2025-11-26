import request from '@/utils/request';
import { RequestMethod } from '@/store/common';
import { BASE_API_PREFIX } from '@/utils/constant';

// 获取ERP日志查询配置
export const getLogErpConfig = function (params?: { expand: boolean }) {
  return request(`${BASE_API_PREFIX}/c/cnd/erp/config`, {
    method: RequestMethod.Get,
    params,
  });
};

// 更新ERP日志查询配置
export const setLogErpConfig = function (data) {
  return request(`${BASE_API_PREFIX}/c/cnd/erp/config`, {
    method: RequestMethod.Put,
    data,
  });
};
