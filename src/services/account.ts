import request from '@/utils/request';
import { RequestMethod } from '@/store/common';
import { BASE_API_PREFIX } from '@/utils/constant';

const profileApi = `${BASE_API_PREFIX}/self/profile`;
// 修改个人信息
export const UpdateProfile = function (data: object) {
  return request(profileApi, {
    method: RequestMethod.Put,
    data,
  });
};

export const GetProfile = function () {
  return request(profileApi, {
    method: RequestMethod.Get,
  });
};

const secretApi = `${BASE_API_PREFIX}/self/token`;
// 获取个人秘钥
export const GetSecret = function () {
  return request(secretApi, {
    method: RequestMethod.Get,
  });
};

export const UpdateSecret = function (data: object) {
  return request(secretApi, {
    method: RequestMethod.Put,
    data,
  });
};

export const CreateSecret = function () {
  return request(secretApi, {
    method: RequestMethod.Post,
  });
};

// 查询活动会话列表
export const getAuthSession = function (params?: any) {
  return request(`${BASE_API_PREFIX}/auth/session`, {
    method: RequestMethod.Get,
    params,
  });
};

// 删除活动会话
export const deleteAuthSession = function (data) {
  return request(`${BASE_API_PREFIX}/auth/session`, {
    method: RequestMethod.Delete,
    data,
  });
};
