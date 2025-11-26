import request from '@/utils/request';
import { RequestMethod } from '@/store/common';
import { BASE_API_PREFIX } from '@/utils/constant';
import { RoleType, RolePostType, OperationType } from './types';

export const getRoles = function (): Promise<RoleType[]> {
  return request(`${BASE_API_PREFIX}/roles`, {
    method: RequestMethod.Get,
  }).then((res) => res.dat);
};

export const postRoles = function (params: RolePostType) {
  return request(`${BASE_API_PREFIX}/roles`, {
    method: RequestMethod.Post,
    data: params,
  });
};

export const putRoles = function (params: RoleType) {
  return request(`${BASE_API_PREFIX}/roles`, {
    method: RequestMethod.Put,
    data: params,
  });
};

export const deleteRoles = function (id: number) {
  return request(`${BASE_API_PREFIX}/role/${id}`, {
    method: RequestMethod.Delete,
  });
};

export const getOperations = function (): Promise<OperationType[]> {
  return request(`${BASE_API_PREFIX}/operation`, {
    method: RequestMethod.Get,
  }).then((res) => res.dat);
};

export const getOperationsByRole = function (roleId: number): Promise<string[]> {
  return request(`${BASE_API_PREFIX}/role/${roleId}/ops`, {
    method: RequestMethod.Get,
  }).then((res) => res.dat);
};

export const putOperationsByRole = function (roleId: number, ops: string[]) {
  return request(`${BASE_API_PREFIX}/role/${roleId}/ops`, {
    method: RequestMethod.Put,
    data: ops,
  });
};
