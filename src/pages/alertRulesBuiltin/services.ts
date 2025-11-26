import _ from 'lodash';
import request from '@/utils/request';
import { RequestMethod } from '@/store/common';
import { RuleCateType, RuleType } from './types';
import { BASE_API_PREFIX } from '@/utils/constant';

export const getRuleCates = function (): Promise<RuleCateType[]> {
  return request(`${BASE_API_PREFIX}/builtin/alerts`, {
    method: RequestMethod.Get,
  }).then((res) => {
    return res.dat;
  });
};

// 获取指定分类分组内的内置规则
export const getRuleCatesDetail = function (cate_code, code) {
  return request(`${BASE_API_PREFIX}/builtin/alerts/${cate_code}/${code}`, {
    method: RequestMethod.Get,
  }).then((res) => {
    return res.dat;
  });
};

// 新增内置告警
export const createBuiltStrategy = function (cate_code: string, data: { alert_rule: any }) {
  return request(`${BASE_API_PREFIX}/builtin/alerts/${cate_code}`, {
    method: RequestMethod.Post,
    data,
  });
};

// 更新内置规则
export const updateBuiltStrategy = function (cate_code: string, code: string, data: { alert_rule: any }) {
  return request(`${BASE_API_PREFIX}/builtin/alerts/${cate_code}/${code}`, {
    method: RequestMethod.Put,
    data,
  });
};

// 删除内置规则
export const deleteBuiltStrategy = function (data: { codes: string[] }) {
  return request(`${BASE_API_PREFIX}/builtin/alerts`, {
    method: RequestMethod.Delete,
    data,
  });
};

export const createRule = function (id: number, data: RuleType[]) {
  return request(`${BASE_API_PREFIX}/busi-group/${id}/alert-rules/import`, {
    method: RequestMethod.Post,
    data,
    silence: true,
  }).then((res) => {
    return res.dat;
  });
};

export const postBuiltinCateFavorite = function (cate_code: string): Promise<any[]> {
  return request(`${BASE_API_PREFIX}/builtin/cate/${cate_code}/favorite`, {
    method: RequestMethod.Post,
  }).then((res) => {
    return res.dat;
  });
};

export const deleteBuiltinCateFavorite = function (cate_code: string): Promise<any[]> {
  return request(`${BASE_API_PREFIX}/builtin/cate/${cate_code}/favorite`, {
    method: RequestMethod.Delete,
  }).then((res) => {
    return res.dat;
  });
};
